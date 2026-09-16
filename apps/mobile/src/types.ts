/**
 * Tipos de dominio mínimos para la app móvil. Se mantienen autocontenidos (no
 * se importa @agrogood/shared en runtime) para simplificar el bundling de Metro
 * en el monorepo. Los valores deben coincidir con los enums del backend.
 */

export interface AuthUser {
  id: string;
  companyId: string;
  email?: string;
  nombre?: string;
  roles: string[];
  permissions: string[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type PickingStatus =
  | 'PENDIENTE'
  | 'EN_PROCESO'
  | 'COMPLETADO'
  | 'INCOMPLETO'
  | 'CANCELADO';

export type PickingItemStatus = 'PENDIENTE' | 'OK' | 'FALTANTE' | 'SUSTITUCION';

export const PICKING_ITEM_STATES: PickingItemStatus[] = [
  'OK',
  'FALTANTE',
  'SUSTITUCION',
];

export interface PickingListItem {
  id: string;
  numero: string;
  estado: PickingStatus;
  salesOrder: { numero: string; customer: { razonSocial: string } };
  _count: { items: number };
}

export interface PickingItem {
  id: string;
  cantidadSolicitada: string | number;
  cantidadPickeada: string | number;
  estado: PickingItemStatus;
  observacion?: string | null;
  product: { sku: string; nombre: string; unidadBase: string };
}

export interface PickingDetail {
  id: string;
  numero: string;
  estado: PickingStatus;
  salesOrder: { numero: string; customer: { razonSocial: string } };
  warehouse: { nombre: string };
  items: PickingItem[];
}

export type RouteStatus =
  | 'PLANIFICADA'
  | 'CARGANDO'
  | 'EN_RUTA'
  | 'COMPLETADA'
  | 'CANCELADA';

export interface RouteListItem {
  id: string;
  numero: string;
  estado: RouteStatus;
  fecha: string;
  vehicle?: { patente: string } | null;
  driver?: { nombre: string } | null;
  _count: { stops: number };
}

export interface RouteStop {
  id: string;
  orden: number;
  estado: string;
  salesOrder: {
    numero: string;
    customer: { razonSocial: string };
    customerAddress?: { direccion: string; comuna?: string | null } | null;
  };
}

export interface RouteDetail {
  id: string;
  numero: string;
  estado: RouteStatus;
  vehicle?: { patente: string } | null;
  driver?: { nombre: string } | null;
  stops: RouteStop[];
}
