import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Lectura de usuarios y de sus roles/permisos efectivos.
 * (La creación/gestión de usuarios se amplía en fases posteriores.)
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Usuario por email dentro de una empresa (para login). Incluye hash. */
  findForAuthByEmail(companyRut: string, email: string) {
    return this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        company: { rut: companyRut },
      },
      include: this.rolesInclude(),
    });
  }

  /** Usuario por id con roles y permisos (para refrescar el token). */
  findByIdWithAccess(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: this.rolesInclude(),
    });
  }

  /**
   * Aplana los permisos efectivos de un usuario a partir de sus roles.
   * Devuelve nombres de rol y claves de permiso deduplicadas.
   */
  extractAccess(user: {
    userRoles: {
      role: { nombre: string; rolePermissions: { permission: { clave: string } }[] };
    }[];
  }): { roles: string[]; permissions: string[] } {
    const roles = user.userRoles.map((ur) => ur.role.nombre);
    const permissions = [
      ...new Set(
        user.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.clave),
        ),
      ),
    ];
    return { roles, permissions };
  }

  private rolesInclude() {
    return {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: { include: { permission: true } },
            },
          },
        },
      },
    } as const;
  }
}
