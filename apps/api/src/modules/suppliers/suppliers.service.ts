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
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(companyId: string, userId: string, dto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findFirst({
      where: { companyId, rut: dto.rut },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe un proveedor con ese RUT');
    }
    const supplier = await this.prisma.supplier.create({
      data: { companyId, createdById: userId, ...dto },
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Supplier',
      entityId: supplier.id,
      stateAfter: supplier,
    });
    return supplier;
  }

  async findAll(companyId: string, query: PaginationQueryDto) {
    const where: Prisma.SupplierWhereInput = {
      companyId,
      ...(query.q
        ? {
            OR: [
              { razonSocial: { contains: query.q, mode: 'insensitive' } },
              { rut: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,
        orderBy: { razonSocial: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(companyId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId },
    });
    if (!supplier) throw new NotFoundException('Proveedor no encontrado');
    return supplier;
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateSupplierDto,
  ) {
    const before = await this.findOne(companyId, id);
    if (dto.rut && dto.rut !== before.rut) {
      const dup = await this.prisma.supplier.findFirst({
        where: { companyId, rut: dto.rut },
        select: { id: true },
      });
      if (dup) throw new ConflictException('Ya existe un proveedor con ese RUT');
    }
    const updated = await this.prisma.supplier.update({
      where: { id },
      data: dto,
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Supplier',
      entityId: id,
      stateBefore: before,
      stateAfter: updated,
    });
    return updated;
  }
}
