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

  // --- Fase 4: Picking ---
  PICKING_READ = 'picking:read',
  PICKING_CREATE = 'picking:create', // asignar/crear picking a un pedido
  PICKING_EXECUTE = 'picking:execute', // el picker actualiza y cierra

  // --- Fase 4: Control de calidad ---
  QUALITY_READ = 'quality:read',
  QUALITY_CHECK = 'quality:check',

  // --- Fase 4: Despacho y TMS ---
  DISPATCH_READ = 'dispatch:read',
  DISPATCH_MANAGE = 'dispatch:manage', // arma rutas, asigna y controla salida
  ROUTE_READ = 'route:read',

  // --- Fase 4: Vehículos y conductores ---
  VEHICLE_READ = 'vehicle:read',
  VEHICLE_MANAGE = 'vehicle:manage',
  DRIVER_READ = 'driver:read',
  DRIVER_MANAGE = 'driver:manage',

  // --- Fase 5: Entregas, GPS y notificaciones ---
  DELIVERY_READ = 'delivery:read',
  DELIVERY_EXECUTE = 'delivery:execute', // el conductor confirma/rechaza entrega
  GPS_READ = 'gps:read',
  GPS_REPORT = 'gps:report', // la app del conductor reporta posición

  // --- Fase 6: Caja chica ---
  CASH_READ = 'cash:read',
  CASH_MANAGE = 'cash:manage', // abrir/cerrar caja, registrar movimientos

  // --- Fase 6: Facturación (registro de DTE emitidos en el SII) ---
  INVOICE_READ = 'invoice:read',
  INVOICE_MANAGE = 'invoice:manage', // registrar/anular DTE
  PAYMENT_REGISTER = 'payment:register', // registrar pagos/abonos de clientes

  // --- Fase 6: Finanzas (CxC / CxP) ---
  FINANCE_READ = 'finance:read',
  PAYABLE_READ = 'payable:read',
  PAYABLE_MANAGE = 'payable:manage', // facturas de proveedor y sus pagos

  // --- Fase 7: BI, reportes y Control Tower ---
  REPORTS_VIEW = 'reports:view',
  CONTROL_TOWER_VIEW = 'control_tower:view',
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
    // Fase 4: visibilidad de operación logística.
    Permission.PICKING_READ,
    Permission.QUALITY_READ,
    Permission.DISPATCH_READ,
    Permission.ROUTE_READ,
    Permission.VEHICLE_READ,
    Permission.DRIVER_READ,
    // Fase 5-6: seguimiento comercial y financiero.
    Permission.DELIVERY_READ,
    Permission.GPS_READ,
    Permission.FINANCE_READ,
    Permission.INVOICE_READ,
    Permission.PAYABLE_READ,
    Permission.CASH_READ,
    // Fase 7: BI y torre de control.
    Permission.REPORTS_VIEW,
    Permission.CONTROL_TOWER_VIEW,
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
    // Fase 4: coordina picking, calidad, despacho y TMS.
    Permission.PICKING_READ,
    Permission.PICKING_CREATE,
    Permission.QUALITY_READ,
    Permission.QUALITY_CHECK,
    Permission.DISPATCH_READ,
    Permission.DISPATCH_MANAGE,
    Permission.ROUTE_READ,
    Permission.VEHICLE_READ,
    Permission.VEHICLE_MANAGE,
    Permission.DRIVER_READ,
    Permission.DRIVER_MANAGE,
    // Fase 5: seguimiento de entregas y GPS.
    Permission.DELIVERY_READ,
    Permission.GPS_READ,
    // Fase 7: torre de control operacional y reportes.
    Permission.CONTROL_TOWER_VIEW,
    Permission.REPORTS_VIEW,
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
    // Fase 4: el bodeguero también prepara pedidos y controla calidad.
    Permission.SALES_ORDER_READ,
    Permission.PICKING_READ,
    Permission.PICKING_CREATE,
    Permission.PICKING_EXECUTE,
    Permission.QUALITY_READ,
    Permission.QUALITY_CHECK,
  ],
  [RoleName.PICKER]: [
    Permission.DASHBOARD_VIEW,
    // Acceso acotado (prompt §6): solo sus pedidos y el picking.
    Permission.PRODUCT_READ,
    Permission.SALES_ORDER_READ,
    Permission.PICKING_READ,
    Permission.PICKING_EXECUTE,
  ],
  [RoleName.DESPACHADOR]: [
    Permission.DASHBOARD_VIEW,
    Permission.SALES_ORDER_READ,
    Permission.PICKING_READ,
    Permission.QUALITY_READ,
    Permission.DISPATCH_READ,
    Permission.DISPATCH_MANAGE,
    Permission.ROUTE_READ,
    Permission.VEHICLE_READ,
    Permission.DRIVER_READ,
    // Fase 5: sigue entregas y GPS de la flota.
    Permission.DELIVERY_READ,
    Permission.GPS_READ,
  ],
  [RoleName.CONDUCTOR]: [
    Permission.DASHBOARD_VIEW,
    // Ve sus rutas asignadas y, en Fase 5, ejecuta entregas y reporta GPS.
    Permission.ROUTE_READ,
    Permission.DELIVERY_READ,
    Permission.DELIVERY_EXECUTE,
    Permission.GPS_REPORT,
  ],
  [RoleName.ADMINISTRACION]: [
    Permission.DASHBOARD_VIEW,
    Permission.USER_READ,
    Permission.AUDIT_READ,
    // Fase 6: administración financiera completa.
    Permission.CASH_READ,
    Permission.CASH_MANAGE,
    Permission.INVOICE_READ,
    Permission.INVOICE_MANAGE,
    Permission.PAYMENT_REGISTER,
    Permission.PAYABLE_READ,
    Permission.PAYABLE_MANAGE,
    Permission.FINANCE_READ,
    // Ve clientes/proveedores/pedidos para asociar documentos.
    Permission.CUSTOMER_READ,
    Permission.SUPPLIER_READ,
    Permission.SALES_ORDER_READ,
    // Fase 7: reportes financieros.
    Permission.REPORTS_VIEW,
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
  // Fase 4
  PICKING_STATE_CHANGE = 'PICKING_STATE_CHANGE',
  QUALITY_CHECK_RECORDED = 'QUALITY_CHECK_RECORDED',
  ROUTE_STATE_CHANGE = 'ROUTE_STATE_CHANGE',
  // Fase 5
  DELIVERY_RECORDED = 'DELIVERY_RECORDED',
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

// ==========================================================================
// Fase 4 — Picking, control de calidad, despacho y TMS (rutas)
// ==========================================================================

/** Estados del proceso de picking (prompt §17). */
export enum PickingStatus {
  PENDIENTE = 'PENDIENTE',
  EN_PROCESO = 'EN_PROCESO',
  COMPLETADO = 'COMPLETADO',
  INCOMPLETO = 'INCOMPLETO',
  CANCELADO = 'CANCELADO',
}

/** Estado de cada línea de picking (prompt §17). */
export enum PickingItemStatus {
  PENDIENTE = 'PENDIENTE',
  OK = 'OK',
  FALTANTE = 'FALTANTE',
  SUSTITUCION = 'SUSTITUCION',
}

/** Resultado del control de calidad previo al despacho (prompt §18). */
export enum QualityResult {
  APROBADO = 'APROBADO',
  OBSERVADO = 'OBSERVADO',
  RECHAZADO = 'RECHAZADO',
}

/** Estado operativo de un vehículo (prompt §20). */
export enum VehicleStatus {
  DISPONIBLE = 'DISPONIBLE',
  EN_RUTA = 'EN_RUTA',
  MANTENIMIENTO = 'MANTENIMIENTO',
  INACTIVO = 'INACTIVO',
}

/** Estados de una ruta de transporte (prompt §20). */
export enum RouteStatus {
  PLANIFICADA = 'PLANIFICADA',
  CARGANDO = 'CARGANDO',
  EN_RUTA = 'EN_RUTA',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA',
}

/** Estado de una parada de la ruta (las entregas y evidencias son Fase 5). */
export enum RouteStopStatus {
  PENDIENTE = 'PENDIENTE',
  EN_RUTA = 'EN_RUTA',
  ENTREGADO = 'ENTREGADO',
  INCIDENCIA = 'INCIDENCIA',
}

/** Transiciones válidas del picking. */
export const PICKING_TRANSITIONS: Record<PickingStatus, PickingStatus[]> = {
  [PickingStatus.PENDIENTE]: [PickingStatus.EN_PROCESO, PickingStatus.CANCELADO],
  [PickingStatus.EN_PROCESO]: [
    PickingStatus.COMPLETADO,
    PickingStatus.INCOMPLETO,
    PickingStatus.CANCELADO,
  ],
  [PickingStatus.INCOMPLETO]: [
    PickingStatus.EN_PROCESO,
    PickingStatus.COMPLETADO,
  ],
  [PickingStatus.COMPLETADO]: [], // terminal
  [PickingStatus.CANCELADO]: [], // terminal
};

export function canTransitionPicking(
  from: PickingStatus,
  to: PickingStatus,
): boolean {
  return PICKING_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Transiciones válidas de una ruta. */
export const ROUTE_TRANSITIONS: Record<RouteStatus, RouteStatus[]> = {
  [RouteStatus.PLANIFICADA]: [RouteStatus.CARGANDO, RouteStatus.CANCELADA],
  [RouteStatus.CARGANDO]: [
    RouteStatus.EN_RUTA,
    RouteStatus.PLANIFICADA,
    RouteStatus.CANCELADA,
  ],
  [RouteStatus.EN_RUTA]: [RouteStatus.COMPLETADA],
  [RouteStatus.COMPLETADA]: [], // terminal
  [RouteStatus.CANCELADA]: [], // terminal
};

export function canTransitionRoute(
  from: RouteStatus,
  to: RouteStatus,
): boolean {
  return ROUTE_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Línea de picking mínima para evaluar diferencias (función pura). */
export interface PickingItemLike {
  cantidadSolicitada: number;
  cantidadPickeada: number;
  estado: PickingItemStatus;
  observacion?: string | null;
}

/** ¿La línea difiere de lo solicitado? (faltante, sustitución o menor cantidad). */
export function pickingItemHasDifference(it: PickingItemLike): boolean {
  return (
    it.estado === PickingItemStatus.FALTANTE ||
    it.estado === PickingItemStatus.SUSTITUCION ||
    it.cantidadPickeada !== it.cantidadSolicitada
  );
}

/**
 * Regla de negocio (prompt §17 y §37): no se puede cerrar un picking con
 * diferencias sin justificar. Una diferencia se considera justificada si la
 * línea tiene una observación no vacía. Función pura → fácil de testear.
 */
export function pickingHasUnjustifiedDifference(
  items: PickingItemLike[],
): boolean {
  return items.some(
    (it) =>
      pickingItemHasDifference(it) &&
      !(it.observacion && it.observacion.trim().length > 0),
  );
}

/**
 * Resultado del cierre de un picking: COMPLETADO si todas las líneas se
 * pickearon completas y sin faltantes/sustituciones; en caso contrario
 * INCOMPLETO (prompt §17: "picking incompleto").
 */
export function resolvePickingOutcome(
  items: PickingItemLike[],
): PickingStatus.COMPLETADO | PickingStatus.INCOMPLETO {
  const completo = items.every(
    (it) =>
      !pickingItemHasDifference(it) && it.estado === PickingItemStatus.OK,
  );
  return completo ? PickingStatus.COMPLETADO : PickingStatus.INCOMPLETO;
}

// ==========================================================================
// Fase 5 — Entregas, GPS y notificaciones
// ==========================================================================

/** Resultado de la entrega en un cliente (prompt §23). */
export enum DeliveryStatus {
  ENTREGADO = 'ENTREGADO',
  RECHAZADO_PARCIAL = 'RECHAZADO_PARCIAL',
  RECHAZADO = 'RECHAZADO',
}

/** Estado por producto entregado/rechazado. */
export enum DeliveryItemStatus {
  ENTREGADO = 'ENTREGADO',
  RECHAZADO = 'RECHAZADO',
}

/** Tipo de evidencia de entrega (prompt §23). */
export enum DeliveryEvidenceType {
  FIRMA = 'FIRMA',
  FOTO = 'FOTO',
}

/** Prioridad/nivel de una notificación (prompt §28-29). */
export enum NotificationLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  CRITICAL = 'CRITICAL',
}

/**
 * Deriva el estado de entrega a partir de las líneas: todo entregado →
 * ENTREGADO; nada entregado → RECHAZADO; mezcla → RECHAZADO_PARCIAL.
 * Función pura → testeable.
 */
export function resolveDeliveryStatus(
  items: { status: DeliveryItemStatus }[],
): DeliveryStatus {
  if (items.length === 0) return DeliveryStatus.ENTREGADO;
  const entregados = items.filter(
    (i) => i.status === DeliveryItemStatus.ENTREGADO,
  ).length;
  if (entregados === 0) return DeliveryStatus.RECHAZADO;
  if (entregados === items.length) return DeliveryStatus.ENTREGADO;
  return DeliveryStatus.RECHAZADO_PARCIAL;
}

// ==========================================================================
// Fase 6 — Caja chica, finanzas y facturación (registro de DTE)
// ==========================================================================

export enum CashRegisterStatus {
  ABIERTA = 'ABIERTA',
  CERRADA = 'CERRADA',
}

export enum CashMovementType {
  INGRESO = 'INGRESO',
  EGRESO = 'EGRESO',
}

/** Tipo de documento tributario electrónico (código SII). */
export enum DteType {
  FACTURA = 'FACTURA', // 33
  BOLETA = 'BOLETA', // 39
  NOTA_CREDITO = 'NOTA_CREDITO', // 61
  NOTA_DEBITO = 'NOTA_DEBITO', // 56
}

/** Código numérico SII por tipo de DTE. */
export const DTE_CODE: Record<DteType, number> = {
  [DteType.FACTURA]: 33,
  [DteType.BOLETA]: 39,
  [DteType.NOTA_CREDITO]: 61,
  [DteType.NOTA_DEBITO]: 56,
};

/** Estado de cobro/pago de un documento. */
export enum DocumentStatus {
  EMITIDA = 'EMITIDA',
  PAGADA_PARCIAL = 'PAGADA_PARCIAL',
  PAGADA = 'PAGADA',
  ANULADA = 'ANULADA',
}

/** IVA vigente en Chile (configurable a futuro). */
export const IVA_RATE = 0.19;

/**
 * Calcula neto/IVA/total a partir de un monto neto y si está afecto a IVA.
 * Redondea el IVA al peso (CLP no usa decimales). Función pura.
 */
export function computeTax(
  neto: number,
  afecto = true,
): { neto: number; iva: number; total: number } {
  const netoR = Math.round(neto);
  const iva = afecto ? Math.round(netoR * IVA_RATE) : 0;
  return { neto: netoR, iva, total: netoR + iva };
}

/**
 * Deriva el estado de un documento según lo pagado. Función pura.
 */
export function computeDocumentStatus(
  total: number,
  pagado: number,
): DocumentStatus {
  if (pagado <= 0) return DocumentStatus.EMITIDA;
  if (pagado >= total) return DocumentStatus.PAGADA;
  return DocumentStatus.PAGADA_PARCIAL;
}

/** Semáforo de vencimiento para cuentas por cobrar/pagar (prompt §25). */
export enum AgingStatus {
  PAGADO = 'PAGADO', // 🟢 saldo 0
  VIGENTE = 'VIGENTE', // 🟢 no vencido
  POR_VENCER = 'POR_VENCER', // 🟠 vence dentro de `warnDays`
  VENCIDO = 'VENCIDO', // 🔴 pasado el vencimiento
}

/**
 * Clasifica un documento por su vencimiento y saldo. Función pura.
 * @param saldo saldo pendiente (total - pagado)
 * @param vencimiento fecha de vencimiento (o null si no aplica)
 * @param hoy fecha de referencia
 * @param warnDays días de antelación para "por vencer" (default 5)
 */
export function agingStatus(
  saldo: number,
  vencimiento: Date | null,
  hoy: Date = new Date(),
  warnDays = 5,
): AgingStatus {
  if (saldo <= 0) return AgingStatus.PAGADO;
  if (!vencimiento) return AgingStatus.VIGENTE;
  const ms = vencimiento.getTime() - hoy.getTime();
  const dias = Math.ceil(ms / 86_400_000);
  if (dias < 0) return AgingStatus.VENCIDO;
  if (dias <= warnDays) return AgingStatus.POR_VENCER;
  return AgingStatus.VIGENTE;
}
