/** Estructura del menú lateral (prompt maestro §54). */
export interface NavItem {
  label: string;
  path: string;
  /** Disponible en la fase actual; si no, se muestra como "Próximamente". */
  available: boolean;
  fase?: number;
}

export interface NavGroup {
  label: string;
  icon: string;
  items?: NavItem[];
  path?: string;
  available: boolean;
  fase?: number;
}

export const NAV: NavGroup[] = [
  { label: 'Dashboard', icon: '🏠', path: '/dashboard', available: true, fase: 1 },
  {
    label: 'CRM',
    icon: '👥',
    available: true,
    fase: 2,
    items: [
      { label: 'Clientes', path: '/crm/clientes', available: true, fase: 2 },
      { label: 'Contactos', path: '/crm/contactos', available: false, fase: 2 },
      { label: 'Historial', path: '/crm/historial', available: false, fase: 2 },
    ],
  },
  {
    label: 'Ventas',
    icon: '🛒',
    available: true,
    fase: 2,
    items: [
      { label: 'Pedidos', path: '/ventas/pedidos', available: true, fase: 2 },
      { label: 'Productos', path: '/ventas/productos', available: true, fase: 2 },
      { label: 'Precios', path: '/ventas/precios', available: false, fase: 2 },
    ],
  },
  {
    label: 'Compras',
    icon: '🛍️',
    available: true,
    fase: 2,
    items: [
      { label: 'Necesidades', path: '/compras/necesidades', available: true, fase: 2 },
      { label: 'Proveedores', path: '/compras/proveedores', available: true, fase: 2 },
      { label: 'Órdenes', path: '/compras/ordenes', available: true, fase: 3 },
      { label: 'Recepciones', path: '/compras/recepciones', available: false, fase: 3 },
    ],
  },
  {
    label: 'Bodega',
    icon: '📦',
    available: true,
    fase: 3,
    items: [
      { label: 'Stock', path: '/bodega/stock', available: true, fase: 3 },
      { label: 'Movimientos', path: '/bodega/movimientos', available: true, fase: 3 },
      { label: 'Picking', path: '/bodega/picking', available: true, fase: 4 },
    ],
  },
  { label: 'Mermas', icon: '🥬', path: '/mermas', available: true, fase: 3 },
  {
    label: 'Logística',
    icon: '🚚',
    available: true,
    fase: 4,
    items: [
      { label: 'Despacho', path: '/logistica/despacho', available: true, fase: 4 },
      { label: 'Rutas', path: '/logistica/rutas', available: true, fase: 4 },
      { label: 'Entregas', path: '/logistica/entregas', available: true, fase: 5 },
      { label: 'GPS', path: '/logistica/gps', available: true, fase: 5 },
      { label: 'Vehículos', path: '/logistica/vehiculos', available: true, fase: 4 },
      { label: 'Conductores', path: '/logistica/conductores', available: true, fase: 4 },
    ],
  },
  {
    label: 'Finanzas',
    icon: '💰',
    available: false,
    fase: 6,
    items: [
      { label: 'Caja chica', path: '/finanzas/caja', available: false, fase: 6 },
      { label: 'Cuentas por cobrar', path: '/finanzas/cxc', available: false, fase: 6 },
      { label: 'Cuentas por pagar', path: '/finanzas/cxp', available: false, fase: 6 },
    ],
  },
  { label: 'Facturación', icon: '🧾', path: '/facturacion', available: false, fase: 6 },
  { label: 'Reportes', icon: '📊', path: '/reportes', available: false, fase: 7 },
  { label: 'Inteligencia', icon: '🤖', path: '/inteligencia', available: false, fase: 8 },
  { label: 'Notificaciones', icon: '🔔', path: '/notificaciones', available: true, fase: 5 },
  { label: 'Configuración', icon: '⚙️', path: '/configuracion', available: false, fase: 1 },
  { label: 'Auditoría', icon: '🔐', path: '/auditoria', available: false, fase: 1 },
];
