import {
  BadRequestException,
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
import { CreateDriverDto, UpdateDriverDto } from './dto/driver.dto';

@Injectable()
export class DriversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(companyId: string, userId: string, dto: CreateDriverDto) {
    await this.assertUser(companyId, dto.userId);
    const driver = await this.prisma.driver.create({
      data: { companyId, ...dto },
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.CREATE,
      entityType: 'Driver',
      entityId: driver.id,
      stateAfter: driver,
    });
    return driver;
  }

  async findAll(companyId: string, query: PaginationQueryDto) {
    const where: Prisma.DriverWhereInput = {
      companyId,
      ...(query.q
        ? {
            OR: [
              { nombre: { contains: query.q, mode: 'insensitive' } },
              { telefono: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.driver.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.driver.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async findOne(companyId: string, id: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id, companyId },
    });
    if (!driver) throw new NotFoundException('Conductor no encontrado');
    return driver;
  }

  async update(
    companyId: string,
    userId: string,
    id: string,
    dto: UpdateDriverDto,
  ) {
    const before = await this.findOne(companyId, id);
    if (dto.userId) await this.assertUser(companyId, dto.userId);
    const updated = await this.prisma.driver.update({
      where: { id },
      data: dto,
    });
    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.UPDATE,
      entityType: 'Driver',
      entityId: id,
      stateBefore: before,
      stateAfter: updated,
    });
    return updated;
  }

  /** El usuario enlazado debe pertenecer a la misma empresa. */
  private async assertUser(companyId: string, userId?: string) {
    if (!userId) return;
    const user = await this.prisma.user.findFirst({
      where: { id: userId, companyId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Usuario no válido para la empresa');
  }
}
