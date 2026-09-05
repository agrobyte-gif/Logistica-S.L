import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  companyId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  stateBefore?: unknown;
  stateAfter?: unknown;
  relatedDocument?: string | null;
  ipAddress?: string | null;
  notes?: string | null;
}

/**
 * Registro de auditoría. Solo escribe (append-only): no expone update/delete.
 * Nunca debe hacer fallar la operación de negocio: si la auditoría falla, se
 * loguea el error pero no se lanza (la transacción de negocio ya validó sus
 * propias reglas). Para acciones donde la auditoría es parte atómica de la
 * operación, pásese el `tx` de Prisma vía `recordWithTx`.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: this.toData(entry) });
    } catch (err) {
      // No propagar: la auditoría no debe tumbar la operación principal.
      // eslint-disable-next-line no-console
      console.error('[audit] no se pudo registrar la acción', entry.action, err);
    }
  }

  /**
   * Registro dentro de una transacción existente (auditoría atómica con el
   * cambio de negocio). Aquí SÍ se propaga el error para abortar la transacción.
   */
  async recordWithTx(
    tx: { auditLog: { create: (args: { data: ReturnType<AuditService['toData']> }) => Promise<unknown> } },
    entry: AuditEntry,
  ): Promise<void> {
    await tx.auditLog.create({ data: this.toData(entry) });
  }

  private toData(entry: AuditEntry) {
    return {
      companyId: entry.companyId ?? null,
      userId: entry.userId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      stateBefore: (entry.stateBefore ?? undefined) as never,
      stateAfter: (entry.stateAfter ?? undefined) as never,
      relatedDocument: entry.relatedDocument ?? null,
      ipAddress: entry.ipAddress ?? null,
      notes: entry.notes ?? null,
    };
  }
}
