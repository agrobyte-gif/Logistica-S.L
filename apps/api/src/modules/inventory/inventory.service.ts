import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { InventoryMovementType } from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  paginate,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import { AdjustInventoryDto, TransferInventoryDto } from './dto/inventory.dto';

export interface ApplyMovementParams {
  companyId: string;
  warehouseId: string;
  productId: string;
  tipo: InventoryMovementType;
  /** Delta con signo sobre el stock físico (+ entra, − sale). */
  delta: number;
  costoUnitario?: number | null;
  lote?: string | null;
  referenciaTipo?: string | null;
  referenciaId?: string | null;
  usuarioId?: string | null;
  notas?: string | null;
}

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * ÚNICO punto que muta el stock (ADR-009). Dentro de una transacción:
   * bloquea la fila, valida que no quede negativa, actualiza la proyección
   * `inventory.cantidad_fisica` y agrega el asiento en `inventory_movements`
   * (append-only). El registro nunca se edita ni borra.
   */
  async applyMovement(
    tx: Prisma.TransactionClient,
    p: ApplyMovementParams,
  ): Promise<void> {
    if (p.delta === 0) {
      throw new BadRequestException('El movimiento no puede ser cero');
    }

    // Asegura que exista la fila de inventario (idempotente).
    await tx.inventory.upsert({
      where: {
        warehouseId_productId: {
          warehouseId: p.warehouseId,
          productId: p.productId,
        },
      },
      update: {},
      create: {
        companyId: p.companyId,
        warehouseId: p.warehouseId,
        productId: p.productId,
      },
    });

    // Bloqueo de fila para evitar carreras al actualizar la proyección.
    const rows = await tx.$queryRaw<
      { cantidad_fisica: string }[]
    >`
      SELECT cantidad_fisica FROM inventory
      WHERE warehouse_id = ${p.warehouseId} AND product_id = ${p.productId}
      FOR UPDATE
    `;
    const fisica = Number(rows[0]?.cantidad_fisica ?? 0);
    const nueva = fisica + p.delta;
    if (nueva < 0) {
      throw new BadRequestException(
        'El stock físico resultante no puede ser negativo',
      );
    }

    await tx.inventory.update({
      where: {
        warehouseId_productId: {
          warehouseId: p.warehouseId,
          productId: p.productId,
        },
      },
      data: { cantidadFisica: nueva },
    });

    await tx.inventoryMovement.create({
      data: {
        companyId: p.companyId,
        warehouseId: p.warehouseId,
        productId: p.productId,
        tipo: p.tipo,
        cantidad: p.delta,
        costoUnitario: p.costoUnitario ?? undefined,
        lote: p.lote ?? undefined,
        referenciaTipo: p.referenciaTipo ?? undefined,
        referenciaId: p.referenciaId ?? undefined,
        usuarioId: p.usuarioId ?? undefined,
        notas: p.notas ?? undefined,
      },
    });
  }

  // --- Consultas ---

  async getStock(companyId: string, query: PaginationQueryDto) {
    const where: Prisma.InventoryWhereInput = {
      companyId,
      ...(query.q
        ? {
            product: {
              OR: [
                { nombre: { contains: query.q, mode: 'insensitive' } },
                { sku: { contains: query.q, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.inventory.findMany({
        where,
        orderBy: { product: { nombre: 'asc' } },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          product: { select: { id: true, sku: true, nombre: true, stockMinimo: true } },
          warehouse: { select: { id: true, nombre: true } },
        },
      }),
      this.prisma.inventory.count({ where }),
    ]);
    const data = rows.map((r) => {
      const disponible =
        Number(r.cantidadFisica) -
        Number(r.cantidadReservada) -
        Number(r.cantidadBloqueada);
      return {
        ...r,
        disponible,
        bajoMinimo: disponible < Number(r.product.stockMinimo),
      };
    });
    return paginate(data, total, query.page, query.pageSize);
  }

  async listMovements(
    companyId: string,
    query: PaginationQueryDto,
    productId?: string,
  ) {
    const where: Prisma.InventoryMovementWhereInput = {
      companyId,
      ...(productId ? { productId } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          product: { select: { sku: true, nombre: true } },
          warehouse: { select: { nombre: true } },
        },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  // --- Operaciones ---

  async adjust(companyId: string, userId: string, dto: AdjustInventoryDto) {
    await this.assertWarehouse(companyId, dto.warehouseId);
    await this.assertProduct(companyId, dto.productId);
    await this.prisma.$transaction(async (tx) => {
      await this.applyMovement(tx, {
        companyId,
        warehouseId: dto.warehouseId,
        productId: dto.productId,
        tipo: InventoryMovementType.AJUSTE,
        delta: dto.delta,
        lote: dto.lote,
        usuarioId: userId,
        notas: dto.motivo,
      });
    });
    await this.audit.record({
      companyId,
      userId,
      action: 'UPDATE',
      entityType: 'Inventory',
      entityId: `${dto.warehouseId}:${dto.productId}`,
      notes: `Ajuste ${dto.delta > 0 ? '+' : ''}${dto.delta}: ${dto.motivo}`,
    });
    return { ok: true };
  }

  async transfer(companyId: string, userId: string, dto: TransferInventoryDto) {
    if (dto.origenWarehouseId === dto.destinoWarehouseId) {
      throw new BadRequestException('Las bodegas deben ser distintas');
    }
    await this.assertWarehouse(companyId, dto.origenWarehouseId);
    await this.assertWarehouse(companyId, dto.destinoWarehouseId);
    await this.assertProduct(companyId, dto.productId);

    await this.prisma.$transaction(async (tx) => {
      // Salida del origen y entrada al destino (mismo tipo TRANSFERENCIA).
      await this.applyMovement(tx, {
        companyId,
        warehouseId: dto.origenWarehouseId,
        productId: dto.productId,
        tipo: InventoryMovementType.TRANSFERENCIA,
        delta: -dto.cantidad,
        lote: dto.lote,
        usuarioId: userId,
        referenciaTipo: 'Transfer',
        notas: `Transferencia a ${dto.destinoWarehouseId}`,
      });
      await this.applyMovement(tx, {
        companyId,
        warehouseId: dto.destinoWarehouseId,
        productId: dto.productId,
        tipo: InventoryMovementType.TRANSFERENCIA,
        delta: dto.cantidad,
        lote: dto.lote,
        usuarioId: userId,
        referenciaTipo: 'Transfer',
        notas: `Transferencia desde ${dto.origenWarehouseId}`,
      });
    });
    await this.audit.record({
      companyId,
      userId,
      action: 'UPDATE',
      entityType: 'Inventory',
      entityId: dto.productId,
      notes: `Transferencia ${dto.cantidad} de ${dto.origenWarehouseId} a ${dto.destinoWarehouseId}`,
    });
    return { ok: true };
  }

  private async assertWarehouse(companyId: string, warehouseId: string) {
    const wh = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, companyId },
      select: { id: true },
    });
    if (!wh) throw new BadRequestException('Bodega no válida');
  }

  private async assertProduct(companyId: string, productId: string) {
    const p = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
      select: { id: true },
    });
    if (!p) throw new BadRequestException('Producto no válido');
  }
}
