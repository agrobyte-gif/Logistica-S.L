import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Asistente de inteligencia basado en datos históricos (heurístico/estadístico).
 * NO ejecuta acciones: solo recomienda (prompt §32). La arquitectura permite
 * sustituir estas heurísticas por un modelo/LLM detrás de la misma interfaz sin
 * tocar los controladores ni el frontend.
 */
@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recomendación de compras: estima la demanda diaria de cada producto a
   * partir de las salidas de inventario de los últimos `lookbackDays`, la
   * proyecta a `horizonDays` y la compara con el stock disponible.
   */
  async purchaseRecommendations(
    companyId: string,
    horizonDays = 7,
    lookbackDays = 90,
  ) {
    const desde = new Date(Date.now() - lookbackDays * 86_400_000);

    const [movements, inventory, products] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where: {
          companyId,
          tipo: { in: ['SALIDA', 'DESPACHO'] },
          createdAt: { gte: desde },
        },
        select: { productId: true, cantidad: true },
      }),
      this.prisma.inventory.findMany({
        where: { companyId },
        select: {
          productId: true,
          cantidadFisica: true,
          cantidadReservada: true,
          cantidadBloqueada: true,
        },
      }),
      this.prisma.product.findMany({
        where: { companyId, estado: 'ACTIVO' },
        select: {
          id: true,
          sku: true,
          nombre: true,
          unidadBase: true,
          stockMinimo: true,
          puntoReposicion: true,
        },
      }),
    ]);

    // Consumo acumulado por producto (cantidad de salidas es negativa).
    const consumo = new Map<string, number>();
    for (const m of movements) {
      consumo.set(
        m.productId,
        (consumo.get(m.productId) ?? 0) + Math.abs(Number(m.cantidad)),
      );
    }
    // Disponible por producto.
    const disponible = new Map<string, number>();
    for (const i of inventory) {
      const d =
        Number(i.cantidadFisica) -
        Number(i.cantidadReservada) -
        Number(i.cantidadBloqueada);
      disponible.set(i.productId, (disponible.get(i.productId) ?? 0) + d);
    }

    const recs = products
      .map((p) => {
        const totalOut = consumo.get(p.id) ?? 0;
        const avgDaily = totalOut / lookbackDays;
        const proyeccion = Math.round(avgDaily * horizonDays * 100) / 100;
        const disp = disponible.get(p.id) ?? 0;
        const minimo = Number(p.stockMinimo);
        // Recomendar cubrir la demanda proyectada; si no hay historial, usar
        // el stock mínimo/punto de reposición como referencia.
        const objetivo = Math.max(
          proyeccion,
          Number(p.puntoReposicion ?? minimo),
        );
        const recomendarComprar = Math.max(0, Math.ceil(objetivo - disp));
        return {
          productId: p.id,
          sku: p.sku,
          producto: p.nombre,
          unidad: p.unidadBase,
          demandaDiaria: Math.round(avgDaily * 100) / 100,
          demandaProyectada: proyeccion,
          disponible: disp,
          recomendarComprar,
          critico: disp < minimo,
          mensaje:
            recomendarComprar > 0
              ? `Según los últimos ${lookbackDays} días, se estima una demanda de ~${proyeccion} en ${horizonDays} días. Hay ${disp} disponibles. Se recomienda comprar ~${recomendarComprar}.`
              : `Stock suficiente para la demanda estimada (${disp} disponibles).`,
        };
      })
      .filter((r) => r.recomendarComprar > 0 || r.critico)
      .sort((a, b) => b.recomendarComprar - a.recomendarComprar);

    return { horizonDays, lookbackDays, recomendaciones: recs };
  }

  /**
   * Detección simple de anomalías: compara la merma (costo) de los últimos 7
   * días contra los 7 previos y marca desviaciones relevantes.
   */
  async anomalies(companyId: string) {
    const now = Date.now();
    const d7 = new Date(now - 7 * 86_400_000);
    const d14 = new Date(now - 14 * 86_400_000);

    const [semana, previa] = await Promise.all([
      this.prisma.waste.aggregate({
        where: { companyId, createdAt: { gte: d7 } },
        _sum: { costo: true },
      }),
      this.prisma.waste.aggregate({
        where: { companyId, createdAt: { gte: d14, lt: d7 } },
        _sum: { costo: true },
      }),
    ]);
    const mermaSemana = Number(semana._sum.costo ?? 0);
    const mermaPrevia = Number(previa._sum.costo ?? 0);
    const anomalias: { tipo: string; nivel: string; texto: string }[] = [];

    if (mermaPrevia > 0 && mermaSemana > mermaPrevia * 1.25) {
      const pct = Math.round((mermaSemana / mermaPrevia - 1) * 100);
      anomalias.push({
        tipo: 'MERMA',
        nivel: 'WARN',
        texto: `La merma subió ${pct}% respecto a la semana anterior (${mermaSemana.toLocaleString('es-CL')} vs ${mermaPrevia.toLocaleString('es-CL')}).`,
      });
    }

    return {
      mermaSemana,
      mermaPrevia,
      anomalias,
    };
  }

  /** Análisis de clientes: frecuencia, ticket promedio y última compra. */
  async customerInsights(companyId: string) {
    const orders = await this.prisma.salesOrder.findMany({
      where: { companyId },
      select: {
        customerId: true,
        total: true,
        fechaPedido: true,
        customer: { select: { razonSocial: true } },
      },
    });
    const acc = new Map<
      string,
      { nombre: string; pedidos: number; monto: number; ultima: Date }
    >();
    for (const o of orders) {
      const cur =
        acc.get(o.customerId) ??
        {
          nombre: o.customer.razonSocial,
          pedidos: 0,
          monto: 0,
          ultima: o.fechaPedido,
        };
      cur.pedidos += 1;
      cur.monto += Number(o.total);
      if (o.fechaPedido > cur.ultima) cur.ultima = o.fechaPedido;
      acc.set(o.customerId, cur);
    }
    const insights = [...acc.entries()]
      .map(([id, v]) => ({
        customerId: id,
        cliente: v.nombre,
        pedidos: v.pedidos,
        ticketPromedio: Math.round(v.monto / v.pedidos),
        totalComprado: v.monto,
        ultimaCompra: v.ultima,
      }))
      .sort((a, b) => b.totalComprado - a.totalComprado);
    return { clientes: insights };
  }
}
