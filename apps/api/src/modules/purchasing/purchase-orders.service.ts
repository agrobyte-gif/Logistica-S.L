import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  InventoryMovementType,
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  RoleName,
  requiredApproverRole,
} from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { SequenceService } from '../../common/sequence/sequence.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  paginate,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/auth/auth.types';
import {
  CreatePurchaseOrderDto,
  CreateReceiptDto,
} from './dto/purchase-order.dto';

// Jerarquía de aprobación (mayor rango puede aprobar montos menores).
const ROLE_RANK: Record<string, number> = {
  [RoleName.ENCARGADO_COMPRAS]: 1,
  [RoleName.JEFE_OPERACIONES]: 2,
  [RoleName.GERENTE]: 3,
  [RoleName.ADMINISTRADOR]: 4,
};

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
    private readonly inventory: InventoryService,
  ) {}

  async create(
    companyId: string,
    userId: string,
    dto: CreatePurchaseOrderDto,
  ) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, companyId },
      select: { id: true },
    });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const count = await this.prisma.product.count({
      where: { id: { in: productIds }, companyId },
    });
    if (count !== productIds.length) {
      throw new BadRequestException('Algún producto no pertenece a la empresa');
    }

    const total = dto.items.reduce(
      (s, i) => s + i.cantidad * i.precioUnitario,
      0,
    );

    const order = await this.prisma.$transaction(async (tx) => {
      const numero = await this.sequence.next(tx, companyId, 'OC');
      const created = await tx.purchaseOrder.create({
        data: {
          companyId,
          numero,
          supplierId: dto.supplierId,
          warehouseId: dto.warehouseId,
          notas: dto.notas,
          total,
          createdById: userId,
          items: {
            create: dto.items.map((i) => ({
              productId: i.productId,
              cantidad: i.cantidad,
              precioUnitario: i.precioUnitario,
            })),
          },
        },
      });

      // Marcar necesidades satisfechas como ORDENADA.
      if (dto.purchaseRequestIds?.length) {
        await tx.purchaseRequest.updateMany({
          where: { id: { in: dto.purchaseRequestIds }, companyId },
          data: {
            estado: PurchaseRequestStatus.ORDENADA,
            supplierId: dto.supplierId,
          },
        });
      }

      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: 'CREATE',
        entityType: 'PurchaseOrder',
        entityId: created.id,
        relatedDocument: numero,
        stateAfter: { numero, total, estado: created.estado },
      });
      return created;
    });

    return this.findOne(companyId, order.id);
  }

  async findAll(
    companyId: string,
    query: PaginationQueryDto,
    estado?: PurchaseOrderStatus,
  ) {
    const where: Prisma.PurchaseOrderWhereInput = {
      companyId,
      ...(estado ? { estado } : {}),
      ...(query.q
        ? { numero: { contains: query.q, mode: 'insensitive' } }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          supplier: { select: { id: true, razonSocial: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(companyId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      include: {
        supplier: true,
        items: {
          include: { product: { select: { sku: true, nombre: true } } },
        },
        receipts: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw new NotFoundException('Orden de compra no encontrada');
    return order;
  }

  /** Aprueba la OC validando el umbral por monto (prompt §41). */
  async approve(companyId: string, user: AuthUser, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, companyId },
      select: { id: true, estado: true, total: true, numero: true },
    });
    if (!order) throw new NotFoundException('Orden de compra no encontrada');
    if (order.estado !== PurchaseOrderStatus.BORRADOR) {
      throw new BadRequestException('Solo se pueden aprobar OC en borrador');
    }

    const required = requiredApproverRole(Number(order.total));
    const userRank = Math.max(
      0,
      ...user.roles.map((r) => ROLE_RANK[r] ?? 0),
    );
    if (userRank < ROLE_RANK[required]) {
      throw new ForbiddenException(
        `Este monto requiere aprobación de ${required} o superior`,
      );
    }

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        estado: PurchaseOrderStatus.APROBADA,
        aprobadaPor: user.userId,
        aprobadaAt: new Date(),
      },
    });
    await this.audit.record({
      companyId,
      userId: user.userId,
      action: 'ORDER_STATE_CHANGE',
      entityType: 'PurchaseOrder',
      entityId: id,
      relatedDocument: order.numero,
      stateBefore: { estado: PurchaseOrderStatus.BORRADOR },
      stateAfter: { estado: PurchaseOrderStatus.APROBADA },
      notes: `Aprobada (umbral: ${required})`,
    });
    return updated;
  }

  /** Recepción de mercadería: ingresa stock y actualiza la OC. */
  async receive(
    companyId: string,
    userId: string,
    orderId: string,
    dto: CreateReceiptDto,
  ) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: orderId, companyId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Orden de compra no encontrada');
    const recibibles: PurchaseOrderStatus[] = [
      PurchaseOrderStatus.APROBADA,
      PurchaseOrderStatus.ENVIADA,
      PurchaseOrderStatus.RECIBIDA_PARCIAL,
    ];
    if (!recibibles.includes(order.estado as PurchaseOrderStatus)) {
      throw new BadRequestException(
        'La OC debe estar aprobada/enviada para recibir',
      );
    }

    const warehouseId = dto.warehouseId ?? order.warehouseId;
    if (!warehouseId) {
      throw new BadRequestException('Debe indicarse la bodega de recepción');
    }
    const wh = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, companyId },
      select: { id: true },
    });
    if (!wh) throw new BadRequestException('Bodega no válida');

    const receipt = await this.prisma.$transaction(async (tx) => {
      const numero = await this.sequence.next(tx, companyId, 'REC');
      const created = await tx.goodsReceipt.create({
        data: {
          companyId,
          purchaseOrderId: orderId,
          warehouseId,
          numero,
          recibidoPor: userId,
          observaciones: dto.observaciones,
        },
      });

      for (const item of dto.items) {
        await tx.goodsReceiptItem.create({
          data: {
            goodsReceiptId: created.id,
            productId: item.productId,
            purchaseOrderItemId: item.purchaseOrderItemId,
            cantidad: item.cantidad,
            costoUnitario: item.costoUnitario,
            lote: item.lote,
          },
        });
        // Ingreso de stock por el único punto de mutación.
        await this.inventory.applyMovement(tx, {
          companyId,
          warehouseId,
          productId: item.productId,
          tipo: InventoryMovementType.RECEPCION,
          delta: item.cantidad,
          costoUnitario: item.costoUnitario,
          lote: item.lote,
          referenciaTipo: 'GoodsReceipt',
          referenciaId: created.id,
          usuarioId: userId,
          notas: `Recepción ${numero} (OC ${order.numero})`,
        });
        // Actualizar cantidad recibida en la línea de OC.
        if (item.purchaseOrderItemId) {
          await tx.purchaseOrderItem.update({
            where: { id: item.purchaseOrderItemId },
            data: { cantidadRecibida: { increment: item.cantidad } },
          });
        }
      }

      // Recalcular estado de la OC según lo recibido.
      const items = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: orderId },
      });
      const completa = items.every(
        (i) => Number(i.cantidadRecibida) >= Number(i.cantidad),
      );
      const algo = items.some((i) => Number(i.cantidadRecibida) > 0);
      const nuevoEstado = completa
        ? PurchaseOrderStatus.RECIBIDA
        : algo
          ? PurchaseOrderStatus.RECIBIDA_PARCIAL
          : order.estado;
      await tx.purchaseOrder.update({
        where: { id: orderId },
        data: { estado: nuevoEstado },
      });

      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: 'CREATE',
        entityType: 'GoodsReceipt',
        entityId: created.id,
        relatedDocument: numero,
        notes: `Recepción contra OC ${order.numero}; OC → ${nuevoEstado}`,
      });
      return created;
    });

    return receipt;
  }
}
