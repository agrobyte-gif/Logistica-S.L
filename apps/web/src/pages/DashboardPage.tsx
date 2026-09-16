import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { formatCLP, PageHeader } from '../components/ui';

interface Summary {
  kpis: Record<string, number>;
}

interface KpiDef {
  key: string;
  label: string;
  money?: boolean;
  alert?: boolean; // resaltar en rojo si > 0
}

const KPIS: KpiDef[] = [
  { key: 'ventasHoy', label: 'Ventas hoy', money: true },
  { key: 'pedidosHoy', label: 'Pedidos hoy' },
  { key: 'pedidosPendientes', label: 'Pedidos pendientes' },
  { key: 'pedidosEnPicking', label: 'En picking' },
  { key: 'pedidosEnRuta', label: 'En ruta' },
  { key: 'entregadosHoy', label: 'Entregados hoy' },
  { key: 'incidencias', label: 'Incidencias', alert: true },
  { key: 'stockCritico', label: 'Stock crítico', alert: true },
  { key: 'comprasPendientes', label: 'Compras pendientes' },
  { key: 'mermaHoy', label: 'Merma hoy', money: true },
  { key: 'cajaChica', label: 'Caja chica', money: true },
  { key: 'cuentasPorCobrar', label: 'Por cobrar', money: true },
  { key: 'cuentasPorPagar', label: 'Por pagar', money: true },
];

export function DashboardPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Summary>('/dashboard/summary')
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error al cargar'));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Dashboard" subtitle="Resumen operativo y financiero en tiempo real" />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {KPIS.map((kpi) => {
          const value = data?.kpis[kpi.key];
          const isAlert = kpi.alert && (value ?? 0) > 0;
          return (
            <div
              key={kpi.key}
              className={`rounded-2xl border p-5 shadow-sm ${
                isAlert
                  ? 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30'
                  : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
              }`}
            >
              <div className="text-sm text-neutral-500">{kpi.label}</div>
              <div
                className={`mt-2 text-2xl font-bold ${
                  isAlert
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-neutral-800 dark:text-neutral-100'
                }`}
              >
                {data == null
                  ? '—'
                  : kpi.money
                    ? formatCLP(value ?? 0)
                    : (value ?? 0).toLocaleString('es-CL')}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
