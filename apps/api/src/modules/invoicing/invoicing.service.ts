import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  computeDocumentStatus,
  computeTax,
  DocumentStatus,
} from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  paginate,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import { CreateInvoiceDto, RegisterPaymentDto } from './dto/invoice.dto';

@Injectable()
export class InvoicingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Registra un DTE ya emitido en el portal del SII (ADR-007). */
  async create(companyId: string, userId: string, dto: CreateInvoiceDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    const { neto, iva, total } = computeTax(dto.neto, dto.ivaAfecto ?? true);

    try {
      const invoice = await this.prisma.invoice.create({
        data: {
          companyId,
          customerId: dto.customerId,
          salesOrderId: dto.salesOrderId,
          tipoDte: dto.tipoDte,
          folio: dto.folio,
          neto,
          iva,
          total,
          fechaVencim: dto.fechaVencim ? new Date(dto.fechaVencim) : undefined,
          xmlUrl: dto.xmlUrl,
          pdfUrl: dto.pdfUrl,
          createdById: userId,
        },
      });
      await this.audit.record({
        companyId,
        userId,
        action: 'CREATE',
        entityType: 'Invoice',
        entityId: invoice.id,
        relatedDocument: `${dto.tipoDte} ${dto.folio}`,
        stateAfter: { total, estado: invoice.estado },
      });
      return invoice;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Ya existe un documento con ese tipo y folio',
        );
      }
      throw e;
    }
  }

  async findAll(
    companyId: string,
    query: PaginationQueryDto,
    estado?: DocumentStatus,
  ) {
    const where: Prisma.InvoiceWhereInput = {
      companyId,
      ...(estado ? { estado } : {}),
      ...(query.q ? { folio: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        orderBy: { fechaEmision: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { customer: { select: { razonSocial: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(companyId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: {
        customer: true,
        payments: { orderBy: { fecha: 'desc' } },
        salesOrder: { select: { numero: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Documento no encontrado');
    return invoice;
  }

  /** Registra un pago/abono y actualiza saldo + estado del documento. */
  async registerPayment(
    companyId: string,
    userId: string,
    invoiceId: string,
    dto: RegisterPaymentDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, companyId },
      });
      if (!invoice) throw new NotFoundException('Documento no encontrado');
      if (invoice.estado === DocumentStatus.ANULADA) {
        throw new BadRequestException('El documento está anulado');
      }
      const saldo = Number(invoice.total) - Number(invoice.pagado);
      if (dto.monto > saldo) {
        throw new BadRequestException(
          `El abono (${dto.monto}) excede el saldo pendiente (${saldo})`,
        );
      }

      const payment = await tx.payment.create({
        data: {
          companyId,
          invoiceId,
          monto: dto.monto,
          medio: dto.medio,
          fecha: dto.fecha ? new Date(dto.fecha) : undefined,
          registradoPor: userId,
        },
      });
      const nuevoPagado = Number(invoice.pagado) + dto.monto;
      const nuevoEstado = computeDocumentStatus(
        Number(invoice.total),
        nuevoPagado,
      );
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { pagado: nuevoPagado, estado: nuevoEstado },
      });
      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: 'CREATE',
        entityType: 'Payment',
        entityId: payment.id,
        relatedDocument: `${invoice.tipoDte} ${invoice.folio}`,
        notes: `Abono ${dto.monto}; documento → ${nuevoEstado}`,
      });
      return payment;
    });
  }

  async voidInvoice(companyId: string, userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
    });
    if (!invoice) throw new NotFoundException('Documento no encontrado');
    if (Number(invoice.pagado) > 0) {
      throw new BadRequestException(
        'No se puede anular un documento con pagos registrados',
      );
    }
    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { estado: DocumentStatus.ANULADA },
    });
    await this.audit.record({
      companyId,
      userId,
      action: 'UPDATE',
      entityType: 'Invoice',
      entityId: invoiceId,
      notes: 'Documento anulado',
    });
    return updated;
  }
}
