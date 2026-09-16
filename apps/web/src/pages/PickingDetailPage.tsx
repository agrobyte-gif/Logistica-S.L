import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, PageHeader, StatusBadge } from '../components/ui';

interface PItem {
  id: string;
  cantidadSolicitada: string | number;
  cantidadPickeada: string | number;
  estado: string;
  observacion?: string | null;
  product: { sku: string; nombre: string; unidadBase: string };
}
interface PickingDetail {
  id: string;
  numero: string;
  estado: string;
  salesOrder: { numero: string; customer: { razonSocial: string } };
  warehouse: { nombre: string };
  items: PItem[];
}

const ITEM_STATES = ['OK', 'FALTANTE', 'SUSTITUCION'] as const;

export function PickingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [pk, setPk] = useState<PickingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setPk(await api.get<PickingDetail>(`/pickings/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(path: string) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/pickings/${id}/${path}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo completar la acción');
    } finally {
      setBusy(false);
    }
  }

  if (error && !pk) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }
  if (!pk) return <div className="p-8 text-neutral-400">Cargando…</div>;

  const canExecute = hasPermission('picking:execute');
  const editable = ['PENDIENTE', 'EN_PROCESO', 'INCOMPLETO'].includes(pk.estado);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={pk.numero}
        subtitle={`Pedido ${pk.salesOrder.numero} · ${pk.salesOrder.customer.razonSocial}`}
        action={
          <Button variant="ghost" onClick={() => navigate('/bodega/picking')}>
            ← Volver
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={pk.estado} />
        <span className="text-sm text-neutral-500">{pk.warehouse.nombre}</span>
        {canExecute && pk.estado === 'PENDIENTE' && (
          <Button onClick={() => void action('start')} disabled={busy}>
            Iniciar picking
          </Button>
        )}
        {canExecute && (pk.estado === 'EN_PROCESO' || pk.estado === 'INCOMPLETO') && (
          <Button onClick={() => void action('finalize')} disabled={busy}>
            Cerrar picking
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {pk.items.map((it) => (
          <PickingItemRow
            key={it.id}
            pickingId={pk.id}
            item={it}
            editable={canExecute && editable}
            onSaved={load}
            onError={setError}
          />
        ))}
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        No se puede cerrar el picking con diferencias (faltantes, sustituciones o
        cantidad menor) sin una justificación en la línea (§17).
      </p>
    </div>
  );
}

function PickingItemRow({
  pickingId,
  item,
  editable,
  onSaved,
  onError,
}: {
  pickingId: string;
  item: PItem;
  editable: boolean;
  onSaved: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [cantidad, setCantidad] = useState(String(item.cantidadPickeada));
  const [estado, setEstado] = useState(item.estado === 'PENDIENTE' ? 'OK' : item.estado);
  const [obs, setObs] = useState(item.observacion ?? '');
  const [saving, setSaving] = useState(false);

  const solicitada = Number(item.cantidadSolicitada);
  const hayDiferencia =
    Number(cantidad) !== solicitada || estado === 'FALTANTE' || estado === 'SUSTITUCION';

  async function save() {
    setSaving(true);
    try {
      await api.post(`/pickings/${pickingId}/items/${item.id}`, {
        cantidadPickeada: Number(cantidad),
        estado,
        observacion: obs || undefined,
      });
      await onSaved();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'No se pudo guardar la línea');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-neutral-700 dark:text-neutral-200">
            {item.product.nombre}
          </div>
          <div className="font-mono text-xs text-neutral-400">{item.product.sku}</div>
        </div>
        <div className="text-right text-sm text-neutral-500">
          Solicitado:{' '}
          <span className="font-semibold tabular-nums">
            {solicitada.toLocaleString('es-CL')} {item.product.unidadBase}
          </span>
          <div className="mt-1">
            <StatusBadge status={item.estado} />
          </div>
        </div>
      </div>

      {editable ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-[7rem_9rem_1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">Pickeado</span>
            <input
              type="number"
              min={0}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">Estado</span>
            <select
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
            >
              {ITEM_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-neutral-500">
              Justificación {hayDiferencia && <span className="text-red-500">*</span>}
            </span>
            <input
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              placeholder={hayDiferencia ? 'Requerida por diferencia' : 'Opcional'}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
            />
          </label>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? '…' : 'Guardar'}
          </Button>
        </div>
      ) : (
        <div className="mt-2 text-sm text-neutral-500">
          Pickeado:{' '}
          <span className="tabular-nums">
            {Number(item.cantidadPickeada).toLocaleString('es-CL')}
          </span>
          {item.observacion && ` · ${item.observacion}`}
        </div>
      )}
    </div>
  );
}
