/**
 * Contratos compartidos entre API, web y móvil.
 * Única fuente de verdad para roles, permisos y enums transversales.
 */

/** Roles del sistema (prompt maestro §6). */
export enum RoleName {
  ADMINISTRADOR = 'ADMINISTRADOR',
  GERENTE = 'GERENTE',
  JEFE_OPERACIONES = 'JEFE_OPERACIONES',
  ENCARGADO_COMPRAS = 'ENCARGADO_COMPRAS',
  BODEGUERO = 'BODEGUERO',
  PICKER = 'PICKER',
  DESPACHADOR = 'DESPACHADOR',
  CONDUCTOR = 'CONDUCTOR',
  ADMINISTRACION = 'ADMINISTRACION',
}

/**
 * Permisos granulares con formato `recurso:accion`.
 * En Fase 1 se declaran los del núcleo de identidad/seguridad; cada fase
 * agregará los suyos (sales_order:create, inventory_movement:read, etc.).
 */
export enum Permission {
  // Usuarios
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DEACTIVATE = 'user:deactivate',

  // Roles y permisos
  ROLE_READ = 'role:read',
  ROLE_MANAGE = 'role:manage',

  // Empresas / bodegas
  COMPANY_READ = 'company:read',
  COMPANY_MANAGE = 'company:manage',
  WAREHOUSE_READ = 'warehouse:read',
  WAREHOUSE_MANAGE = 'warehouse:manage',

  // Auditoría (solo lectura; nunca escritura/borrado)
  AUDIT_READ = 'audit:read',

  // Dashboard
  DASHBOARD_VIEW = 'dashboard:view',
}

/** Estado genérico de entidades. */
export enum EntityStatus {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

/**
 * Mapa rol → permisos por defecto (Fase 1).
 * Se persiste en la BD mediante el seed; esta constante es la referencia
 * canónica compartida por el frontend para ocultar/mostrar acciones.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  [RoleName.ADMINISTRADOR]: Object.values(Permission),
  [RoleName.GERENTE]: [
    Permission.DASHBOARD_VIEW,
    Permission.USER_READ,
    Permission.ROLE_READ,
    Permission.COMPANY_READ,
    Permission.WAREHOUSE_READ,
    Permission.AUDIT_READ,
  ],
  [RoleName.JEFE_OPERACIONES]: [
    Permission.DASHBOARD_VIEW,
    Permission.USER_READ,
    Permission.WAREHOUSE_READ,
  ],
  [RoleName.ENCARGADO_COMPRAS]: [Permission.DASHBOARD_VIEW],
  [RoleName.BODEGUERO]: [Permission.DASHBOARD_VIEW, Permission.WAREHOUSE_READ],
  [RoleName.PICKER]: [Permission.DASHBOARD_VIEW],
  [RoleName.DESPACHADOR]: [Permission.DASHBOARD_VIEW],
  [RoleName.CONDUCTOR]: [Permission.DASHBOARD_VIEW],
  [RoleName.ADMINISTRACION]: [
    Permission.DASHBOARD_VIEW,
    Permission.USER_READ,
    Permission.AUDIT_READ,
  ],
};

/** Acciones auditables (prompt §30). Se ampliará por fase. */
export enum AuditAction {
  LOGIN = 'LOGIN',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DEACTIVATE = 'DEACTIVATE',
}
