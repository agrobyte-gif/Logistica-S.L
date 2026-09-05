import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  SALES_ORDER_TRANSITIONS,
  SalesOrderStatus,
} from '@agrogood/shared';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  formatCLP,
  PageHeader,
  StatusBadge,
} from '../components/ui';

interface OrderItem {
  id: string;
  cantidad: string | number;
  unidad: string;
  precioUnitario: string | number;
  estadoStock: string;
  product: { sku: string; nombre: string };
}
interface OrderDetail {
  id: string;
  numero: string;
  estado: string;
  total: string | number;
  notas?: string | null;
  createdAt: string;
  customer: { razonSocial: string; rut: string };
  warehouse: { nombre: string };
  items: OrderItem[];
  purchaseRequests: { id: string; cantidad: string | number; estado: string }[];
}
interface TimelineEntry {
  action: string;
  notes?: string | null;
  createdAt: string;
  stateAfter?: { estado?: string } | null;
}

export function PedidoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [o, t] = await Promise.all([
        api.get<OrderDetail>(`/sales-orders/${id}`),
        api.get<TimelineEntry[]>(`/sales-orders/${id}/timeline`),
      ]);
      setOrder(o);
      setTimeline(t);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function transition(to: SalesOrderStatus) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/sales-orders/${id}/transition`, { to });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cambiar el estado');
    } finally {
      setBusy(false);
    }
  }

  if (error && !order) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }
  if (!order) {
    return <div className="p-8 text-neutral-400">Cargando…</div>;
  }

  const nextStates =
    SALES_ORDER_TRANSITIONS[order.estado as SalesOrderStatus] ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={order.numero}
        subtitle={`${order.customer.razonSocial} · ${order.warehouse.nombre}`}
        action={
          <Button variant="ghost" onClick={() => navigate('/ventas/pedidos')}>
            ← Volver
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={order.estado} />
        <span className="text-sm text-neutral-500">
          Total: <span className="font-semibold">{formatCLP(order.total)}</span>
        </span>
        {hasPermission('sales_order:transition') && nextStates.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {nextStates.map((s) => (
              <button
                key={s}
                disabled={busy}
                onClick={() => void transition(s)}
                className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                → {s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Ítems */}
        <div className="md:col-span-2">
          <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-right">Cant.</th>
                  <th className="px-4 py-3 text-right">Precio</th>
                  <th className="px-4 py-3">Stock</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it) => (
                  <tr
                    key={it.id}
                    className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-700 dark:text-neutral-200">
                        {it.product.nombre}
                      </div>
                      <div className="font-mono text-xs text-neutral-400">
                        {it.product.sku}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {Number(it.cantidad).toLocaleString('es-CL')} {it.unidad}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCLP(it.precioUnitario)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={it.estadoStock} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {order.purchaseRequests.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              🛒 Se generaron {order.purchaseRequests.length} necesidad(es) de
              compra automáticas por stock insuficiente.
            </div>
          )}
        </div>

        {/* Línea de tiempo */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            Línea de tiempo
          </h3>
          <ol className="space-y-3">
            {timeline.map((e, i) => (
              <li key={i} className="flex gap-3 text-xs">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                <div>
                  <div className="font-medium text-neutral-700 dark:text-neutral-200">
                    {e.stateAfter?.estado
                      ? e.stateAfter.estado.replace(/_/g, ' ')
                      : e.action}
                  </div>
                  {e.notes && (
                    <div className="text-neutral-500">{e.notes}</div>
                  )}
                  <div className="text-neutral-400">
                    {new Date(e.createdAt).toLocaleString('es-CL')}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
