import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Cliente Prisma o cliente de transacción interactiva. */
type Db = PrismaService | Prisma.TransactionClient;

/**
 * Numeración atómica de documentos por empresa/tipo/año (auditoría B3).
 * Usa un UPSERT con incremento atómico en la base para evitar folios
 * duplicados bajo concurrencia. Debe invocarse dentro de la MISMA transacción
 * que crea el documento.
 */
@Injectable()
export class SequenceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Devuelve el siguiente número formateado, p. ej. `PED-2026-000001`.
   * @param prefix prefijo del documento (PED, OC, …)
   * @param tipo   clave de secuencia (normalmente igual al prefijo)
   */
  async next(
    db: Db,
    companyId: string,
    prefix: string,
    tipo = prefix,
    anio = new Date().getFullYear(),
  ): Promise<string> {
    // INSERT ... ON CONFLICT DO UPDATE ... RETURNING garantiza atomicidad.
    const rows = await db.$queryRaw<{ ultimo: number }[]>`
      INSERT INTO document_sequences (id, company_id, tipo, anio, ultimo)
      VALUES (gen_random_uuid(), ${companyId}, ${tipo}, ${anio}, 1)
      ON CONFLICT (company_id, tipo, anio)
      DO UPDATE SET ultimo = document_sequences.ultimo + 1
      RETURNING ultimo
    `;
    const ultimo = rows[0]?.ultimo ?? 1;
    const correlativo = String(ultimo).padStart(6, '0');
    return `${prefix}-${anio}-${correlativo}`;
  }
}
