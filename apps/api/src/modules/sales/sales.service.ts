import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AuditAction,
  canTransition,
  classifyStock,
  PurchaseRequestOrigin,
  SalesOrderStatus,
  StockStatus,
} from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { SequenceService } from '../../common/sequence/sequence.service';
import {
  paginate,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import {
  CreateSalesOrderDto,
  TransitionOrderDto,
} from './dto/sales-order.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
  ) {}

  async create(companyId: string, userId: string, dto: CreateSalesOrderDto) {
    // 1. Validaciones de pertenencia (multi-tenant).
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    const warehouse = await this.resolveWarehouse(companyId, dto.warehouseId);

    if (dto.customerAddressId) {
      const addr = await this.prisma.customerAddress.findFirst({
        where: { id: dto.customerAddressId, customerId: dto.customerId },
        select: { id: true },
      });
      if (!addr) throw new BadRequestException('Dirección no válida');
    }

    // 2. Cargar productos y precios vigentes.
    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, companyId },
      include: {
        prices: { orderBy: { vigenteDesde: 'desc' }, take: 1 },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of dto.items) {
      if (!productMap.has(item.productId)) {
        throw new BadRequestException(
          `Producto ${item.productId} no pertenece a la empresa`,
        );
      }
    }

    // 3. Transacción atómica: numeración + clasificación + reserva.
    const result = await this.prisma.$transaction(async (tx) => {
      const numero = await this.sequence.next(tx, companyId, 'PED');

      const order = await tx.salesOrder.create({
        data: {
          companyId,
          numero,
          customerId: dto.customerId,
          customerAddressId: dto.customerAddressId,
          warehouseId: warehouse.id,
          estado: SalesOrderStatus.RECIBIDO,
          notas: dto.notas,
          createdById: userId,
          total: 0,
        },
      });

      let total = 0;
      let allAvailable = true;
      const deficits: { productId: string; cantidad: number }[] = [];

      for (const item of dto.items) {
        const product = productMap.get(item.productId)!;
        const precio =
          item.precioUnitario ??
          (product.prices[0]
            ? Number(product.prices[0].precioVenta)
            : 0);
        total += precio * item.cantidad;

        // Bloqueo de fila del inventario para evitar sobreventa (auditoría B2).
        const disponible = await this.lockAndGetAvailable(
          tx,
          warehouse.id,
          item.productId,
        );
        const estadoStock = classifyStock(disponible, item.cantidad);
        if (estadoStock !== StockStatus.DISPONIBLE) {
          allAvailable = false;
          deficits.push({
            productId: item.productId,
            cantidad: item.cantidad - Math.max(disponible, 0),
          });
        }

        await tx.salesOrderItem.create({
          data: {
            salesOrderId: order.id,
            productId: item.productId,
            cantidad: item.cantidad,
            unidad: product.unidadBase,
            precioUnitario: precio,
            estadoStock,
            cantidadConfirmada:
              estadoStock === StockStatus.DISPONIBLE ? item.cantidad : 0,
          },
        });
      }

      const finalStatus = allAvailable
        ? SalesOrderStatus.CONFIRMADO
        : SalesOrderStatus.ESPERANDO_COMPRA;

      // Si todo está disponible, reservar el stock dentro de la misma tx.
      if (allAvailable) {
        for (const item of dto.items) {
          await tx.inventory.update({
            where: {
              warehouseId_productId: {
                warehouseId: warehouse.id,
                productId: item.productId,
              },
            },
            data: { cantidadReservada: { increment: item.cantidad } },
          });
        }
      } else {
        // Generar necesidades de compra automáticas (prompt §10).
        for (const d of deficits) {
          if (d.cantidad <= 0) continue;
          const pr = await tx.purchaseRequest.create({
            data: {
              companyId,
              origen: PurchaseRequestOrigin.AUTO_STOCK,
              productId: d.productId,
              cantidad: d.cantidad,
              salesOrderId: order.id,
              solicitadoPor: userId,
            },
          });
          await this.audit.recordWithTx(tx, {
            companyId,
            userId,
            action: AuditAction.PURCHASE_REQUEST_CREATED,
            entityType: 'PurchaseRequest',
            entityId: pr.id,
            relatedDocument: numero,
            notes: `Necesidad automática por stock insuficiente`,
          });
        }
      }

      const updated = await tx.salesOrder.update({
        where: { id: order.id },
        data: { estado: finalStatus, total },
      });

      // Auditar la ruta de estados (RECIBIDO → VALIDANDO_STOCK → final).
      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: AuditAction.CREATE,
        entityType: 'SalesOrder',
        entityId: order.id,
        relatedDocument: numero,
        stateAfter: { numero, estado: finalStatus, total },
      });
      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: AuditAction.ORDER_STATE_CHANGE,
        entityType: 'SalesOrder',
        entityId: order.id,
        relatedDocument: numero,
        stateBefore: { estado: SalesOrderStatus.RECIBIDO },
        stateAfter: { estado: finalStatus },
        notes: allAvailable
          ? 'Stock validado: pedido confirmado y reservado'
          : 'Stock insuficiente: en espera de compra',
      });

      return updated;
    });

    return this.findOne(companyId, result.id);
  }

  async findAll(
    companyId: string,
    query: PaginationQueryDto,
    estado?: SalesOrderStatus,
  ) {
    const where: Prisma.SalesOrderWhereInput = {
      companyId,
      ...(estado ? { estado } : {}),
      ...(query.q
        ? {
            OR: [
              { numero: { contains: query.q, mode: 'insensitive' } },
              {
                customer: {
                  razonSocial: { contains: query.q, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.salesOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          customer: { select: { id: true, razonSocial: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(companyId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        customerAddress: true,
        warehouse: { select: { id: true, nombre: true } },
        items: {
          include: { product: { select: { id: true, sku: true, nombre: true } } },
        },
        purchaseRequests: true,
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async transition(
    companyId: string,
    userId: string,
    id: string,
    dto: TransitionOrderDto,
  ) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId },
      select: { id: true, estado: true, numero: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const from = order.estado as SalesOrderStatus;
    if (from === dto.to) {
      throw new ConflictException('El pedido ya está en ese estado');
    }
    if (!canTransition(from, dto.to)) {
      throw new ConflictException(
        `Transición no permitida: ${from} → ${dto.to}`,
      );
    }

    const updated = await this.prisma.salesOrder.update({
      where: { id },
      data: { estado: dto.to },
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.ORDER_STATE_CHANGE,
      entityType: 'SalesOrder',
      entityId: id,
      relatedDocument: order.numero,
      stateBefore: { estado: from },
      stateAfter: { estado: dto.to },
      notes: dto.motivo,
    });
    return updated;
  }

  /** Línea de tiempo del pedido (prompt §53) a partir de la auditoría. */
  async timeline(companyId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    const logs = await this.prisma.auditLog.findMany({
      where: { entityType: 'SalesOrder', entityId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        action: true,
        stateBefore: true,
        stateAfter: true,
        notes: true,
        createdAt: true,
        userId: true,
      },
    });
    return logs;
  }

  // --- Helpers ---

  private async resolveWarehouse(companyId: string, warehouseId?: string) {
    if (warehouseId) {
      const wh = await this.prisma.warehouse.findFirst({
        where: { id: warehouseId, companyId },
        select: { id: true },
      });
      if (!wh) throw new BadRequestException('Bodega no válida');
      return wh;
    }
    const wh = await this.prisma.warehouse.findFirst({
      where: { companyId, estado: 'ACTIVO' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!wh) {
      throw new BadRequestException(
        'La empresa no tiene bodegas configuradas',
      );
    }
    return wh;
  }

  /**
   * Bloquea la fila de inventario (SELECT … FOR UPDATE) y devuelve el stock
   * disponible = física − reservada − bloqueada. Si no hay fila, disponible 0.
   */
  private async lockAndGetAvailable(
    tx: Prisma.TransactionClient,
    warehouseId: string,
    productId: string,
  ): Promise<number> {
    const rows = await tx.$queryRaw<
      {
        cantidad_fisica: string;
        cantidad_reservada: string;
        cantidad_bloqueada: string;
      }[]
    >`
      SELECT cantidad_fisica, cantidad_reservada, cantidad_bloqueada
      FROM inventory
      WHERE warehouse_id = ${warehouseId} AND product_id = ${productId}
      FOR UPDATE
    `;
    if (rows.length === 0) return 0;
    const r = rows[0];
    return (
      Number(r.cantidad_fisica) -
      Number(r.cantidad_reservada) -
      Number(r.cantidad_bloqueada)
    );
  }
}
