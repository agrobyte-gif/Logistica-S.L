import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AuditAction,
  canTransitionRoute,
  InventoryMovementType,
  QualityResult,
  RouteStatus,
  RouteStopStatus,
  SalesOrderStatus,
  VehicleStatus,
} from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { SequenceService } from '../../common/sequence/sequence.service';
import { InventoryService } from '../inventory/inventory.service';
import { QualityService } from '../quality/quality.service';
import {
  paginate,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import {
  AddStopDto,
  AssignRouteDto,
  CreateRouteDto,
  ReorderStopsDto,
  TransitionRouteDto,
} from './dto/route.dto';

/** Rutas que aún "ocupan" un pedido (no permiten sumarlo a otra ruta). */
const ACTIVE_ROUTE_STATES: RouteStatus[] = [
  RouteStatus.PLANIFICADA,
  RouteStatus.CARGANDO,
  RouteStatus.EN_RUTA,
];

/** Rutas editables (se pueden agregar/quitar/reordenar paradas). */
const EDITABLE_ROUTE_STATES: RouteStatus[] = [
  RouteStatus.PLANIFICADA,
  RouteStatus.CARGANDO,
];

@Injectable()
export class RoutingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
    private readonly inventory: InventoryService,
    private readonly quality: QualityService,
  ) {}

  /** Crea una ruta (= despacho) con pedidos PREPARADOS como paradas (§19/§20). */
  async create(companyId: string, userId: string, dto: CreateRouteDto) {
    const ids = [...new Set(dto.salesOrderIds)];
    const orders = await this.prisma.salesOrder.findMany({
      where: { id: { in: ids }, companyId },
      select: { id: true, numero: true, estado: true },
    });
    if (orders.length !== ids.length) {
      throw new BadRequestException('Algún pedido no pertenece a la empresa');
    }
    for (const o of orders) {
      if (o.estado !== SalesOrderStatus.PREPARADO) {
        throw new BadRequestException(
          `El pedido ${o.numero} no está PREPARADO (está ${o.estado})`,
        );
      }
    }
    await this.assertOrdersFree(ids);
    if (dto.vehicleId) await this.assertVehicle(companyId, dto.vehicleId);
    if (dto.driverId) await this.assertDriver(companyId, dto.driverId);

    // Respeta el orden recibido en salesOrderIds.
    const orden = new Map(ids.map((id, i) => [id, i + 1]));

    const route = await this.prisma.$transaction(async (tx) => {
      const numero = await this.sequence.next(tx, companyId, 'RUTA');
      const created = await tx.route.create({
        data: {
          companyId,
          numero,
          vehicleId: dto.vehicleId,
          driverId: dto.driverId,
          notas: dto.notas,
          createdById: userId,
          stops: {
            create: ids.map((salesOrderId) => ({
              salesOrderId,
              orden: orden.get(salesOrderId)!,
            })),
          },
        },
      });
      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: AuditAction.CREATE,
        entityType: 'Route',
        entityId: created.id,
        relatedDocument: numero,
        stateAfter: { numero, paradas: ids.length },
      });
      return created;
    });

    return this.findOne(companyId, route.id);
  }

  async findAll(
    companyId: string,
    query: PaginationQueryDto,
    estado?: RouteStatus,
  ) {
    const where: Prisma.RouteWhereInput = {
      companyId,
      ...(estado ? { estado } : {}),
      ...(query.q
        ? { numero: { contains: query.q, mode: 'insensitive' } }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.route.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          vehicle: { select: { id: true, patente: true } },
          driver: { select: { id: true, nombre: true } },
          _count: { select: { stops: true } },
        },
      }),
      this.prisma.route.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(companyId: string, id: string) {
    const route = await this.prisma.route.findFirst({
      where: { id, companyId },
      include: {
        vehicle: true,
        driver: true,
        stops: {
          orderBy: { orden: 'asc' },
          include: {
            salesOrder: {
              select: {
                id: true,
                numero: true,
                estado: true,
                total: true,
                customer: { select: { razonSocial: true } },
                customerAddress: {
                  select: { direccion: true, comuna: true },
                },
              },
            },
          },
        },
      },
    });
    if (!route) throw new NotFoundException('Ruta no encontrada');
    return route;
  }

  /** Asigna/actualiza vehículo y conductor (ruta editable). */
  async assign(
    companyId: string,
    userId: string,
    id: string,
    dto: AssignRouteDto,
  ) {
    const route = await this.findOnePlain(companyId, id);
    this.assertEditable(route.estado as RouteStatus);
    if (dto.vehicleId) await this.assertVehicle(companyId, dto.vehicleId);
    if (dto.driverId) await this.assertDriver(companyId, dto.driverId);

    const updated = await this.prisma.route.update({
      where: { id },
      data: {
        vehicleId: dto.vehicleId ?? route.vehicleId,
        driverId: dto.driverId ?? route.driverId,
      },
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Route',
      entityId: id,
      relatedDocument: route.numero,
      notes: 'Asignación de vehículo/conductor',
    });
    return this.findOne(companyId, updated.id);
  }

  async addStop(
    companyId: string,
    userId: string,
    id: string,
    dto: AddStopDto,
  ) {
    const route = await this.findOnePlain(companyId, id);
    this.assertEditable(route.estado as RouteStatus);

    const order = await this.prisma.salesOrder.findFirst({
      where: { id: dto.salesOrderId, companyId },
      select: { id: true, numero: true, estado: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (order.estado !== SalesOrderStatus.PREPARADO) {
      throw new BadRequestException(
        `El pedido ${order.numero} no está PREPARADO`,
      );
    }
    await this.assertOrdersFree([order.id]);

    const max = await this.prisma.routeStop.aggregate({
      where: { routeId: id },
      _max: { orden: true },
    });
    await this.prisma.routeStop.create({
      data: {
        routeId: id,
        salesOrderId: order.id,
        orden: (max._max.orden ?? 0) + 1,
      },
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Route',
      entityId: id,
      relatedDocument: route.numero,
      notes: `Parada agregada: ${order.numero}`,
    });
    return this.findOne(companyId, id);
  }

  async removeStop(
    companyId: string,
    userId: string,
    id: string,
    stopId: string,
  ) {
    const route = await this.findOnePlain(companyId, id);
    this.assertEditable(route.estado as RouteStatus);
    const stop = await this.prisma.routeStop.findFirst({
      where: { id: stopId, routeId: id },
      select: { id: true },
    });
    if (!stop) throw new NotFoundException('Parada no encontrada');
    await this.prisma.routeStop.delete({ where: { id: stopId } });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Route',
      entityId: id,
      relatedDocument: route.numero,
      notes: 'Parada eliminada',
    });
    return this.findOne(companyId, id);
  }

  /** Reordena las paradas (optimización manual de la ruta, §20). */
  async reorder(
    companyId: string,
    userId: string,
    id: string,
    dto: ReorderStopsDto,
  ) {
    const route = await this.findOnePlain(companyId, id);
    this.assertEditable(route.estado as RouteStatus);
    const stops = await this.prisma.routeStop.findMany({
      where: { routeId: id },
      select: { id: true },
    });
    const stopIds = new Set(stops.map((s) => s.id));
    if (
      dto.stopIds.length !== stops.length ||
      !dto.stopIds.every((s) => stopIds.has(s))
    ) {
      throw new BadRequestException(
        'La lista debe contener exactamente las paradas de la ruta',
      );
    }
    await this.prisma.$transaction(
      dto.stopIds.map((stopId, i) =>
        this.prisma.routeStop.update({
          where: { id: stopId },
          data: { orden: i + 1 },
        }),
      ),
    );
    return this.findOne(companyId, id);
  }

  /** Transición manual PLANIFICADA ⇄ CARGANDO / CANCELADA. */
  async transition(
    companyId: string,
    userId: string,
    id: string,
    dto: TransitionRouteDto,
  ) {
    const route = await this.findOnePlain(companyId, id);
    const from = route.estado as RouteStatus;
    if (!canTransitionRoute(from, dto.to)) {
      throw new ConflictException(`Transición no permitida: ${from} → ${dto.to}`);
    }
    const updated = await this.prisma.route.update({
      where: { id },
      data: {
        estado: dto.to,
        cargaConfirmada: dto.to === RouteStatus.CARGANDO ? true : route.cargaConfirmada,
      },
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.ROUTE_STATE_CHANGE,
      entityType: 'Route',
      entityId: id,
      relatedDocument: route.numero,
      stateBefore: { estado: from },
      stateAfter: { estado: dto.to },
      notes: dto.motivo,
    });
    return this.findOne(companyId, id);
  }

  /**
   * Salida de la ruta (§19 "controlar salida"). Reglas: debe tener vehículo,
   * conductor y al menos una parada; ningún pedido puede tener un control de
   * calidad RECHAZADO. Cada pedido sale físicamente de bodega (movimiento
   * DESPACHO por lo confirmado) y pasa EN_DESPACHO → EN_RUTA.
   */
  async depart(companyId: string, userId: string, id: string) {
    const route = await this.prisma.route.findFirst({
      where: { id, companyId },
      include: {
        stops: {
          include: {
            salesOrder: {
              include: { items: true },
            },
          },
        },
      },
    });
    if (!route) throw new NotFoundException('Ruta no encontrada');

    const from = route.estado as RouteStatus;
    if (!canTransitionRoute(from, RouteStatus.EN_RUTA)) {
      throw new ConflictException(
        `La ruta en estado ${from} no puede salir (debe estar CARGANDO)`,
      );
    }
    if (!route.vehicleId || !route.driverId) {
      throw new BadRequestException(
        'La ruta requiere vehículo y conductor antes de salir',
      );
    }
    if (route.stops.length === 0) {
      throw new BadRequestException('La ruta no tiene paradas');
    }

    // Validaciones por pedido: estado PREPARADO y sin calidad RECHAZADA (§18).
    for (const stop of route.stops) {
      const o = stop.salesOrder;
      if (o.estado !== SalesOrderStatus.PREPARADO) {
        throw new BadRequestException(
          `El pedido ${o.numero} no está PREPARADO (está ${o.estado})`,
        );
      }
      const calidad = await this.quality.latestResult(companyId, o.id);
      if (calidad === QualityResult.RECHAZADO) {
        throw new BadRequestException(
          `El pedido ${o.numero} tiene control de calidad RECHAZADO`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const stop of route.stops) {
        const o = stop.salesOrder;
        // Salida física de lo confirmado (por el único punto de mutación).
        for (const item of o.items) {
          const confirmada = Number(item.cantidadConfirmada);
          if (confirmada <= 0) continue;
          await this.inventory.applyMovement(tx, {
            companyId,
            warehouseId: o.warehouseId,
            productId: item.productId,
            tipo: InventoryMovementType.DESPACHO,
            delta: -confirmada,
            referenciaTipo: 'Route',
            referenciaId: route.id,
            usuarioId: userId,
            notas: `Despacho ${route.numero} (pedido ${o.numero})`,
          });
          // Libera la reserva asociada, sin bajar de cero.
          await tx.$executeRaw`
            UPDATE inventory
            SET cantidad_reservada = GREATEST(0, cantidad_reservada - ${new Prisma.Decimal(confirmada)})
            WHERE warehouse_id = ${o.warehouseId} AND product_id = ${item.productId}
          `;
        }

        // Pedido: PREPARADO → EN_DESPACHO → EN_RUTA (ambas válidas).
        await tx.salesOrder.update({
          where: { id: o.id },
          data: { estado: SalesOrderStatus.EN_RUTA },
        });
        await tx.routeStop.update({
          where: { id: stop.id },
          data: { estado: RouteStopStatus.EN_RUTA },
        });
        await this.audit.recordWithTx(tx, {
          companyId,
          userId,
          action: AuditAction.ORDER_STATE_CHANGE,
          entityType: 'SalesOrder',
          entityId: o.id,
          relatedDocument: o.numero,
          stateBefore: { estado: SalesOrderStatus.PREPARADO },
          stateAfter: { estado: SalesOrderStatus.EN_RUTA },
          notes: `Despachado en ruta ${route.numero}`,
        });
      }

      await tx.route.update({
        where: { id },
        data: {
          estado: RouteStatus.EN_RUTA,
          cargaConfirmada: true,
          salidaAt: new Date(),
        },
      });
      if (route.vehicleId) {
        await tx.vehicle.update({
          where: { id: route.vehicleId },
          data: { estado: VehicleStatus.EN_RUTA },
        });
      }
      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: AuditAction.ROUTE_STATE_CHANGE,
        entityType: 'Route',
        entityId: id,
        relatedDocument: route.numero,
        stateBefore: { estado: from },
        stateAfter: { estado: RouteStatus.EN_RUTA },
        notes: `Salida con ${route.stops.length} parada(s)`,
      });
    });

    return this.findOne(companyId, id);
  }

  /**
   * Cierra la ruta (EN_RUTA → COMPLETADA) y libera el vehículo. Las entregas y
   * evidencias por parada llegan en la Fase 5; aquí solo se cierra la ruta.
   */
  async complete(companyId: string, userId: string, id: string) {
    const route = await this.findOnePlain(companyId, id);
    if (!canTransitionRoute(route.estado as RouteStatus, RouteStatus.COMPLETADA)) {
      throw new ConflictException(
        `La ruta en estado ${route.estado} no se puede completar`,
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.route.update({
        where: { id },
        data: { estado: RouteStatus.COMPLETADA },
      });
      if (route.vehicleId) {
        await tx.vehicle.update({
          where: { id: route.vehicleId },
          data: { estado: VehicleStatus.DISPONIBLE },
        });
      }
      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: AuditAction.ROUTE_STATE_CHANGE,
        entityType: 'Route',
        entityId: id,
        relatedDocument: route.numero,
        stateBefore: { estado: route.estado },
        stateAfter: { estado: RouteStatus.COMPLETADA },
      });
    });
    return this.findOne(companyId, id);
  }

  /**
   * Centro de despacho (§19): pedidos PREPARADOS que aún no están en una ruta
   * activa, listos para agruparse en una ruta.
   */
  async dispatchable(companyId: string, query: PaginationQueryDto) {
    const busy = await this.prisma.routeStop.findMany({
      where: { route: { companyId, estado: { in: ACTIVE_ROUTE_STATES } } },
      select: { salesOrderId: true },
    });
    const busyIds = busy.map((b) => b.salesOrderId);

    const where: Prisma.SalesOrderWhereInput = {
      companyId,
      estado: SalesOrderStatus.PREPARADO,
      ...(busyIds.length ? { id: { notIn: busyIds } } : {}),
      ...(query.q
        ? { numero: { contains: query.q, mode: 'insensitive' } }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        where,
        orderBy: { fechaDespachoProg: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          customer: { select: { razonSocial: true } },
          customerAddress: { select: { direccion: true, comuna: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  // --- Helpers ---

  private async findOnePlain(companyId: string, id: string) {
    const route = await this.prisma.route.findFirst({ where: { id, companyId } });
    if (!route) throw new NotFoundException('Ruta no encontrada');
    return route;
  }

  private assertEditable(estado: RouteStatus) {
    if (!EDITABLE_ROUTE_STATES.includes(estado)) {
      throw new BadRequestException(
        `La ruta en estado ${estado} no admite cambios de paradas/asignación`,
      );
    }
  }

  /** Ningún pedido puede estar en otra ruta activa (§20). */
  private async assertOrdersFree(salesOrderIds: string[]) {
    const conflict = await this.prisma.routeStop.findFirst({
      where: {
        salesOrderId: { in: salesOrderIds },
        route: { estado: { in: ACTIVE_ROUTE_STATES } },
      },
      select: { salesOrderId: true },
    });
    if (conflict) {
      throw new ConflictException(
        'Alguno de los pedidos ya está en una ruta activa',
      );
    }
  }

  private async assertVehicle(companyId: string, vehicleId: string) {
    const v = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId },
      select: { id: true },
    });
    if (!v) throw new BadRequestException('Vehículo no válido');
  }

  private async assertDriver(companyId: string, driverId: string) {
    const d = await this.prisma.driver.findFirst({
      where: { id: driverId, companyId },
      select: { id: true },
    });
    if (!d) throw new BadRequestException('Conductor no válido');
  }
}
