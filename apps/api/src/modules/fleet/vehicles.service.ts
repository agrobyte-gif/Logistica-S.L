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
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(companyId: string, userId: string, dto: CreateVehicleDto) {
    const existing = await this.prisma.vehicle.findFirst({
      where: { companyId, patente: dto.patente },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Ya existe un vehículo con esa patente');
    }
    const vehicle = await this.prisma.vehicle.create({
      data: { companyId, ...dto },
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Vehicle',
      entityId: vehicle.id,
      stateAfter: vehicle,
    });
    return vehicle;
  }

  async findAll(companyId: string, query: PaginationQueryDto) {
    const where: Prisma.VehicleWhereInput = {
      companyId,
      ...(query.q
        ? {
            OR: [
              { patente: { contains: query.q, mode: 'insensitive' } },
              { marca: { contains: query.q, mode: 'insensitive' } },
              { tipo: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        orderBy: { patente: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.vehicle.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(companyId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, companyId },
    });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
    return vehicle;
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateVehicleDto,
  ) {
    const before = await this.findOne(companyId, id);
    if (dto.patente && dto.patente !== before.patente) {
      const dup = await this.prisma.vehicle.findFirst({
        where: { companyId, patente: dto.patente },
        select: { id: true },
      });
      if (dup) {
        throw new ConflictException('Ya existe un vehículo con esa patente');
      }
    }
    const updated = await this.prisma.vehicle.update({
      where: { id },
      data: dto,
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Vehicle',
      entityId: id,
      stateBefore: before,
      stateAfter: updated,
    });
    return updated;
  }
}
