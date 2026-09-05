import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, RoleName } from '@agrogood/shared';
import { RbacGuard } from './rbac.guard';
import { AuthUser } from './auth.types';
import { PERMISSIONS_KEY, ROLES_KEY } from './decorators';

function makeContext(user?: AuthUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

/** Reflector falso que responde según la clave solicitada. */
function makeReflector(
  roles?: RoleName[],
  perms?: Permission[],
): Reflector {
  return {
    getAllAndOverride: (key: string) =>
      key === ROLES_KEY ? roles : key === PERMISSIONS_KEY ? perms : undefined,
  } as unknown as Reflector;
}

describe('RbacGuard', () => {
  const baseUser: AuthUser = {
    userId: 'u1',
    companyId: 'c1',
    roles: [RoleName.BODEGUERO],
    permissions: [Permission.WAREHOUSE_READ],
  };

  it('permite cuando no hay restricciones de rol ni permiso', () => {
    const guard = new RbacGuard(makeReflector());
    expect(guard.canActivate(makeContext(baseUser))).toBe(true);
  });

  it('el ADMINISTRADOR siempre pasa', () => {
    const guard = new RbacGuard(
      makeReflector([RoleName.GERENTE], [Permission.USER_CREATE]),
    );
    const admin: AuthUser = {
      ...baseUser,
      roles: [RoleName.ADMINISTRADOR],
      permissions: [],
    };
    expect(guard.canActivate(makeContext(admin))).toBe(true);
  });

  it('permite si el usuario tiene uno de los roles requeridos', () => {
    const guard = new RbacGuard(makeReflector([RoleName.BODEGUERO]));
    expect(guard.canActivate(makeContext(baseUser))).toBe(true);
  });

  it('rechaza si falta el rol requerido', () => {
    const guard = new RbacGuard(makeReflector([RoleName.GERENTE]));
    expect(() => guard.canActivate(makeContext(baseUser))).toThrow(
      ForbiddenException,
    );
  });

  it('exige TODOS los permisos requeridos', () => {
    const guard = new RbacGuard(
      makeReflector(undefined, [
        Permission.WAREHOUSE_READ,
        Permission.USER_CREATE,
      ]),
    );
    expect(() => guard.canActivate(makeContext(baseUser))).toThrow(
      ForbiddenException,
    );
  });

  it('permite cuando el usuario tiene todos los permisos', () => {
    const guard = new RbacGuard(
      makeReflector(undefined, [Permission.WAREHOUSE_READ]),
    );
    expect(guard.canActivate(makeContext(baseUser))).toBe(true);
  });

  it('rechaza si no hay usuario autenticado', () => {
    const guard = new RbacGuard(makeReflector([RoleName.BODEGUERO]));
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
