import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AuditAction,
  canTransitionPicking,
  PickingItemStatus,
  PickingStatus,
  pickingHasUnjustifiedDifference,
  PickingItemLike,
  resolvePickingOutcome,
  SalesOrderStatus,
} from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { SequenceService } from '../../common/sequence/sequence.service';
import {
  paginate,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import {
  AssignPickerDto,
  CreatePickingDto,
  UpdatePickingItemDto,
} from './dto/picking.dto';

/** Estados de pedido desde los que se puede iniciar un picking. */
const PICKEABLE_ORDER_STATES: SalesOrderStatus[] = [
  SalesOrderStatus.CONFIRMADO,
  SalesOrderStatus.ESPERANDO_COMPRA,
  SalesOrderStatus.PICKING_INCOMPLETO,
];

/** Estados de picking que se consideran "activos" (bloquean crear otro). */
const ACTIVE_PICKING_STATES: PickingStatus[] = [
  PickingStatus.PENDIENTE,
  PickingStatus.EN_PROCESO,
  PickingStatus.INCOMPLETO,
];

@Injectable()
export class PickingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
  ) {}

  /** Crea el picking de un pedido y lo pasa a EN_PICKING (prompt §17). */
  async create(companyId: string, userId: string, dto: CreatePickingDto) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id: dto.salesOrderId, companyId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    if (!PICKEABLE_ORDER_STATES.includes(order.estado as SalesOrderStatus)) {
      throw new BadRequestException(
        `El pedido en estado ${order.estado} no puede entrar a picking`,
      );
    }

    const activo = await this.prisma.picking.findFirst({
      where: { salesOrderId: order.id, estado: { in: ACTIVE_PICKING_STATES } },
      select: { id: true },
    });
    if (activo) {
      throw new ConflictException('El pedido ya tiene un picking activo');
    }

    if (dto.pickerId) await this.assertUser(companyId, dto.pickerId);

    const picking = await this.prisma.$transaction(async (tx) => {
      const numero = await this.sequence.next(tx, companyId, 'PICK');
      const created = await tx.picking.create({
        data: {
          companyId,
          numero,
          salesOrderId: order.id,
          warehouseId: order.warehouseId,
          pickerId: dto.pickerId,
          createdById: userId,
          estado: PickingStatus.PENDIENTE,
          items: {
            create: order.items.map((it) => ({
              productId: it.productId,
              salesOrderItemId: it.id,
              cantidadSolicitada: it.cantidad,
            })),
          },
        },
      });

      // El pedido pasa a EN_PICKING (transición validada por la máquina de ventas).
      await tx.salesOrder.update({
        where: { id: order.id },
        data: { estado: SalesOrderStatus.EN_PICKING },
      });

      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: AuditAction.CREATE,
        entityType: 'Picking',
        entityId: created.id,
        relatedDocument: numero,
        stateAfter: { numero, salesOrder: order.numero },
      });
      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: AuditAction.ORDER_STATE_CHANGE,
        entityType: 'SalesOrder',
        entityId: order.id,
        relatedDocument: order.numero,
        stateBefore: { estado: order.estado },
        stateAfter: { estado: SalesOrderStatus.EN_PICKING },
        notes: `Picking ${numero} creado`,
      });
      return created;
    });

    return this.findOne(companyId, picking.id);
  }

  async findAll(
    companyId: string,
    query: PaginationQueryDto,
    estado?: PickingStatus,
    pickerId?: string,
  ) {
    const where: Prisma.PickingWhereInput = {
      companyId,
      ...(estado ? { estado } : {}),
      ...(pickerId ? { pickerId } : {}),
      ...(query.q
        ? {
            OR: [
              { numero: { contains: query.q, mode: 'insensitive' } },
              {
                salesOrder: {
                  numero: { contains: query.q, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.picking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          salesOrder: {
            select: {
              id: true,
              numero: true,
              customer: { select: { razonSocial: true } },
            },
          },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.picking.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(companyId: string, id: string) {
    const picking = await this.prisma.picking.findFirst({
      where: { id, companyId },
      include: {
        salesOrder: {
          select: {
            id: true,
            numero: true,
            estado: true,
            customer: { select: { razonSocial: true } },
          },
        },
        warehouse: { select: { id: true, nombre: true } },
        items: {
          include: {
            product: { select: { id: true, sku: true, nombre: true, unidadBase: true } },
            productoSustituto: { select: { id: true, sku: true, nombre: true } },
          },
        },
      },
    });
    if (!picking) throw new NotFoundException('Picking no encontrado');
    return picking;
  }

  /** Asigna (o reasigna) el picker responsable. */
  async assign(
    companyId: string,
    userId: string,
    id: string,
    dto: AssignPickerDto,
  ) {
    const picking = await this.findOnePlain(companyId, id);
    await this.assertUser(companyId, dto.pickerId);
    const updated = await this.prisma.picking.update({
      where: { id },
      data: { pickerId: dto.pickerId },
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Picking',
      entityId: id,
      relatedDocument: picking.numero,
      notes: `Picker asignado: ${dto.pickerId}`,
    });
    return updated;
  }

  /** Inicia el picking (PENDIENTE → EN_PROCESO). */
  async start(companyId: string, userId: string, id: string) {
    const picking = await this.findOnePlain(companyId, id);
    if (!canTransitionPicking(picking.estado as PickingStatus, PickingStatus.EN_PROCESO)) {
      throw new ConflictException(
        `No se puede iniciar un picking en estado ${picking.estado}`,
      );
    }
    const updated = await this.prisma.picking.update({
      where: { id },
      data: {
        estado: PickingStatus.EN_PROCESO,
        iniciadoAt: picking.iniciadoAt ?? new Date(),
        // Si nadie estaba asignado, lo toma quien inicia.
        pickerId: picking.pickerId ?? userId,
      },
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.PICKING_STATE_CHANGE,
      entityType: 'Picking',
      entityId: id,
      relatedDocument: picking.numero,
      stateBefore: { estado: picking.estado },
      stateAfter: { estado: PickingStatus.EN_PROCESO },
    });
    return this.findOne(companyId, id);
  }

  /** Actualiza una línea de picking (cantidad, faltante, sustitución, foto). */
  async updateItem(
    companyId: string,
    userId: string,
    pickingId: string,
    itemId: string,
    dto: UpdatePickingItemDto,
  ) {
    const picking = await this.findOnePlain(companyId, pickingId);
    if (
      picking.estado !== PickingStatus.EN_PROCESO &&
      picking.estado !== PickingStatus.PENDIENTE &&
      picking.estado !== PickingStatus.INCOMPLETO
    ) {
      throw new BadRequestException(
        'Solo se pueden editar líneas de un picking en curso',
      );
    }
    const item = await this.prisma.pickingItem.findFirst({
      where: { id: itemId, pickingId },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Línea de picking no encontrada');

    if (dto.estado === PickingItemStatus.SUSTITUCION && !dto.productoSustitutoId) {
      throw new BadRequestException(
        'Una sustitución requiere indicar el producto sustituto',
      );
    }
    if (dto.productoSustitutoId) {
      await this.assertProduct(companyId, dto.productoSustitutoId);
    }

    const updated = await this.prisma.pickingItem.update({
      where: { id: itemId },
      data: {
        cantidadPickeada: dto.cantidadPickeada,
        estado: dto.estado,
        productoSustitutoId:
          dto.estado === PickingItemStatus.SUSTITUCION
            ? dto.productoSustitutoId
            : null,
        fotoUrl: dto.fotoUrl,
        observacion: dto.observacion,
      },
    });
    return updated;
  }

  /**
   * Cierra el picking. Regla §17/§37: no se puede cerrar con diferencias sin
   * justificar. Según el resultado, el pedido pasa a PREPARADO o
   * PICKING_INCOMPLETO. No mueve stock: la salida física ocurre al despachar.
   */
  async finalize(companyId: string, userId: string, id: string) {
    const picking = await this.prisma.picking.findFirst({
      where: { id, companyId },
      include: { items: true, salesOrder: { select: { id: true, numero: true, estado: true } } },
    });
    if (!picking) throw new NotFoundException('Picking no encontrado');
    if (
      picking.estado !== PickingStatus.EN_PROCESO &&
      picking.estado !== PickingStatus.INCOMPLETO
    ) {
      throw new BadRequestException(
        'El picking debe estar en proceso para cerrarse',
      );
    }

    const items: PickingItemLike[] = picking.items.map((it) => ({
      cantidadSolicitada: Number(it.cantidadSolicitada),
      cantidadPickeada: Number(it.cantidadPickeada),
      estado: it.estado as PickingItemStatus,
      observacion: it.observacion,
    }));

    if (pickingHasUnjustifiedDifference(items)) {
      throw new BadRequestException(
        'No se puede cerrar el picking: hay diferencias sin justificar',
      );
    }

    const outcome = resolvePickingOutcome(items);
    const nextOrderState =
      outcome === PickingStatus.COMPLETADO
        ? SalesOrderStatus.PREPARADO
        : SalesOrderStatus.PICKING_INCOMPLETO;

    await this.prisma.$transaction(async (tx) => {
      await tx.picking.update({
        where: { id },
        data: {
          estado: outcome,
          completadoAt:
            outcome === PickingStatus.COMPLETADO ? new Date() : null,
        },
      });

      // Deja constancia de lo realmente preparado en cada línea del pedido.
      for (const it of picking.items) {
        if (it.salesOrderItemId) {
          await tx.salesOrderItem.update({
            where: { id: it.salesOrderItemId },
            data: { cantidadConfirmada: it.cantidadPickeada },
          });
        }
      }

      await tx.salesOrder.update({
        where: { id: picking.salesOrderId },
        data: { estado: nextOrderState },
      });

      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: AuditAction.PICKING_STATE_CHANGE,
        entityType: 'Picking',
        entityId: id,
        relatedDocument: picking.numero,
        stateBefore: { estado: picking.estado },
        stateAfter: { estado: outcome },
      });
      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: AuditAction.ORDER_STATE_CHANGE,
        entityType: 'SalesOrder',
        entityId: picking.salesOrderId,
        relatedDocument: picking.salesOrder.numero,
        stateBefore: { estado: picking.salesOrder.estado },
        stateAfter: { estado: nextOrderState },
        notes: `Picking ${picking.numero} cerrado (${outcome})`,
      });
    });

    return this.findOne(companyId, id);
  }

  // --- Helpers ---

  private async findOnePlain(companyId: string, id: string) {
    const picking = await this.prisma.picking.findFirst({
      where: { id, companyId },
    });
    if (!picking) throw new NotFoundException('Picking no encontrado');
    return picking;
  }

  private async assertUser(companyId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Usuario no válido para la empresa');
  }

  private async assertProduct(companyId: string, productId: string) {
    const p = await this.prisma.product.findFirst({
      where: { id: productId, companyId },
      select: { id: true },
    });
    if (!p) throw new BadRequestException('Producto sustituto no válido');
  }
}
