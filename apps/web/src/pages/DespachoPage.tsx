import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, type Paginated } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, formatCLP, PageHeader } from '../components/ui';

interface DispatchOrder {
  id: string;
  numero: string;
  total: string | number;
  customer: { razonSocial: string };
  customerAddress?: { direccion: string; comuna?: string | null } | null;
  _count: { items: number };
}

export function DespachoPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<DispatchOrder[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const canManage = hasPermission('dispatch:manage');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Paginated<DispatchOrder>>(
        '/routes/dispatchable?pageSize=50',
      );
      setRows(res.data);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createRoute() {
    setCreating(true);
    setError(null);
    try {
      const res = await api.post<{ id: string }>('/routes', {
        salesOrderIds: [...selected],
      });
      navigate(`/logistica/rutas/${res.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo crear la ruta');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Centro de despacho"
        subtitle="Pedidos preparados listos para rutear"
        action={
          canManage && (
            <Button
              onClick={() => void createRoute()}
              disabled={creating || selected.size === 0}
            >
              {creating
                ? 'Creando…'
                : `Crear ruta (${selected.size})`}
            </Button>
          )
        }
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
              <th className="px-4 py-3 w-10"></th>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3 text-right">Líneas</th>
              <th className="px-4 py-3 text-right">Total</th>
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
                  No hay pedidos preparados pendientes de despacho
                </td>
              </tr>
            ) : (
              rows.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      disabled={!canManage}
                      onChange={() => toggle(o.id)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-200">
                    {o.numero}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {o.customer.razonSocial}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {o.customerAddress?.direccion ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {o._count.items}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCLP(o.total)}
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
