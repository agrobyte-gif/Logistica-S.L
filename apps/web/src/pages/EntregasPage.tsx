import { useEffect, useState } from 'react';
import { api, ApiError, type Paginated } from '../api/client';
import { PageHeader, StatusBadge } from '../components/ui';

interface DeliveryRow {
  id: string;
  estado: string;
  receptorNombre?: string | null;
  hora: string;
  salesOrder: { numero: string; customer: { razonSocial: string } };
  _count: { items: number; evidence: number };
}

export function EntregasPage() {
  const [rows, setRows] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Paginated<DeliveryRow>>('/deliveries?pageSize=50')
      .then((res) => setRows(res.data))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Error al cargar'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Entregas"
        subtitle="Confirmaciones de entrega con evidencia (firma/foto)"
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Receptor</th>
              <th className="px-4 py-3 text-center">Evidencia</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Sin entregas registradas
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                >
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {new Date(d.hora).toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-brand-700 dark:text-brand-300">
                    {d.salesOrder.numero}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">
                    {d.salesOrder.customer.razonSocial}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {d.receptorNombre ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-neutral-500">
                    {d._count.evidence > 0 ? `📎 ${d._count.evidence}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.estado} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
