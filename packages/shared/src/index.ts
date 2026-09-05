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

  // --- Fase 2: CRM ---
  CUSTOMER_READ = 'customer:read',
  CUSTOMER_CREATE = 'customer:create',
  CUSTOMER_UPDATE = 'customer:update',

  // --- Fase 2: Productos y precios ---
  PRODUCT_READ = 'product:read',
  PRODUCT_CREATE = 'product:create',
  PRODUCT_UPDATE = 'product:update',
  PRICE_LIST_READ = 'price_list:read',
  PRICE_LIST_MANAGE = 'price_list:manage',

  // --- Fase 2: Proveedores ---
  SUPPLIER_READ = 'supplier:read',
  SUPPLIER_CREATE = 'supplier:create',
  SUPPLIER_UPDATE = 'supplier:update',

  // --- Fase 2: Ventas / pedidos ---
  SALES_ORDER_READ = 'sales_order:read',
  SALES_ORDER_CREATE = 'sales_order:create',
  SALES_ORDER_UPDATE = 'sales_order:update',
  SALES_ORDER_TRANSITION = 'sales_order:transition',
  SALES_ORDER_CANCEL = 'sales_order:cancel',

  // Necesidades de compra (se generan automáticamente; flujo completo en Fase 3)
  PURCHASE_REQUEST_READ = 'purchase_request:read',

  // --- Fase 3: Inventario / WMS ---
  INVENTORY_READ = 'inventory:read',
  INVENTORY_ADJUST = 'inventory:adjust',
  INVENTORY_TRANSFER = 'inventory:transfer',
  INVENTORY_MOVEMENT_READ = 'inventory_movement:read',

  // --- Fase 3: Compras (flujo completo) ---
  PURCHASE_ORDER_READ = 'purchase_order:read',
  PURCHASE_ORDER_CREATE = 'purchase_order:create',
  PURCHASE_ORDER_APPROVE = 'purchase_order:approve',
  GOODS_RECEIPT_READ = 'goods_receipt:read',
  GOODS_RECEIPT_CREATE = 'goods_receipt:create',

  // --- Fase 3: Mermas ---
  WASTE_READ = 'waste:read',
  WASTE_CREATE = 'waste:create',
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
    // Fase 2: acceso de lectura transversal para gerencia.
    Permission.CUSTOMER_READ,
    Permission.PRODUCT_READ,
    Permission.PRICE_LIST_READ,
    Permission.SUPPLIER_READ,
    Permission.SALES_ORDER_READ,
    Permission.PURCHASE_REQUEST_READ,
  ],
  [RoleName.JEFE_OPERACIONES]: [
    Permission.DASHBOARD_VIEW,
    Permission.USER_READ,
    Permission.WAREHOUSE_READ,
    // Fase 2: gestiona pedidos y ve maestros.
    Permission.CUSTOMER_READ,
    Permission.PRODUCT_READ,
    Permission.SALES_ORDER_READ,
    Permission.SALES_ORDER_CREATE,
    Permission.SALES_ORDER_UPDATE,
    Permission.SALES_ORDER_TRANSITION,
    Permission.SALES_ORDER_CANCEL,
    Permission.PURCHASE_REQUEST_READ,
    // Fase 3: aprueba compras e inventario/mermas de lectura.
    Permission.PURCHASE_ORDER_READ,
    Permission.PURCHASE_ORDER_APPROVE,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_MOVEMENT_READ,
    Permission.WASTE_READ,
    Permission.GOODS_RECEIPT_READ,
  ],
  [RoleName.ENCARGADO_COMPRAS]: [
    Permission.DASHBOARD_VIEW,
    Permission.SUPPLIER_READ,
    Permission.SUPPLIER_CREATE,
    Permission.SUPPLIER_UPDATE,
    Permission.PRODUCT_READ,
    Permission.PURCHASE_REQUEST_READ,
    // Fase 3: crea órdenes de compra y ve inventario/recepciones.
    Permission.PURCHASE_ORDER_READ,
    Permission.PURCHASE_ORDER_CREATE,
    Permission.GOODS_RECEIPT_READ,
    Permission.INVENTORY_READ,
    Permission.INVENTORY_MOVEMENT_READ,
  ],
  [RoleName.BODEGUERO]: [
    Permission.DASHBOARD_VIEW,
    Permission.WAREHOUSE_READ,
    Permission.PRODUCT_READ,
    // Fase 3: opera bodega (inventario, recepciones, mermas).
    Permission.INVENTORY_READ,
    Permission.INVENTORY_ADJUST,
    Permission.INVENTORY_TRANSFER,
    Permission.INVENTORY_MOVEMENT_READ,
    Permission.GOODS_RECEIPT_READ,
    Permission.GOODS_RECEIPT_CREATE,
    Permission.PURCHASE_ORDER_READ,
    Permission.WASTE_READ,
    Permission.WASTE_CREATE,
  ],
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
  // Fase 2
  ORDER_STATE_CHANGE = 'ORDER_STATE_CHANGE',
  PURCHASE_REQUEST_CREATED = 'PURCHASE_REQUEST_CREATED',
}

