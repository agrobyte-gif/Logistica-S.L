import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, QualityResult } from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateQualityCheckDto } from './dto/quality.dto';

@Injectable()
export class QualityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Registra un control de calidad para un pedido (prompt §18). Append-only. */
  async create(companyId: string, userId: string, dto: CreateQualityCheckDto) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id: dto.salesOrderId, companyId },
      select: { id: true, numero: true },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    if (dto.pickingId) {
      const picking = await this.prisma.picking.findFirst({
        where: { id: dto.pickingId, companyId, salesOrderId: order.id },
        select: { id: true },
      });
      if (!picking) {
        throw new BadRequestException('El picking no corresponde al pedido');
      }
    }

    const check = await this.prisma.qualityCheck.create({
      data: {
        companyId,
        salesOrderId: order.id,
        pickingId: dto.pickingId,
        resultado: dto.resultado,
        cantidadOk: dto.cantidadOk ?? true,
        calidadOk: dto.calidadOk ?? true,
        embalajeOk: dto.embalajeOk ?? true,
        temperaturaOk: dto.temperaturaOk,
        observaciones: dto.observaciones,
        revisadoPor: userId,
      },
    });

    await this.audit.record({
      companyId,
      userId,
      action: AuditAction.QUALITY_CHECK_RECORDED,
      entityType: 'SalesOrder',
      entityId: order.id,
      relatedDocument: order.numero,
      stateAfter: { resultado: dto.resultado },
      notes: dto.observaciones,
    });

    return check;
  }

  /** Controles de un pedido, del más reciente al más antiguo. */
  async listForOrder(companyId: string, salesOrderId: string) {
    return this.prisma.qualityCheck.findMany({
      where: { companyId, salesOrderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Último resultado de calidad de un pedido, o null si no hay controles. */
  async latestResult(
    companyId: string,
    salesOrderId: string,
  ): Promise<QualityResult | null> {
    const last = await this.prisma.qualityCheck.findFirst({
      where: { companyId, salesOrderId },
      orderBy: { createdAt: 'desc' },
      select: { resultado: true },
    });
    return (last?.resultado as QualityResult) ?? null;
  }
}
