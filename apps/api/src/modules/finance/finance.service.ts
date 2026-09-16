import { Injectable } from '@nestjs/common';
import { agingStatus, AgingStatus, DocumentStatus } from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface AgingRow {
  id: string;
  folio: string;
  contraparte: string;
  total: number;
  pagado: number;
  saldo: number;
  fechaVencim: Date | null;
  aging: AgingStatus;
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** Cuentas por cobrar: documentos con saldo, con semáforo de vencimiento. */
  async receivables(companyId: string): Promise<{
    rows: AgingRow[];
    totalSaldo: number;
    totalVencido: number;
  }> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        companyId,
        estado: { in: [DocumentStatus.EMITIDA, DocumentStatus.PAGADA_PARCIAL] },
      },
      include: { customer: { select: { razonSocial: true } } },
      orderBy: { fechaVencim: 'asc' },
    });
    const hoy = new Date();
    const rows = invoices.map((i) => {
      const saldo = Number(i.total) - Number(i.pagado);
      return {
        id: i.id,
        folio: `${i.tipoDte} ${i.folio}`,
        contraparte: i.customer.razonSocial,
        total: Number(i.total),
        pagado: Number(i.pagado),
        saldo,
        fechaVencim: i.fechaVencim,
        aging: agingStatus(saldo, i.fechaVencim, hoy),
      };
    });
    return this.summarize(rows);
  }

  /** Cuentas por pagar: facturas de proveedor con saldo. */
  async payables(companyId: string): Promise<{
    rows: AgingRow[];
    totalSaldo: number;
    totalVencido: number;
  }> {
    const invoices = await this.prisma.supplierInvoice.findMany({
      where: {
        companyId,
        estado: { in: [DocumentStatus.EMITIDA, DocumentStatus.PAGADA_PARCIAL] },
      },
      include: { supplier: { select: { razonSocial: true } } },
      orderBy: { fechaVencim: 'asc' },
    });
    const hoy = new Date();
    const rows = invoices.map((i) => {
      const saldo = Number(i.total) - Number(i.pagado);
      return {
        id: i.id,
        folio: i.folio,
        contraparte: i.supplier.razonSocial,
        total: Number(i.total),
        pagado: Number(i.pagado),
        saldo,
        fechaVencim: i.fechaVencim,
        aging: agingStatus(saldo, i.fechaVencim, hoy),
      };
    });
    return this.summarize(rows);
  }

  /** KPIs financieros para el dashboard/Control Tower. */
  async kpis(companyId: string) {
    const [cxc, cxp] = await Promise.all([
      this.receivables(companyId),
      this.payables(companyId),
    ]);
    return {
      cuentasPorCobrar: cxc.totalSaldo,
      cxcVencido: cxc.totalVencido,
      cuentasPorPagar: cxp.totalSaldo,
      cxpVencido: cxp.totalVencido,
    };
  }

  private summarize(rows: AgingRow[]) {
    const totalSaldo = rows.reduce((s, r) => s + r.saldo, 0);
    const totalVencido = rows
      .filter((r) => r.aging === AgingStatus.VENCIDO)
      .reduce((s, r) => s + r.saldo, 0);
    return { rows, totalSaldo, totalVencido };
  }
}
