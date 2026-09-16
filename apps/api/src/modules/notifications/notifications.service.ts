import { Injectable } from '@nestjs/common';
import { NotificationLevel, RoleName } from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  paginate,
  PaginationQueryDto,
} from '../../common/dto/pagination.dto';

export interface NotifyPayload {
  nivel?: NotificationLevel;
  titulo: string;
  cuerpo?: string;
  tipo?: string;
  entityType?: string;
  entityId?: string;
}

/**
 * Notificaciones in-app dirigidas por usuario (prompt §28-29).
 * Nota: el push a móvil (FCM) y el tiempo real (WebSocket) se conectan cuando
 * se decida la infra; aquí queda la fuente de verdad persistida.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Notifica a un usuario concreto. */
  async notifyUser(
    companyId: string,
    userId: string,
    p: NotifyPayload,
  ): Promise<void> {
    await this.prisma.notification.create({
      data: {
        companyId,
        userId,
        nivel: p.nivel ?? NotificationLevel.INFO,
        titulo: p.titulo,
        cuerpo: p.cuerpo,
        tipo: p.tipo,
        entityType: p.entityType,
        entityId: p.entityId,
      },
    });
  }

  /**
   * Notifica a todos los usuarios activos con un rol dado (§29). Best-effort:
   * si no hay destinatarios no falla.
   */
  async notifyRole(
    companyId: string,
    role: RoleName,
    p: NotifyPayload,
  ): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: {
        companyId,
        estado: 'ACTIVO',
        userRoles: { some: { role: { nombre: role } } },
      },
      select: { id: true },
    });
    if (users.length === 0) return;
    await this.prisma.notification.createMany({
      data: users.map((u) => ({
        companyId,
        userId: u.id,
        nivel: p.nivel ?? NotificationLevel.INFO,
        titulo: p.titulo,
        cuerpo: p.cuerpo,
        tipo: p.tipo,
        entityType: p.entityType,
        entityId: p.entityId,
      })),
    });
  }

  async listMine(companyId: string, userId: string, query: PaginationQueryDto) {
    const where = { companyId, userId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return paginate(data, total, query.page, query.pageSize);
  }

  async unreadCount(companyId: string, userId: string) {
    const count = await this.prisma.notification.count({
      where: { companyId, userId, leidaAt: null },
    });
    return { count };
  }

  async markRead(companyId: string, userId: string, id: string) {
    await this.prisma.notification.updateMany({
      where: { id, companyId, userId, leidaAt: null },
      data: { leidaAt: new Date() },
    });
    return { ok: true };
  }

  async markAllRead(companyId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { companyId, userId, leidaAt: null },
      data: { leidaAt: new Date() },
    });
    return { ok: true };
  }
}
