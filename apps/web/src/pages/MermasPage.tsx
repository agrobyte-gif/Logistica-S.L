import { useEffect, useState } from 'react';
import { WasteReason } from '@agrogood/shared';
import { api, ApiError, type Paginated } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  Field,
  formatCLP,
  inputClass,
  Modal,
  PageHeader,
} from '../components/ui';

interface WasteRow {
  id: string;
  cantidad: string | number;
  motivo: string;
  costo?: string | number | null;
  observacion?: string | null;
  createdAt: string;
  product: { sku: string; nombre: string };
  warehouse: { nombre: string };
}
interface ReasonSummary {
  motivo: string;
  cantidad: number;
  costo: number;
  registros: number;
}
interface StockRow {
  product: { id: string; sku: string; nombre: string };
  warehouse: { id: string; nombre: string };
}

export function MermasPage() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<WasteRow[]>([]);
  const [summary, setSummary] = useState<ReasonSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [w, s] = await Promise.all([
        api.get<Paginated<WasteRow>>('/waste?pageSize=50'),
        api.get<ReasonSummary[]>('/waste/summary'),
      ]);
      setRows(w.data);
      setSummary(s);
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

  const totalCosto = summary.reduce((s, r) => s + r.costo, 0);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Mermas"
        subtitle="Control de mermas · descuenta stock y valoriza la pérdida"
        action={
          hasPermission('waste:create') && (
            <Button onClick={() => setModalOpen(true)}>+ Registrar merma</Button>
          )
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {summary.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="text-xs text-neutral-500">Costo total merma</div>
            <div className="mt-1 text-xl font-bold text-red-600 dark:text-red-400">
              {formatCLP(totalCosto)}
            </div>
          </div>
          {summary.slice(0, 3).map((s) => (
            <div
              key={s.motivo}
              className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="text-xs text-neutral-500">{s.motivo}</div>
              <div className="mt-1 text-xl font-bold text-neutral-800 dark:text-neutral-100">
                {s.cantidad.toLocaleString('es-CL')}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Motivo</th>
              <th className="px-4 py-3 text-right">Cantidad</th>
              <th className="px-4 py-3 text-right">Costo</th>
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
                  Sin mermas registradas
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                >
                  <td className="px-4 py-3 text-xs text-neutral-500">
                    {new Date(r.createdAt).toLocaleDateString('es-CL')}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-200">
                    {r.product.nombre}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{r.motivo}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {Number(r.cantidad).toLocaleString('es-CL')}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCLP(r.costo ?? null)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NuevaMermaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onDone={() => {
          setModalOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function NuevaMermaModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [sel, setSel] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState<WasteReason>(WasteReason.VENCIMIENTO);
  const [observacion, setObservacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      api
        .get<Paginated<StockRow>>('/inventory/stock?pageSize=100')
        .then((res) => setStock(res.data))
        .catch(() => setStock([]));
    }
  }, [open]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const [warehouseId, productId] = sel.split('|');
      await api.post('/waste', {
        warehouseId,
        productId,
        cantidad: Number(cantidad),
        motivo,
        observacion: observacion || undefined,
      });
      setSel('');
      setCantidad('');
      setObservacion('');
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo registrar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Registrar merma" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Producto (en bodega)">
          <select
            className={inputClass}
            value={sel}
            onChange={(e) => setSel(e.target.value)}
          >
            <option value="">— Selecciona —</option>
            {stock.map((s) => (
              <option
                key={`${s.warehouse.id}|${s.product.id}`}
                value={`${s.warehouse.id}|${s.product.id}`}
              >
                {s.product.nombre} · {s.warehouse.nombre}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cantidad">
            <input
              className={inputClass}
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </Field>
          <Field label="Motivo">
            <select
              className={inputClass}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as WasteReason)}
            >
              {Object.values(WasteReason).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Observación">
          <textarea
            className={inputClass}
            rows={2}
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving || !sel || !cantidad || Number(cantidad) <= 0}
          >
            {saving ? 'Guardando…' : 'Registrar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
