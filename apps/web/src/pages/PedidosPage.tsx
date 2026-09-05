import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, type Paginated } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, formatCLP, PageHeader, StatusBadge } from '../components/ui';

interface OrderRow {
  id: string;
  numero: string;
  estado: string;
  total: string | number;
  createdAt: string;
  customer: { razonSocial: string };
  _count: { items: number };
}

export function PedidosPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Paginated<OrderRow>>('/sales-orders?pageSize=50')
      .then((res) => setRows(res.data))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Error al cargar'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Pedidos"
        subtitle="Ventas · pedidos de clientes"
        action={
          hasPermission('sales_order:create') && (
            <Button onClick={() => navigate('/ventas/pedidos/nuevo')}>
              + Nuevo pedido
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
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 text-center">Ítems</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  Sin pedidos
                </td>
              </tr>
            ) : (
              rows.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => navigate(`/ventas/pedidos/${o.id}`)}
                  className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-brand-700 dark:text-brand-300">
                    {o.numero}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">
                    {o.customer.razonSocial}
                  </td>
                  <td className="px-4 py-3 text-center text-neutral-500">
                    {o._count.items}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCLP(o.total)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.estado} />
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
