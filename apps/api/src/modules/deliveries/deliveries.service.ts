import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  DeliveryStatus,
  NotificationLevel,
  resolveDeliveryStatus,
  RoleName,
  SalesOrderStatus,
} from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  paginate,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import { RecordDeliveryDto } from './dto/delivery.dto';

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Registra la entrega de una parada de ruta (prompt §23). */
  async record(companyId: string, userId: string, dto: RecordDeliveryDto) {
    const stop = await this.prisma.routeStop.findFirst({
      where: { id: dto.routeStopId, route: { companyId } },
      include: {
        route: { select: { id: true, estado: true, companyId: true } },
        salesOrder: { select: { id: true, numero: true, estado: true, vendedorId: true } },
        delivery: { select: { id: true } },
      },
    });
    if (!stop) throw new NotFoundException('Parada de ruta no encontrada');
    if (stop.delivery) {
      throw new BadRequestException('Esta parada ya tiene una entrega registrada');
    }
    if (stop.route.estado !== 'EN_RUTA') {
      throw new BadRequestException('La ruta no está en curso');
    }

    const estado = resolveDeliveryStatus(dto.items);
    const entregado = estado === DeliveryStatus.ENTREGADO;
    const nuevoEstadoPedido = entregado
      ? SalesOrderStatus.ENTREGADO
      : SalesOrderStatus.INCIDENCIA;

    const delivery = await this.prisma.$transaction(async (tx) => {
      const created = await tx.delivery.create({
        data: {
          companyId,
          routeStopId: stop.id,
          salesOrderId: stop.salesOrderId,
          estado,
          receptorNombre: dto.receptorNombre,
          observacion: dto.observacion,
          lat: dto.lat,
          lng: dto.lng,
          entregadoPor: userId,
          items: {
            create: dto.items.map((i) => ({
              productId: i.productId,
              productNombre: i.productNombre,
              cantidad: i.cantidad,
              status: i.status,
              motivoRechazo: i.motivoRechazo,
            })),
          },
          evidence: dto.evidence?.length
            ? { create: dto.evidence.map((e) => ({ tipo: e.tipo, url: e.url })) }
            : undefined,
        },
      });

      await tx.routeStop.update({
        where: { id: stop.id },
        data: { estado: entregado ? 'ENTREGADO' : 'INCIDENCIA' },
      });

      await tx.salesOrder.update({
        where: { id: stop.salesOrderId },
        data: { estado: nuevoEstadoPedido },
      });

      // Si ya no quedan paradas pendientes, la ruta se completa.
      const pendientes = await tx.routeStop.count({
        where: {
          routeId: stop.routeId,
          estado: { in: ['PENDIENTE', 'EN_RUTA'] },
        },
      });
      if (pendientes === 0) {
        await tx.route.update({
          where: { id: stop.routeId },
          data: { estado: 'COMPLETADA' },
        });
      }

      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: AuditAction.DELIVERY_RECORDED,
        entityType: 'Delivery',
        entityId: created.id,
        relatedDocument: stop.salesOrder.numero,
        stateBefore: { pedido: stop.salesOrder.estado },
        stateAfter: { pedido: nuevoEstadoPedido, entrega: estado },
      });
      return created;
    });

    // Notificaciones (best-effort, fuera de la transacción).
    if (entregado) {
      if (stop.salesOrder.vendedorId) {
        await this.notifications.notifyUser(companyId, stop.salesOrder.vendedorId, {
          nivel: NotificationLevel.INFO,
          titulo: `Pedido ${stop.salesOrder.numero} entregado`,
          tipo: 'DELIVERY',
          entityType: 'SalesOrder',
          entityId: stop.salesOrderId,
        });
      }
    } else {
      await this.notifications.notifyRole(companyId, RoleName.JEFE_OPERACIONES, {
        nivel: NotificationLevel.CRITICAL,
        titulo: `Incidencia en entrega de ${stop.salesOrder.numero}`,
        cuerpo: dto.observacion ?? 'El cliente rechazó total o parcialmente.',
        tipo: 'DELIVERY_INCIDENT',
        entityType: 'SalesOrder',
        entityId: stop.salesOrderId,
      });
    }

    return delivery;
  }

  async findAll(companyId: string, query: PaginationQueryDto) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.delivery.findMany({
        where: { companyId },
        orderBy: { hora: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          salesOrder: {
            select: {
              numero: true,
              customer: { select: { razonSocial: true } },
            },
          },
          _count: { select: { items: true, evidence: true } },
        },
      }),
      this.prisma.delivery.count({ where: { companyId } }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(companyId: string, id: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, companyId },
      include: {
        items: true,
        evidence: true,
        salesOrder: { select: { numero: true } },
      },
    });
    if (!delivery) throw new NotFoundException('Entrega no encontrada');
    return delivery;
  }
}