// ==========================================================================
// Fase 2 — Ventas, productos e inventario (contratos compartidos)
// ==========================================================================

/** Unidades de venta (prompt §8). */
export enum ProductUnit {
  UN = 'UN',
  KG = 'KG',
  G = 'G',
  CAJA = 'CAJA',
  SACO = 'SACO',
  MALLA = 'MALLA',
  BANDEJA = 'BANDEJA',
  L = 'L',
  OTRO = 'OTRO',
}

/** Estado de stock de una línea de pedido (prompt §10). */
export enum StockStatus {
  DISPONIBLE = 'DISPONIBLE', // 🟢
  INSUFICIENTE = 'INSUFICIENTE', // 🟡
  SIN_STOCK = 'SIN_STOCK', // 🔴
}

/** Estados del pedido de venta (prompt §9). */
export enum SalesOrderStatus {
  RECIBIDO = 'RECIBIDO',
  VALIDANDO_STOCK = 'VALIDANDO_STOCK',
  CONFIRMADO = 'CONFIRMADO',
  ESPERANDO_COMPRA = 'ESPERANDO_COMPRA',
  EN_PICKING = 'EN_PICKING',
  PICKING_INCOMPLETO = 'PICKING_INCOMPLETO',
  PREPARADO = 'PREPARADO',
  EN_DESPACHO = 'EN_DESPACHO',
  EN_RUTA = 'EN_RUTA',
  ENTREGADO = 'ENTREGADO',
  INCIDENCIA = 'INCIDENCIA',
  CANCELADO = 'CANCELADO',
}

/**
 * Transiciones válidas de la máquina de estados del pedido.
 * Es la única fuente de verdad de qué estado puede seguir a cuál; el backend
 * la valida en cada cambio y audita la transición (auditoría B6).
 */
export const SALES_ORDER_TRANSITIONS: Record<
  SalesOrderStatus,
  SalesOrderStatus[]
> = {
  [SalesOrderStatus.RECIBIDO]: [
    SalesOrderStatus.VALIDANDO_STOCK,
    SalesOrderStatus.CANCELADO,
  ],
  [SalesOrderStatus.VALIDANDO_STOCK]: [
    SalesOrderStatus.CONFIRMADO,
    SalesOrderStatus.ESPERANDO_COMPRA,
    SalesOrderStatus.CANCELADO,
  ],
  [SalesOrderStatus.CONFIRMADO]: [
    SalesOrderStatus.EN_PICKING,
    SalesOrderStatus.ESPERANDO_COMPRA,
    SalesOrderStatus.CANCELADO,
  ],
  [SalesOrderStatus.ESPERANDO_COMPRA]: [
    SalesOrderStatus.CONFIRMADO,
    SalesOrderStatus.EN_PICKING,
    SalesOrderStatus.CANCELADO,
  ],
  [SalesOrderStatus.EN_PICKING]: [
    SalesOrderStatus.PREPARADO,
    SalesOrderStatus.PICKING_INCOMPLETO,
    SalesOrderStatus.INCIDENCIA,
    SalesOrderStatus.CANCELADO,
  ],
  [SalesOrderStatus.PICKING_INCOMPLETO]: [
    SalesOrderStatus.EN_PICKING,
    SalesOrderStatus.PREPARADO,
    SalesOrderStatus.ESPERANDO_COMPRA,
    SalesOrderStatus.INCIDENCIA,
  ],
  [SalesOrderStatus.PREPARADO]: [
    SalesOrderStatus.EN_DESPACHO,
    SalesOrderStatus.INCIDENCIA,
    SalesOrderStatus.CANCELADO,
  ],
  [SalesOrderStatus.EN_DESPACHO]: [
    SalesOrderStatus.EN_RUTA,
    SalesOrderStatus.INCIDENCIA,
  ],
  [SalesOrderStatus.EN_RUTA]: [
    SalesOrderStatus.ENTREGADO,
    SalesOrderStatus.INCIDENCIA,
  ],
  [SalesOrderStatus.INCIDENCIA]: [
    SalesOrderStatus.EN_PICKING,
    SalesOrderStatus.PREPARADO,
    SalesOrderStatus.ENTREGADO,
    SalesOrderStatus.CANCELADO,
  ],
  [SalesOrderStatus.ENTREGADO]: [], // terminal
  [SalesOrderStatus.CANCELADO]: [], // terminal
};

