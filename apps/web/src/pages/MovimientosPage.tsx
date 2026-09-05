import { useEffect, useState } from 'react';
import { api, ApiError, type Paginated } from '../api/client';
import { PageHeader } from '../components/ui';

interface Movement {
  id: string;
  tipo: string;
  cantidad: string | number;
  createdAt: string;
  notas?: string | null;
  product: { sku: string; nombre: string };
  warehouse: { nombre: string };
}

export function MovimientosPage() {
  const [rows, setRows] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Paginated<Movement>>('/inventory/movements?pageSize=100')
      .then((res) => setRows(res.data))
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Error al cargar'),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Movimientos de inventario"
        subtitle="Libro mayor append-only: entradas, salidas, ajustes, mermas y transferencias"
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
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Bodega</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
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
                  Sin movimientos
                </td>
              </tr>
            ) : (
              rows.map((m) => {
                const cant = Number(m.cantidad);
                return (
                  <tr
                    key={m.id}
                    className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                  >
                    <td className="px-4 py-3 text-xs text-neutral-500">
                      {new Date(m.createdAt).toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-700 dark:text-neutral-200">
                        {m.product.nombre}
                      </div>
                      <div className="font-mono text-xs text-neutral-400">
                        {m.product.sku}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {m.warehouse.nombre}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-medium tabular-nums ${
                        cant < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {cant > 0 ? '+' : ''}
                      {cant.toLocaleString('es-CL')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
