import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { authenticator } from 'otplib';
import { AuditAction } from '@agrogood/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { UsersService } from '../users/users.service';
import { JwtPayload } from '../../common/auth/auth.types';
import { LoginDto } from './dto/login.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface LoginResult extends TokenPair {
  user: {
    id: string;
    nombre: string;
    email: string;
    companyId: string;
    roles: string[];
    permissions: string[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  /** Autentica y emite el par de tokens. */
  async login(dto: LoginDto, ip?: string): Promise<LoginResult> {
    const user = await this.users.findForAuthByEmail(
      dto.companyRut,
      dto.email,
    );

    // Mensaje genérico: no revelar si el email existe (evita enumeración).
    const invalid = () =>
      new UnauthorizedException('Credenciales inválidas');

    if (!user || user.estado !== 'ACTIVO') {
      await this.audit.record({
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        notes: `Login fallido para ${dto.email} (${dto.companyRut})`,
        ipAddress: ip,
      });
      throw invalid();
    }

    const passwordOk = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordOk) {
      await this.audit.record({
        companyId: user.companyId,
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        entityId: user.id,
        notes: 'Contraseña incorrecta',
        ipAddress: ip,
      });
      throw invalid();
    }

    // 2FA opcional.
    if (user.twoFactorEnabled) {
      if (!dto.totp || !user.twoFactorSecret) {
        throw new UnauthorizedException('Se requiere código 2FA');
      }
      const totpOk = authenticator.verify({
        token: dto.totp,
        secret: user.twoFactorSecret,
      });
      if (!totpOk) {
        throw new UnauthorizedException('Código 2FA inválido');
      }
    }

    const { roles, permissions } = this.users.extractAccess(user);
    const tokens = await this.issueTokens(
      user.id,
      user.companyId,
      roles,
      permissions,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.record({
      companyId: user.companyId,
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
      ipAddress: ip,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        companyId: user.companyId,
        roles,
        permissions,
      },
    };
  }

  /** Rota el refresh token: valida el anterior, lo revoca y emite uno nuevo. */
  async refresh(rawRefreshToken: string): Promise<TokenPair> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Falta el refresh token');
    }
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const user = await this.users.findByIdWithAccess(stored.userId);
    if (!user || user.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Usuario no disponible');
    }

    // Rotación: revoca el token usado antes de emitir el nuevo.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const { roles, permissions } = this.users.extractAccess(user);
    return this.issueTokens(user.id, user.companyId, roles, permissions);
  }

  /** Cierra sesión revocando el refresh token entregado. */
  async logout(rawRefreshToken: string | undefined, userId?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    if (userId) {
      await this.audit.record({
        userId,
        action: AuditAction.LOGOUT,
        entityType: 'User',
        entityId: userId,
      });
    }
  }

  /**
   * Genera un token de recuperación. Devuelve el token EN CLARO para que la
   * capa de notificación lo envíe (en Fase 5 vía email); nunca se persiste en
   * claro. Responde igual exista o no el usuario (evita enumeración).
   */
  async requestPasswordReset(
    companyRut: string,
    email: string,
  ): Promise<{ token: string | null }> {
    const user = await this.users.findForAuthByEmail(companyRut, email);
    if (!user) {
      return { token: null };
    }
    const raw = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(raw);
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
      },
    });
    await this.audit.record({
      companyId: user.companyId,
      userId: user.id,
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      entityType: 'User',
      entityId: user.id,
    });
    return { token: raw };
  }

  /** Aplica el cambio de contraseña usando el token de recuperación. */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash },
    });
    if (
      !record ||
      record.usedAt ||
      record.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Token de recuperación inválido o expirado');
    }

    const passwordHash = await argon2.hash(newPassword, {
      type: argon2.argon2id,
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      // Revoca todas las sesiones activas tras cambiar la contraseña.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      userId: record.userId,
      action: AuditAction.PASSWORD_RESET_COMPLETED,
      entityType: 'User',
      entityId: record.userId,
    });
  }

  // --- Helpers internos ---

  private async issueTokens(
    userId: string,
    companyId: string,
    roles: string[],
    permissions: string[],
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, companyId, roles, permissions };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: (this.config.get<string>('jwt.accessTtl') ??
        '15m') as JwtSignOptions['expiresIn'],
    });

    // El refresh token es un valor opaco aleatorio (no un JWT): se guarda su
    // hash y así puede revocarse en servidor.
    const rawRefresh = `${randomUUID()}.${randomBytes(48).toString('hex')}`;
    const refreshTtlMs = this.parseTtlMs(
      this.config.get<string>('jwt.refreshTtl') ?? '7d',
    );
    const refreshExpiresAt = new Date(Date.now() + refreshTtlMs);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawRefresh),
        expiresAt: refreshExpiresAt,
      },
    });

    return { accessToken, refreshToken: rawRefresh, refreshExpiresAt };
  }

  /** Hash determinístico (SHA-256) para poder buscar el token por igualdad. */
  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  /** Convierte "15m" / "7d" / "3600s" a milisegundos. */
  private parseTtlMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl.trim());
    if (!match) {
      const asNumber = Number(ttl);
      return Number.isFinite(asNumber) ? asNumber * 1000 : 7 * 86400_000;
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const factor = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
    return value * factor;
  }
}
