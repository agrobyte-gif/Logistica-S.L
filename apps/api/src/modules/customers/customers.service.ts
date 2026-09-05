import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditAction } from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  paginate,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(companyId: string, userId: string, dto: CreateCustomerDto) {
    await this.assertRutFree(companyId, dto.rut);
    const customer = await this.prisma.customer.create({
      data: {
        companyId,
        rut: dto.rut,
        razonSocial: dto.razonSocial,
        nombreComercial: dto.nombreComercial,
        tipoCliente: dto.tipoCliente,
        condicionPago: dto.condicionPago,
        creditoHabilitado: dto.creditoHabilitado ?? false,
        limiteCredito: dto.limiteCredito ?? 0,
        priceListId: dto.priceListId,
        vendedorId: dto.vendedorId,
        createdById: userId,
      },
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Customer',
      entityId: customer.id,
      stateAfter: customer,
    });
    return customer;
  }

  async findAll(companyId: string, query: PaginationQueryDto) {
    const where: Prisma.CustomerWhereInput = {
      companyId,
      ...(query.q
        ? {
            OR: [
              { razonSocial: { contains: query.q, mode: 'insensitive' } },
              { nombreComercial: { contains: query.q, mode: 'insensitive' } },
              { rut: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { razonSocial: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.customer.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(companyId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
      include: { addresses: true, contacts: true },
    });
    if (!customer) throw new NotFoundException('Cliente no encontrado');
    return customer;
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateCustomerDto,
  ) {
    const before = await this.findOne(companyId, id);
    if (dto.rut && dto.rut !== before.rut) {
      await this.assertRutFree(companyId, dto.rut);
    }
    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...dto,
        limiteCredito: dto.limiteCredito,
      },
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Customer',
      entityId: id,
      stateBefore: before,
      stateAfter: updated,
    });
    return updated;
  }

  private async assertRutFree(companyId: string, rut: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { companyId, rut },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Ya existe un cliente con ese RUT en la empresa',
      );
    }
  }
}
