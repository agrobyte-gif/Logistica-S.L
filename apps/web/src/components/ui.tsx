import type { ReactNode } from 'react';

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost';
}) {
  const base =
    'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60';
  const styles =
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'border border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800';
  return (
    <button className={`${base} ${styles}`} {...props}>
      {children}
    </button>
  );
}

export const inputClass =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Modal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  DISPONIBLE: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  INSUFICIENTE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  SIN_STOCK: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  CONFIRMADO: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  ESPERANDO_COMPRA: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  RECIBIDO: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  CANCELADO: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  CANCELADA: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  ENTREGADO: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200',
  // Fase 4: picking, despacho y rutas.
  PENDIENTE: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  EN_PROCESO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  EN_PICKING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  PICKING_INCOMPLETO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  INCOMPLETO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  COMPLETADO: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  COMPLETADA: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  PREPARADO: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  PLANIFICADA: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  CARGANDO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  EN_DESPACHO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  EN_RUTA: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200',
  // Control de calidad.
  APROBADO: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  OBSERVADO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  RECHAZADO: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  DISPONIBLE_VEH: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  MANTENIMIENTO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

export function StatusBadge({ status }: { status: string }) {
  const cls =
    STATUS_COLORS[status] ??
    'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function formatCLP(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const n = typeof value === 'string' ? Number(value) : value;
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' });
}
