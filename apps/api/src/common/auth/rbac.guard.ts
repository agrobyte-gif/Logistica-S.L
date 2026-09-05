import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, RoleName } from '@agrogood/shared';
import { AuthUser } from './auth.types';
import { PERMISSIONS_KEY, ROLES_KEY } from './decorators';

/**
 * Autorización RBAC. Se ejecuta después de JwtAuthGuard.
 * - @Roles(...)  → el usuario debe tener al menos uno de los roles.
 * - @RequirePermissions(...) → el usuario debe tener TODOS los permisos.
 * El ADMINISTRADOR pasa siempre (acceso completo, prompt §6).
 */
@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPerms = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length && !requiredPerms?.length) {
      return true; // sin restricciones adicionales de rol/permiso
    }

    const user = context.switchToHttp().getRequest().user as
      | AuthUser
      | undefined;
    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    // Acceso completo del administrador.
    if (user.roles.includes(RoleName.ADMINISTRADOR)) {
      return true;
    }

    if (requiredRoles?.length) {
      const ok = requiredRoles.some((r) => user.roles.includes(r));
      if (!ok) {
        throw new ForbiddenException('Rol insuficiente para esta acción');
      }
    }

    if (requiredPerms?.length) {
      const ok = requiredPerms.every((p) => user.permissions.includes(p));
      if (!ok) {
        throw new ForbiddenException('Permisos insuficientes para esta acción');
      }
    }

    return true;
  }
}
