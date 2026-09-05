import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PurchaseRequestStatus } from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  paginate,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class PurchasingService {
  constructor(private readonly prisma: PrismaService) {}

  async findRequests(
    companyId: string,
    query: PaginationQueryDto,
    estado?: PurchaseRequestStatus,
  ) {
    const where: Prisma.PurchaseRequestWhereInput = {
      companyId,
      ...(estado ? { estado } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          product: { select: { id: true, sku: true, nombre: true } },
          salesOrder: { select: { id: true, numero: true } },
        },
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }
}
