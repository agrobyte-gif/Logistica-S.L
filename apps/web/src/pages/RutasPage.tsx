import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, type Paginated } from '../api/client';
import { PageHeader, StatusBadge } from '../components/ui';

interface RouteRow {
  id: string;
  numero: string;
  estado: string;
  fecha: string;
  vehicle?: { patente: string } | null;
  driver?: { nombre: string } | null;
  _count: { stops: number };
}

export function RutasPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api.get<Paginated<RouteRow>>('/routes?pageSize=50');
        setRows(res.data);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Rutas" subtitle="Transporte y despacho (TMS)" />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
            <tr>
              <th className="px-4 py-3">Ruta</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Vehículo</th>
              <th className="px-4 py-3">Conductor</th>
              <th className="px-4 py-3 text-right">Paradas</th>
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
                  Sin rutas. Crea una desde el Centro de despacho.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => navigate(`/logistica/rutas/${r.id}`)}
                  className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
                >
                  <td className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-200">
                    {r.numero}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {new Date(r.fecha).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {r.vehicle?.patente ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {r.driver?.nombre ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r._count.stops}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.estado} />
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
