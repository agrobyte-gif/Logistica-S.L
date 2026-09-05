import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  formatCLP,
  Modal,
  PageHeader,
  StatusBadge,
} from '../components/ui';

interface OCItem {
  id: string;
  cantidad: string | number;
  precioUnitario: string | number;
  cantidadRecibida: string | number;
  productId: string;
  product: { sku: string; nombre: string };
}
interface OCDetail {
  id: string;
  numero: string;
  estado: string;
  total: string | number;
  supplier: { razonSocial: string; rut: string };
  items: OCItem[];
}

export function OCDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [oc, setOc] = useState<OCDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receiving, setReceiving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setOc(await api.get<OCDetail>(`/purchase-orders/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function approve() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/purchase-orders/${id}/approve`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo aprobar');
    } finally {
      setBusy(false);
    }
  }

  if (error && !oc) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }
  if (!oc) return <div className="p-8 text-neutral-400">Cargando…</div>;

  const canApprove = oc.estado === 'BORRADOR' && hasPermission('purchase_order:approve');
  const canReceive =
    ['APROBADA', 'ENVIADA', 'RECIBIDA_PARCIAL'].includes(oc.estado) &&
    hasPermission('goods_receipt:create');

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={oc.numero}
        subtitle={`Proveedor: ${oc.supplier.razonSocial}`}
        action={
          <Button variant="ghost" onClick={() => navigate('/compras/ordenes')}>
            ← Volver
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={oc.estado} />
        <span className="text-sm text-neutral-500">
          Total: <span className="font-semibold">{formatCLP(oc.total)}</span>
        </span>
        {canApprove && (
          <Button onClick={() => void approve()} disabled={busy}>
            Aprobar
          </Button>
        )}
        {canReceive && (
          <Button variant="ghost" onClick={() => setReceiving(true)}>
            Recepcionar
          </Button>
        )}
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
              <th className="px-4 py-3 text-right">Pedido</th>
              <th className="px-4 py-3 text-right">Recibido</th>
              <th className="px-4 py-3 text-right">Precio</th>
            </tr>
          </thead>
          <tbody>
            {oc.items.map((it) => (
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
                  {Number(it.cantidad).toLocaleString('es-CL')}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {Number(it.cantidadRecibida).toLocaleString('es-CL')}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCLP(it.precioUnitario)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RecibirModal
        oc={receiving ? oc : null}
        onClose={() => setReceiving(false)}
        onDone={() => {
          setReceiving(false);
          void load();
        }}
      />
    </div>
  );
}

function RecibirModal({
  oc,
  onClose,
  onDone,
}: {
  oc: OCDetail | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (oc) {
      // Prefill con lo pendiente por recibir.
      const init: Record<string, string> = {};
      for (const it of oc.items) {
        const pend = Number(it.cantidad) - Number(it.cantidadRecibida);
        init[it.id] = pend > 0 ? String(pend) : '0';
      }
      setQtys(init);
    }
  }, [oc]);

  async function save() {
    if (!oc) return;
    setSaving(true);
    setError(null);
    try {
      const items = oc.items
        .map((it) => ({
          purchaseOrderItemId: it.id,
          productId: it.productId,
          cantidad: Number(qtys[it.id] || 0),
        }))
        .filter((it) => it.cantidad > 0);
      if (items.length === 0) throw new ApiError(400, 'Indica cantidades a recibir');
      await api.post(`/purchase-orders/${oc.id}/receive`, { items });
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo recepcionar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Recepcionar mercadería" open={!!oc} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-neutral-500">
          Confirma las cantidades recibidas. El stock se ingresa al confirmar.
        </p>
        <div className="space-y-2">
          {oc?.items.map((it) => (
            <div key={it.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">
                {it.product.nombre}
              </span>
              <input
                className="w-28 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                type="number"
                value={qtys[it.id] ?? ''}
                onChange={(e) =>
                  setQtys((q) => ({ ...q, [it.id]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Recibiendo…' : 'Confirmar recepción'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
