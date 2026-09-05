import { Injectable } from '@nestjs/common';
import { InventoryMovementType } from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  paginate,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import { CreateWasteDto } from './dto/waste.dto';

@Injectable()
export class WasteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
  ) {}

  async create(companyId: string, userId: string, dto: CreateWasteDto) {
    // Registrar la merma y descontar stock en la MISMA transacción.
    const waste = await this.prisma.$transaction(async (tx) => {
      const created = await tx.waste.create({
        data: {
          companyId,
          warehouseId: dto.warehouseId,
          productId: dto.productId,
          cantidad: dto.cantidad,
          motivo: dto.motivo,
          lote: dto.lote,
          costo: dto.costoUnitario
            ? dto.costoUnitario * dto.cantidad
            : undefined,
          fotoUrl: dto.fotoUrl,
          observacion: dto.observacion,
          usuarioId: userId,
        },
      });
      await this.inventory.applyMovement(tx, {
        companyId,
        warehouseId: dto.warehouseId,
        productId: dto.productId,
        tipo: InventoryMovementType.MERMA,
        delta: -dto.cantidad,
        costoUnitario: dto.costoUnitario,
        lote: dto.lote,
        referenciaTipo: 'Waste',
        referenciaId: created.id,
        usuarioId: userId,
        notas: `Merma: ${dto.motivo}`,
      });
      return created;
    });

    await this.audit.record({
      companyId,
      userId,
      action: 'CREATE',
      entityType: 'Waste',
      entityId: waste.id,
      stateAfter: waste,
    });
    return waste;
  }

  async findAll(companyId: string, query: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.waste.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          product: { select: { sku: true, nombre: true } },
          warehouse: { select: { nombre: true } },
        },
      }),
      this.prisma.waste.count({ where: { companyId } }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  /** Resumen de merma por motivo (prompt §16). */
  async summaryByReason(companyId: string) {
    const rows = await this.prisma.waste.groupBy({
      by: ['motivo'],
      where: { companyId },
      _sum: { cantidad: true, costo: true },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      motivo: r.motivo,
      cantidad: Number(r._sum.cantidad ?? 0),
      costo: Number(r._sum.costo ?? 0),
      registros: r._count._all,
    }));
  }
}
