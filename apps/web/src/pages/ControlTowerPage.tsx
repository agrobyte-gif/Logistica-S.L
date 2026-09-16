import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { PageHeader } from '../components/ui';

interface ControlTower {
  operacion: {
    pedidos: number;
    pendientes: number;
    enPicking: number;
    enRuta: number;
    entregados: number;
  };
  alertas: { nivel: string; texto: string }[];
}

const NIVEL_ICON: Record<string, string> = {
  CRITICAL: '🔴',
  WARN: '🟠',
  INFO: '🔵',
};

export function ControlTowerPage() {
  const [data, setData] = useState<ControlTower | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = () =>
      api
        .get<ControlTower>('/dashboard/control-tower')
        .then((d) => active && setData(d))
        .catch((e) => active && setError(e instanceof ApiError ? e.message : 'Error'));
    void load();
    const t = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const op = data?.operacion;
  const tiles = [
    { label: 'Pedidos hoy', value: op?.pedidos },
    { label: 'Pendientes', value: op?.pendientes },
    { label: 'En picking', value: op?.enPicking },
    { label: 'En ruta', value: op?.enRuta },
    { label: 'Entregados', value: op?.entregados },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Control Tower"
        subtitle="Operación en vivo · refresco cada 20s"
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-2xl border border-neutral-200 bg-white p-5 text-center dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
              {t.value ?? '—'}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide text-neutral-400">
              {t.label}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <h2 className="mb-3 font-semibold text-neutral-800 dark:text-neutral-100">
          Alertas
        </h2>
        {!data || data.alertas.length === 0 ? (
          <p className="text-sm text-neutral-400">Sin alertas activas 🎉</p>
        ) : (
          <ul className="space-y-2">
            {data.alertas.map((a, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-800/50 dark:text-neutral-200"
              >
                <span>{NIVEL_ICON[a.nivel] ?? '•'}</span>
                {a.texto}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
