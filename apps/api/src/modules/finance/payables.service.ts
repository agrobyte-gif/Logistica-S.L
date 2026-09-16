import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { computeDocumentStatus, computeTax, DocumentStatus } from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  paginate,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import {
  CreateSupplierInvoiceDto,
  RegisterSupplierPaymentDto,
} from './dto/supplier-invoice.dto';

/** Cuentas por Pagar: facturas de proveedor y sus pagos. */
@Injectable()
export class PayablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(companyId: string, userId: string, dto: CreateSupplierInvoiceDto) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, companyId },
      select: { id: true },
    });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    const { neto, iva, total } = computeTax(dto.neto, dto.ivaAfecto ?? true);

    try {
      const inv = await this.prisma.supplierInvoice.create({
        data: {
          companyId,
          supplierId: dto.supplierId,
          purchaseOrderId: dto.purchaseOrderId,
          folio: dto.folio,
          neto,
          iva,
          total,
          fechaVencim: dto.fechaVencim ? new Date(dto.fechaVencim) : undefined,
          createdById: userId,
        },
      });
      await this.audit.record({
        companyId,
        userId,
        action: 'CREATE',
        entityType: 'SupplierInvoice',
        entityId: inv.id,
        relatedDocument: dto.folio,
        stateAfter: { total },
      });
      return inv;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una factura con ese folio para el proveedor');
      }
      throw e;
    }
  }

  async findAll(
    companyId: string,
    query: PaginationQueryDto,
    estado?: DocumentStatus,
  ) {
    const where: Prisma.SupplierInvoiceWhereInput = {
      companyId,
      ...(estado ? { estado } : {}),
      ...(query.q ? { folio: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplierInvoice.findMany({
        where,
        orderBy: { fechaEmision: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { supplier: { select: { razonSocial: true } } },
      }),
      this.prisma.supplierInvoice.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async registerPayment(
    companyId: string,
    userId: string,
    id: string,
    dto: RegisterSupplierPaymentDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const inv = await tx.supplierInvoice.findFirst({
        where: { id, companyId },
      });
      if (!inv) throw new NotFoundException('Factura no encontrada');
      const saldo = Number(inv.total) - Number(inv.pagado);
      if (dto.monto > saldo) {
        throw new BadRequestException(
          `El pago (${dto.monto}) excede el saldo pendiente (${saldo})`,
        );
      }
      const payment = await tx.supplierPayment.create({
        data: {
          companyId,
          supplierInvoiceId: id,
          monto: dto.monto,
          medio: dto.medio,
          fecha: dto.fecha ? new Date(dto.fecha) : undefined,
          registradoPor: userId,
        },
      });
      const nuevoPagado = Number(inv.pagado) + dto.monto;
      const nuevoEstado = computeDocumentStatus(Number(inv.total), nuevoPagado);
      await tx.supplierInvoice.update({
        where: { id },
        data: { pagado: nuevoPagado, estado: nuevoEstado },
      });
      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: 'CREATE',
        entityType: 'SupplierPayment',
        entityId: payment.id,
        relatedDocument: inv.folio,
        notes: `Pago ${dto.monto}; factura → ${nuevoEstado}`,
      });
      return payment;
    });
  }
}
