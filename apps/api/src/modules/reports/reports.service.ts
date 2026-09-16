import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ReportResult {
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Ventas agrupadas por cliente. */
  async ventasPorCliente(companyId: string): Promise<ReportResult> {
    const grouped = await this.prisma.salesOrder.groupBy({
      by: ['customerId'],
      where: { companyId },
      _sum: { total: true },
      _count: { _all: true },
    });
    const customers = await this.prisma.customer.findMany({
      where: { companyId },
      select: { id: true, razonSocial: true },
    });
    const name = new Map(customers.map((c) => [c.id, c.razonSocial]));
    const rows = grouped
      .map((g) => ({
        cliente: name.get(g.customerId) ?? g.customerId,
        pedidos: g._count._all,
        total: Number(g._sum.total ?? 0),
      }))
      .sort((a, b) => b.total - a.total);
    return {
      columns: [
        { key: 'cliente', label: 'Cliente' },
        { key: 'pedidos', label: 'Pedidos' },
        { key: 'total', label: 'Total ventas' },
      ],
      rows,
    };
  }

  /** Ventas agrupadas por producto (cantidad y monto). */
  async ventasPorProducto(companyId: string): Promise<ReportResult> {
    const items = await this.prisma.salesOrderItem.findMany({
      where: { salesOrder: { companyId } },
      select: {
        cantidad: true,
        precioUnitario: true,
        product: { select: { sku: true, nombre: true } },
      },
    });
    const acc = new Map<string, { nombre: string; cantidad: number; monto: number }>();
    for (const it of items) {
      const key = it.product.sku;
      const cur = acc.get(key) ?? { nombre: it.product.nombre, cantidad: 0, monto: 0 };
      cur.cantidad += Number(it.cantidad);
      cur.monto += Number(it.cantidad) * Number(it.precioUnitario);
      acc.set(key, cur);
    }
    const rows = [...acc.entries()]
      .map(([sku, v]) => ({ sku, producto: v.nombre, cantidad: v.cantidad, monto: v.monto }))
      .sort((a, b) => b.monto - a.monto);
    return {
      columns: [
        { key: 'sku', label: 'SKU' },
        { key: 'producto', label: 'Producto' },
        { key: 'cantidad', label: 'Cantidad' },
        { key: 'monto', label: 'Monto' },
      ],
      rows,
    };
  }

  /** Compras por proveedor. */
  async comprasPorProveedor(companyId: string): Promise<ReportResult> {
    const grouped = await this.prisma.purchaseOrder.groupBy({
      by: ['supplierId'],
      where: { companyId },
      _sum: { total: true },
      _count: { _all: true },
    });
    const suppliers = await this.prisma.supplier.findMany({
      where: { companyId },
      select: { id: true, razonSocial: true },
    });
    const name = new Map(suppliers.map((s) => [s.id, s.razonSocial]));
    const rows = grouped
      .map((g) => ({
        proveedor: name.get(g.supplierId) ?? g.supplierId,
        ordenes: g._count._all,
        total: Number(g._sum.total ?? 0),
      }))
      .sort((a, b) => b.total - a.total);
    return {
      columns: [
        { key: 'proveedor', label: 'Proveedor' },
        { key: 'ordenes', label: 'Órdenes' },
        { key: 'total', label: 'Total compras' },
      ],
      rows,
    };
  }

  /** Mermas por motivo (cantidad y costo). */
  async mermasPorMotivo(companyId: string): Promise<ReportResult> {
    const grouped = await this.prisma.waste.groupBy({
      by: ['motivo'],
      where: { companyId },
      _sum: { cantidad: true, costo: true },
      _count: { _all: true },
    });
    const rows = grouped
      .map((g) => ({
        motivo: g.motivo,
        registros: g._count._all,
        cantidad: Number(g._sum.cantidad ?? 0),
        costo: Number(g._sum.costo ?? 0),
      }))
      .sort((a, b) => b.costo - a.costo);
    return {
      columns: [
        { key: 'motivo', label: 'Motivo' },
        { key: 'registros', label: 'Registros' },
        { key: 'cantidad', label: 'Cantidad' },
        { key: 'costo', label: 'Costo' },
      ],
      rows,
    };
  }

  /** Stock por producto con alerta de bajo mínimo. */
  async stock(companyId: string): Promise<ReportResult> {
    const inv = await this.prisma.inventory.findMany({
      where: { companyId },
      select: {
        cantidadFisica: true,
        cantidadReservada: true,
        cantidadBloqueada: true,
        product: { select: { sku: true, nombre: true, stockMinimo: true } },
        warehouse: { select: { nombre: true } },
      },
    });
    const rows = inv.map((r) => {
      const disp =
        Number(r.cantidadFisica) -
        Number(r.cantidadReservada) -
        Number(r.cantidadBloqueada);
      return {
        sku: r.product.sku,
        producto: r.product.nombre,
        bodega: r.warehouse.nombre,
        fisica: Number(r.cantidadFisica),
        disponible: disp,
        minimo: Number(r.product.stockMinimo),
        estado: disp < Number(r.product.stockMinimo) ? 'BAJO MÍNIMO' : 'OK',
      };
    });
    return {
      columns: [
        { key: 'sku', label: 'SKU' },
        { key: 'producto', label: 'Producto' },
        { key: 'bodega', label: 'Bodega' },
        { key: 'fisica', label: 'Física' },
        { key: 'disponible', label: 'Disponible' },
        { key: 'minimo', label: 'Mínimo' },
        { key: 'estado', label: 'Estado' },
      ],
      rows,
    };
  }

  private readonly catalog: Record<
    string,
    (companyId: string) => Promise<ReportResult>
  > = {
    'ventas-por-cliente': (c) => this.ventasPorCliente(c),
    'ventas-por-producto': (c) => this.ventasPorProducto(c),
    'compras-por-proveedor': (c) => this.comprasPorProveedor(c),
    'mermas-por-motivo': (c) => this.mermasPorMotivo(c),
    'stock': (c) => this.stock(c),
  };

  listReports() {
    return [
      { key: 'ventas-por-cliente', label: 'Ventas por cliente' },
      { key: 'ventas-por-producto', label: 'Ventas por producto' },
      { key: 'compras-por-proveedor', label: 'Compras por proveedor' },
      { key: 'mermas-por-motivo', label: 'Mermas por motivo' },
      { key: 'stock', label: 'Stock e inventario' },
    ];
  }

  async run(companyId: string, key: string): Promise<ReportResult | null> {
    const fn = this.catalog[key];
    return fn ? fn(companyId) : null;
  }

  /** Serializa un reporte a CSV (separador ; y BOM para Excel-es). */
  toCsv(report: ReportResult): string {
    const esc = (v: string | number) => {
      const s = String(v ?? '');
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = report.columns.map((c) => esc(c.label)).join(';');
    const lines = report.rows.map((row) =>
      report.columns.map((c) => esc(row[c.key])).join(';'),
    );
    return '﻿' + [header, ...lines].join('\n');
  }

  /** Serializa un reporte a un libro Excel (.xlsx). */
  async toXlsx(report: ReportResult, titulo: string): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'AGROGOOD';
    const ws = wb.addWorksheet(titulo.slice(0, 31)); // límite de nombre de hoja
    ws.columns = report.columns.map((c) => ({
      header: c.label,
      key: c.key,
      width: Math.max(14, c.label.length + 2),
    }));
    ws.getRow(1).font = { bold: true };
    for (const row of report.rows) ws.addRow(row);
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /** Serializa un reporte a PDF (tabla simple). */
  toPdf(report: ReportResult, titulo: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text(`AGROGOOD — ${titulo}`, { align: 'left' });
      doc.moveDown(0.3);
      doc
        .fontSize(9)
        .fillColor('#666')
        .text(new Date().toLocaleString('es-CL'));
      doc.moveDown(0.8);
      doc.fillColor('#000');

      const pageWidth =
        doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colWidth = pageWidth / report.columns.length;
      const startX = doc.page.margins.left;

      const drawRow = (
        values: (string | number)[],
        opts: { bold?: boolean } = {},
      ) => {
        const y = doc.y;
        doc.fontSize(9).font(opts.bold ? 'Helvetica-Bold' : 'Helvetica');
        values.forEach((v, i) => {
          doc.text(String(v ?? ''), startX + i * colWidth, y, {
            width: colWidth - 6,
            ellipsis: true,
          });
        });
        doc.moveDown(0.6);
      };

      drawRow(
        report.columns.map((c) => c.label),
        { bold: true },
      );
      doc
        .moveTo(startX, doc.y - 2)
        .lineTo(startX + pageWidth, doc.y - 2)
        .strokeColor('#ccc')
        .stroke();
      doc.moveDown(0.2);

      for (const row of report.rows) {
        if (doc.y > doc.page.height - doc.page.margins.bottom - 20) {
          doc.addPage();
        }
        drawRow(report.columns.map((c) => row[c.key]));
      }

      doc.end();
    });
  }
}
