import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';

interface DashboardSummary {
  companyId: string;
  kpis: {
    usuarios: number;
    bodegas: number;
    ventasHoy: number | null;
    pedidosHoy: number | null;
    pedidosPendientes: number | null;
    stockCritico: number | null;
  };
  fase: number;
  nota: string;
}

interface KpiDef {
  key: string;
  label: string;
  fase?: number;
  format?: (v: number) => string;
}

// KPIs del dashboard gerencial (prompt §27). Los de fases futuras aparecen
// como "pendientes" hasta que exista su módulo.
const KPIS: KpiDef[] = [
  { key: 'usuarios', label: 'Usuarios' },
  { key: 'bodegas', label: 'Bodegas' },
  { key: 'ventasHoy', label: 'Ventas hoy', fase: 2 },
  { key: 'pedidosHoy', label: 'Pedidos hoy', fase: 2 },
  { key: 'pedidosPendientes', label: 'Pedidos pendientes', fase: 2 },
  { key: 'stockCritico', label: 'Stock crítico', fase: 3 },
];

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DashboardSummary>('/dashboard/summary')
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Error al cargar'),
      );
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
          Dashboard
        </h1>
        <p className="text-sm text-neutral-500">
          Resumen operativo · Fase 1 (los KPIs operativos se activan por fase)
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KPIS.map((kpi) => {
          const value = data?.kpis[
            kpi.key as keyof DashboardSummary['kpis']
          ] as number | null | undefined;
          const pending = value === null || value === undefined;
          return (
            <div
              key={kpi.key}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-start justify-between">
                <span className="text-sm text-neutral-500">{kpi.label}</span>
                {pending && kpi.fase && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-400 dark:bg-neutral-800">
                    Fase {kpi.fase}
                  </span>
                )}
              </div>
              <div className="mt-2 text-3xl font-bold text-neutral-800 dark:text-neutral-100">
                {pending ? (
                  <span className="text-neutral-300 dark:text-neutral-600">
                    —
                  </span>
                ) : (
                  (value as number).toLocaleString('es-CL')
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 bg-white/50 p-5 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/40">
        {data?.nota ?? 'Cargando…'}
      </div>
    </div>
  );
}
