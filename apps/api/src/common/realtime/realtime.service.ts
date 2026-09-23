import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

/**
 * Fachada para emitir eventos en tiempo real desde cualquier módulo, sin
 * acoplarlos al gateway. No falla si el servidor aún no está listo.
 */
@Injectable()
export class RealtimeService {
  constructor(private readonly gateway: RealtimeGateway) {}

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.gateway.server?.to(`user:${userId}`).emit(event, payload);
  }

  emitToCompany(companyId: string, event: string, payload: unknown): void {
    this.gateway.server?.to(`company:${companyId}`).emit(event, payload);
  }
}
