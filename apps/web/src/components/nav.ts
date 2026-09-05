/** Estructura del menú lateral (prompt maestro §54). */
export interface NavItem {
  label: string;
  icon: string;
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
    available: false,
    fase: 2,
    items: [
      { label: 'Clientes', icon: '•', path: '/crm/clientes', available: false, fase: 2 },
      { label: 'Contactos', icon: '•', path: '/crm/contactos', available: false, fase: 2 },
      { label: 'Historial', icon: '•', path: '/crm/historial', available: false, fase: 2 },
    ],
  },
  {
    label: 'Ventas',
    icon: '🛒',
    available: false,
    fase: 2,
    items: [
      { label: 'Pedidos', icon: '•', path: '/ventas/pedidos', available: false, fase: 2 },
      { label: 'Precios', icon: '•', path: '/ventas/precios', available: false, fase: 2 },
    ],
  },
  {
    label: 'Compras',
    icon: '🛍️',
    available: false,
    fase: 3,
    items: [
      { label: 'Necesidades', icon: '•', path: '/compras/necesidades', available: false, fase: 3 },
      { label: 'Órdenes', icon: '•', path: '/compras/ordenes', available: false, fase: 3 },
      { label: 'Recepciones', icon: '•', path: '/compras/recepciones', available: false, fase: 3 },
    ],
  },
  {
    label: 'Bodega',
    icon: '📦',
    available: false,
    fase: 3,
    items: [
      { label: 'Stock', icon: '•', path: '/bodega/stock', available: false, fase: 3 },
      { label: 'Movimientos', icon: '•', path: '/bodega/movimientos', available: false, fase: 3 },
      { label: 'Picking', icon: '•', path: '/bodega/picking', available: false, fase: 4 },
    ],
  },
  { label: 'Mermas', icon: '🥬', path: '/mermas', available: false, fase: 3 },
  {
    label: 'Logística',
    icon: '🚚',
    available: false,
    fase: 4,
    items: [
      { label: 'Despacho', icon: '•', path: '/logistica/despacho', available: false, fase: 4 },
      { label: 'Rutas', icon: '•', path: '/logistica/rutas', available: false, fase: 4 },
      { label: 'GPS', icon: '•', path: '/logistica/gps', available: false, fase: 5 },
    ],
  },
  {
    label: 'Finanzas',
    icon: '💰',
    available: false,
    fase: 6,
    items: [
      { label: 'Caja chica', icon: '•', path: '/finanzas/caja', available: false, fase: 6 },
      { label: 'Cuentas por cobrar', icon: '•', path: '/finanzas/cxc', available: false, fase: 6 },
      { label: 'Cuentas por pagar', icon: '•', path: '/finanzas/cxp', available: false, fase: 6 },
    ],
  },
  { label: 'Facturación', icon: '🧾', path: '/facturacion', available: false, fase: 6 },
  { label: 'Reportes', icon: '📊', path: '/reportes', available: false, fase: 7 },
  { label: 'Inteligencia', icon: '🤖', path: '/inteligencia', available: false, fase: 8 },
  { label: 'Configuración', icon: '⚙️', path: '/configuracion', available: false, fase: 1 },
  { label: 'Auditoría', icon: '🔐', path: '/auditoria', available: false, fase: 1 },
];
