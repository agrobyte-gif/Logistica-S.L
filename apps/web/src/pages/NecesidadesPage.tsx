import { useEffect, useState } from 'react';
import { api, ApiError, type Paginated } from '../api/client';
import { PageHeader, StatusBadge } from '../components/ui';

interface PurchaseRequest {
  id: string;
  cantidad: string | number;
  origen: string;
  estado: string;
  createdAt: string;
  product: { sku: string; nombre: string };
  salesOrder?: { numero: string } | null;
}

export function NecesidadesPage() {
  const [rows, setRows] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Paginated<PurchaseRequest>>('/purchase-requests?pageSize=50')
      .then((res) => setRows(res.data))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Error al cargar'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Necesidades de compra"
        subtitle="Generadas automáticamente cuando falta stock (§10). Flujo completo de compras en Fase 3."
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
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
              <th className="px-4 py-3">Origen</th>
              <th className="px-4 py-3">Pedido</th>
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
                  Sin necesidades pendientes
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-700 dark:text-neutral-200">
                      {r.product.nombre}
                    </div>
                    <div className="font-mono text-xs text-neutral-400">
                      {r.product.sku}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(r.cantidad).toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{r.origen}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                    {r.salesOrder?.numero ?? '—'}
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
