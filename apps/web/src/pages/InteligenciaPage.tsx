import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { formatCLP, PageHeader } from '../components/ui';

interface Rec {
  sku: string;
  producto: string;
  unidad: string;
  demandaProyectada: number;
  disponible: number;
  recomendarComprar: number;
  critico: boolean;
  mensaje: string;
}
interface Anomalies {
  mermaSemana: number;
  mermaPrevia: number;
  anomalias: { tipo: string; nivel: string; texto: string }[];
}
interface CustomerInsight {
  cliente: string;
  pedidos: number;
  ticketPromedio: number;
  totalComprado: number;
  ultimaCompra: string;
}

export function InteligenciaPage() {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [anom, setAnom] = useState<Anomalies | null>(null);
  const [clientes, setClientes] = useState<CustomerInsight[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ recomendaciones: Rec[] }>('/ai/purchase-recommendations'),
      api.get<Anomalies>('/ai/anomalies'),
      api.get<{ clientes: CustomerInsight[] }>('/ai/customer-insights'),
    ])
      .then(([r, a, c]) => {
        setRecs(r.recomendaciones);
        setAnom(a);
        setClientes(c.clientes);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error'));
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Inteligencia"
        subtitle="Asistente de recomendaciones basado en tu historial · no ejecuta acciones"
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Anomalías */}
      {anom && anom.anomalias.length > 0 && (
        <div className="mb-6 space-y-2">
          {anom.anomalias.map((a, i) => (
            <div
              key={i}
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
            >
              ⚠️ {a.texto}
            </div>
          ))}
        </div>
      )}

      {/* Recomendaciones de compra */}
      <section className="mb-8">
        <h2 className="mb-3 font-semibold text-neutral-800 dark:text-neutral-100">
          🛒 Recomendaciones de compra
        </h2>
        {recs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
            No hay recomendaciones: el stock cubre la demanda estimada.
          </p>
        ) : (
          <div className="space-y-2">
            {recs.map((r) => (
              <div
                key={r.sku}
                className={`rounded-xl border p-4 ${
                  r.critico
                    ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20'
                    : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">
                    {r.producto}{' '}
                    <span className="font-mono text-xs text-neutral-400">{r.sku}</span>
                  </span>
                  {r.recomendarComprar > 0 && (
                    <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">
                      Comprar {r.recomendarComprar} {r.unidad}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-neutral-500">{r.mensaje}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Clientes */}
      <section>
        <h2 className="mb-3 font-semibold text-neutral-800 dark:text-neutral-100">
          👥 Análisis de clientes
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-center">Pedidos</th>
                <th className="px-4 py-3 text-right">Ticket promedio</th>
                <th className="px-4 py-3 text-right">Total comprado</th>
                <th className="px-4 py-3">Última compra</th>
              </tr>
            </thead>
            <tbody>
              {clientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                    Sin datos de clientes
                  </td>
                </tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.cliente} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">{c.cliente}</td>
                    <td className="px-4 py-3 text-center">{c.pedidos}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCLP(c.ticketPromedio)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCLP(c.totalComprado)}</td>
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(c.ultimaCompra).toLocaleDateString('es-CL')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
