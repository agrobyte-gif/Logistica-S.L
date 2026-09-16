import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: FinanceService,
  ) {}

  /** KPIs reales del dashboard gerencial (prompt §27). */
  async summary(companyId: string) {
    const hoy = startOfToday();

    const [
      usuarios,
      bodegas,
      pedidosHoy,
      ventasHoyAgg,
      pedidosPendientes,
      enPicking,
      enRuta,
      entregadosHoy,
      incidencias,
      comprasPendientes,
      mermaHoyAgg,
      cajaAgg,
      stockCritico,
      finance,
    ] = await Promise.all([
      this.prisma.user.count({ where: { companyId } }),
      this.prisma.warehouse.count({ where: { companyId } }),
      this.prisma.salesOrder.count({
        where: { companyId, fechaPedido: { gte: hoy } },
      }),
      this.prisma.salesOrder.aggregate({
        where: { companyId, fechaPedido: { gte: hoy } },
        _sum: { total: true },
      }),
      this.prisma.salesOrder.count({
        where: {
          companyId,
          estado: {
            in: ['RECIBIDO', 'VALIDANDO_STOCK', 'CONFIRMADO', 'ESPERANDO_COMPRA'],
          },
        },
      }),
      this.prisma.salesOrder.count({
        where: { companyId, estado: 'EN_PICKING' },
      }),
      this.prisma.salesOrder.count({
        where: { companyId, estado: 'EN_RUTA' },
      }),
      this.prisma.delivery.count({
        where: { companyId, estado: 'ENTREGADO', hora: { gte: hoy } },
      }),
      this.prisma.salesOrder.count({
        where: { companyId, estado: 'INCIDENCIA' },
      }),
      this.prisma.purchaseOrder.count({
        where: {
          companyId,
          estado: { in: ['BORRADOR', 'APROBADA', 'ENVIADA', 'RECIBIDA_PARCIAL'] },
        },
      }),
      this.prisma.waste.aggregate({
        where: { companyId, createdAt: { gte: hoy } },
        _sum: { costo: true },
      }),
      this.prisma.cashRegister.aggregate({
        where: { companyId, estado: 'ABIERTA' },
        _sum: { saldoActual: true },
      }),
      this.countStockCritico(companyId),
      this.finance.kpis(companyId),
    ]);

    return {
      companyId,
      kpis: {
        usuarios,
        bodegas,
        ventasHoy: Number(ventasHoyAgg._sum.total ?? 0),
        pedidosHoy,
        pedidosPendientes,
        pedidosEnPicking: enPicking,
        pedidosEnRuta: enRuta,
        entregadosHoy,
        incidencias,
        comprasPendientes,
        stockCritico,
        mermaHoy: Number(mermaHoyAgg._sum.costo ?? 0),
        cajaChica: Number(cajaAgg._sum.saldoActual ?? 0),
        cuentasPorCobrar: finance.cuentasPorCobrar,
        cuentasPorPagar: finance.cuentasPorPagar,
      },
    };
  }

  /** Vista Control Tower: contadores operativos + alertas (prompt §52). */
  async controlTower(companyId: string) {
    const summary = await this.summary(companyId);
    const k = summary.kpis;

    const alertas: { nivel: string; texto: string }[] = [];
    if (k.stockCritico > 0)
      alertas.push({
        nivel: 'CRITICAL',
        texto: `${k.stockCritico} productos en stock crítico`,
      });
    if (k.incidencias > 0)
      alertas.push({
        nivel: 'CRITICAL',
        texto: `${k.incidencias} pedidos con incidencia`,
      });
    if (k.comprasPendientes > 0)
      alertas.push({
        nivel: 'WARN',
        texto: `${k.comprasPendientes} compras pendientes`,
      });
    if (k.cuentasPorCobrar > 0)
      alertas.push({
        nivel: 'INFO',
        texto: `Por cobrar: ${k.cuentasPorCobrar.toLocaleString('es-CL')}`,
      });

    return {
      operacion: {
        pedidos: k.pedidosHoy,
        pendientes: k.pedidosPendientes,
        enPicking: k.pedidosEnPicking,
        enRuta: k.pedidosEnRuta,
        entregados: k.entregadosHoy,
      },
      alertas,
    };
  }

  /** Cuenta productos cuyo disponible < stock mínimo. */
  private async countStockCritico(companyId: string): Promise<number> {
    const rows = await this.prisma.inventory.findMany({
      where: { companyId },
      select: {
        cantidadFisica: true,
        cantidadReservada: true,
        cantidadBloqueada: true,
        product: { select: { stockMinimo: true } },
      },
    });
    return rows.filter((r) => {
      const disp =
        Number(r.cantidadFisica) -
        Number(r.cantidadReservada) -
        Number(r.cantidadBloqueada);
      return disp < Number(r.product.stockMinimo);
    }).length;
  }
}
