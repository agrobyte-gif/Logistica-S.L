import { useEffect, useState } from 'react';
import { api, ApiError, type Paginated } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  Field,
  inputClass,
  Modal,
  PageHeader,
} from '../components/ui';

interface StockRow {
  id: string;
  cantidadFisica: string | number;
  cantidadReservada: string | number;
  disponible: number;
  bajoMinimo: boolean;
  product: { id: string; sku: string; nombre: string; stockMinimo: string | number };
  warehouse: { id: string; nombre: string };
}

export function StockPage() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<StockRow | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Paginated<StockRow>>(
        `/inventory/stock?pageSize=100${q ? `&q=${encodeURIComponent(q)}` : ''}`,
      );
      setRows(res.data);
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

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Stock" subtitle="Inventario por producto y bodega" />

      <div className="mb-4 flex gap-2">
        <input
          className={inputClass}
          placeholder="Buscar producto…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void load()}
        />
        <Button variant="ghost" onClick={() => void load()}>
          Buscar
        </Button>
      </div>

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
              <th className="px-4 py-3">Bodega</th>
              <th className="px-4 py-3 text-right">Física</th>
              <th className="px-4 py-3 text-right">Reservada</th>
              <th className="px-4 py-3 text-right">Disponible</th>
              {hasPermission('inventory:adjust') && <th className="px-4 py-3"></th>}
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
                  Sin stock registrado
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
                  <td className="px-4 py-3 text-neutral-500">
                    {r.warehouse.nombre}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(r.cantidadFisica).toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-neutral-500">
                    {Number(r.cantidadReservada).toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    <span
                      className={
                        r.bajoMinimo
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-neutral-800 dark:text-neutral-100'
                      }
                    >
                      {r.disponible.toLocaleString('es-CL')}
                    </span>
                    {r.bajoMinimo && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        bajo mínimo
                      </span>
                    )}
                  </td>
                  {hasPermission('inventory:adjust') && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setAdjust(r)}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Ajustar
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AjusteModal
        row={adjust}
        onClose={() => setAdjust(null)}
        onDone={() => {
          setAdjust(null);
          void load();
        }}
      />
    </div>
  );
}

function AjusteModal({
  row,
  onClose,
  onDone,
}: {
  row: StockRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [delta, setDelta] = useState('');
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!row) return;
    setSaving(true);
    setError(null);
    try {
      await api.post('/inventory/adjust', {
        warehouseId: row.warehouse.id,
        productId: row.product.id,
        delta: Number(delta),
        motivo,
      });
      setDelta('');
      setMotivo('');
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo ajustar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={row ? `Ajustar stock · ${row.product.nombre}` : 'Ajustar'}
      open={!!row}
      onClose={onClose}
    >
      <div className="space-y-4">
        <p className="text-sm text-neutral-500">
          Usa valores negativos para descontar. Cada ajuste queda registrado en el
          libro mayor con su motivo.
        </p>
        <Field label="Delta (ej: -5 o 12)">
          <input
            className={inputClass}
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
          />
        </Field>
        <Field label="Motivo">
          <input
            className={inputClass}
            placeholder="Conteo físico, corrección…"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving || !delta || Number(delta) === 0 || !motivo}
          >
            {saving ? 'Guardando…' : 'Aplicar ajuste'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