/** ¿Es válida la transición de `from` a `to`? */
export function canTransition(
  from: SalesOrderStatus,
  to: SalesOrderStatus,
): boolean {
  return SALES_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Clasifica el stock de una línea comparando la cantidad disponible con la
 * solicitada (prompt §10). Función pura → fácil de testear.
 */
export function classifyStock(
  disponible: number,
  solicitada: number,
): StockStatus {
  if (disponible <= 0) return StockStatus.SIN_STOCK;
  if (disponible < solicitada) return StockStatus.INSUFICIENTE;
  return StockStatus.DISPONIBLE;
}

/** Estado de una necesidad/solicitud de compra (prompt §11). */
export enum PurchaseRequestStatus {
  PENDIENTE = 'PENDIENTE',
  COTIZANDO = 'COTIZANDO',
  APROBADA = 'APROBADA',
  ORDENADA = 'ORDENADA',
  RECHAZADA = 'RECHAZADA',
}

/** Origen de una necesidad de compra. */
export enum PurchaseRequestOrigin {
  AUTO_STOCK = 'AUTO_STOCK',
  MANUAL = 'MANUAL',
}

// ==========================================================================
// Fase 3 — Inventario (WMS), compras y mermas
// ==========================================================================

/** Tipos de movimiento de inventario (prompt §15). */
export enum InventoryMovementType {
  ENTRADA = 'ENTRADA',
  SALIDA = 'SALIDA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  AJUSTE = 'AJUSTE',
  MERMA = 'MERMA',
  DEVOLUCION = 'DEVOLUCION',
  RECEPCION = 'RECEPCION',
  DESPACHO = 'DESPACHO',
}

/**
 * Signo del movimiento sobre el stock físico.
 * Los positivos suman (ENTRADA/RECEPCION/DEVOLUCION), los negativos restan
 * (SALIDA/MERMA/DESPACHO). AJUSTE y TRANSFERENCIA llevan su propio signo en la
 * cantidad, por eso devuelven +1 y el llamador entrega la cantidad con signo.
 */
export function movementSign(tipo: InventoryMovementType): 1 | -1 {
  switch (tipo) {
    case InventoryMovementType.ENTRADA:
    case InventoryMovementType.RECEPCION:
    case InventoryMovementType.DEVOLUCION:
      return 1;
    case InventoryMovementType.SALIDA:
    case InventoryMovementType.MERMA:
    case InventoryMovementType.DESPACHO:
      return -1;
    default:
      return 1; // AJUSTE / TRANSFERENCIA: cantidad con signo explícito
  }
}

/** Estados de una orden de compra (prompt §11). */
export enum PurchaseOrderStatus {
  BORRADOR = 'BORRADOR',
  APROBADA = 'APROBADA',
  ENVIADA = 'ENVIADA',
  RECIBIDA_PARCIAL = 'RECIBIDA_PARCIAL',
  RECIBIDA = 'RECIBIDA',
  CANCELADA = 'CANCELADA',
}

/** Motivos de merma (prompt §16). */
export enum WasteReason {
  VENCIMIENTO = 'VENCIMIENTO',
  DANO = 'DANO',
  MANIPULACION = 'MANIPULACION',
  DESCOMPOSICION = 'DESCOMPOSICION',
  ERROR_PICKING = 'ERROR_PICKING',
  DEVOLUCION = 'DEVOLUCION',
  ROTURA = 'ROTURA',
  OTRO = 'OTRO',
}

/**
 * Reglas de aprobación de compra por defecto (prompt §41). Los umbrales son
 * configurables por empresa; esta es la referencia inicial (montos en CLP).
 * `hasta = null` significa "sin tope superior".
 */
export interface ApprovalTier {
  desde: number;
  hasta: number | null;
  rol: RoleName;
}
export const DEFAULT_PURCHASE_APPROVAL_TIERS: ApprovalTier[] = [
  { desde: 0, hasta: 100_000, rol: RoleName.ENCARGADO_COMPRAS },
  { desde: 100_000, hasta: 500_000, rol: RoleName.JEFE_OPERACIONES },
  { desde: 500_000, hasta: null, rol: RoleName.GERENTE },
];

/** Rol mínimo requerido para aprobar una compra de cierto monto. */
export function requiredApproverRole(
  monto: number,
  tiers: ApprovalTier[] = DEFAULT_PURCHASE_APPROVAL_TIERS,
): RoleName {
  const tier = tiers.find(
    (t) => monto >= t.desde && (t.hasta === null || monto < t.hasta),
  );
  return tier?.rol ?? RoleName.GERENTE;
}
