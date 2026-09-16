import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CashMovementType, CashRegisterStatus } from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CashMovementDto, OpenCashDto } from './dto/cash.dto';

@Injectable()
export class CashService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async open(companyId: string, userId: string, dto: OpenCashDto) {
    const saldo = dto.saldoInicial ?? 0;
    const register = await this.prisma.cashRegister.create({
      data: {
        companyId,
        nombre: dto.nombre,
        responsableId: dto.responsableId ?? userId,
        saldoInicial: saldo,
        saldoActual: saldo,
      },
    });
    await this.audit.record({
      companyId,
      userId,
      action: 'CREATE',
      entityType: 'CashRegister',
      entityId: register.id,
      notes: `Apertura de caja "${dto.nombre}" con saldo ${saldo}`,
    });
    return register;
  }

  list(companyId: string) {
    return this.prisma.cashRegister.findMany({
      where: { companyId },
      orderBy: { abiertaAt: 'desc' },
    });
  }

  async findOne(companyId: string, id: string) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { id, companyId },
      include: { movements: { orderBy: { createdAt: 'desc' } } },
    });
    if (!register) throw new NotFoundException('Caja no encontrada');
    return register;
  }

  /** Registra un ingreso/egreso y afecta el saldo en la misma transacción. */
  async addMovement(
    companyId: string,
    userId: string,
    registerId: string,
    dto: CashMovementDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const register = await tx.cashRegister.findFirst({
        where: { id: registerId, companyId },
      });
      if (!register) throw new NotFoundException('Caja no encontrada');
      if (register.estado !== CashRegisterStatus.ABIERTA) {
        throw new BadRequestException('La caja está cerrada');
      }

      const delta =
        dto.tipo === CashMovementType.INGRESO ? dto.monto : -dto.monto;
      const nuevoSaldo = Number(register.saldoActual) + delta;
      if (nuevoSaldo < 0) {
        throw new BadRequestException(
          'El egreso deja la caja en saldo negativo',
        );
      }

      const movement = await tx.cashMovement.create({
        data: {
          cashRegisterId: registerId,
          tipo: dto.tipo,
          monto: dto.monto,
          categoria: dto.categoria,
          descripcion: dto.descripcion,
          comprobanteUrl: dto.comprobanteUrl,
          usuarioId: userId,
        },
      });
      await tx.cashRegister.update({
        where: { id: registerId },
        data: { saldoActual: nuevoSaldo },
      });
      await this.audit.recordWithTx(tx, {
        companyId,
        userId,
        action: 'CREATE',
        entityType: 'CashMovement',
        entityId: movement.id,
        notes: `${dto.tipo} ${dto.monto} (${dto.categoria ?? 's/categoría'})`,
      });
      return movement;
    });
  }

  async close(companyId: string, userId: string, registerId: string) {
    const register = await this.prisma.cashRegister.findFirst({
      where: { id: registerId, companyId },
    });
    if (!register) throw new NotFoundException('Caja no encontrada');
    if (register.estado === CashRegisterStatus.CERRADA) {
      throw new BadRequestException('La caja ya está cerrada');
    }
    const updated = await this.prisma.cashRegister.update({
      where: { id: registerId },
      data: { estado: CashRegisterStatus.CERRADA, cerradaAt: new Date() },
    });
    await this.audit.record({
      companyId,
      userId,
      action: 'UPDATE',
      entityType: 'CashRegister',
      entityId: registerId,
      notes: `Cierre de caja con saldo ${register.saldoActual}`,
    });
    return updated;
  }

  /** Gastos por categoría de una caja (prompt §24). */
  async summaryByCategory(companyId: string, registerId: string) {
    await this.findOne(companyId, registerId); // valida pertenencia
    const rows = await this.prisma.cashMovement.groupBy({
      by: ['categoria', 'tipo'],
      where: { cashRegisterId: registerId },
      _sum: { monto: true },
    });
    return rows.map((r) => ({
      categoria: r.categoria ?? 'Sin categoría',
      tipo: r.tipo,
      total: Number(r._sum.monto ?? 0),
    }));
  }
}
