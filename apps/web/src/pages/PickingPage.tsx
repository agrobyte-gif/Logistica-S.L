import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, type Paginated } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  Field,
  inputClass,
  Modal,
  PageHeader,
  StatusBadge,
} from '../components/ui';

interface PickingRow {
  id: string;
  numero: string;
  estado: string;
  createdAt: string;
  salesOrder: { numero: string; customer: { razonSocial: string } };
  _count: { items: number };
}
interface ConfirmedOrder {
  id: string;
  numero: string;
  estado: string;
  customer: { razonSocial: string };
}

export function PickingPage() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<PickingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Paginated<PickingRow>>('/pickings?pageSize=50');
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
      <PageHeader
        title="Picking"
        subtitle="Preparación de pedidos"
        action={
          hasPermission('picking:create') && (
            <Button onClick={() => setModalOpen(true)}>+ Nuevo picking</Button>
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
              <th className="px-4 py-3">Picking</th>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 text-right">Líneas</th>
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
                  Sin pickings
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/bodega/picking/${p.id}`)}
                  className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800/60 dark:hover:bg-neutral-800/40"
                >
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                    {p.numero}
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-200">
                    {p.salesOrder.numero}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {p.salesOrder.customer.razonSocial}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p._count.items}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.estado} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NuevoPickingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(id) => {
          setModalOpen(false);
          navigate(`/bodega/picking/${id}`);
        }}
      />
    </div>
  );
}

function NuevoPickingModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [orders, setOrders] = useState<ConfirmedOrder[]>([]);
  const [salesOrderId, setSalesOrderId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      try {
        // Pedidos preparables: confirmados o en espera de compra.
        const [a, b] = await Promise.all([
          api.get<Paginated<ConfirmedOrder>>(
            '/sales-orders?estado=CONFIRMADO&pageSize=50',
          ),
          api.get<Paginated<ConfirmedOrder>>(
            '/sales-orders?estado=ESPERANDO_COMPRA&pageSize=50',
          ),
        ]);
        setOrders([...a.data, ...b.data]);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Error al cargar pedidos');
      }
    })();
  }, [open]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.post<{ id: string }>('/pickings', { salesOrderId });
      onCreated(res.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo crear');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo picking" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Pedido a preparar">
          <select
            className={inputClass}
            value={salesOrderId}
            onChange={(e) => setSalesOrderId(e.target.value)}
          >
            <option value="">Selecciona un pedido…</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.numero} · {o.customer.razonSocial} ({o.estado})
              </option>
            ))}
          </select>
        </Field>
        {orders.length === 0 && (
          <p className="text-sm text-neutral-400">
            No hay pedidos confirmados pendientes de preparar.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving || !salesOrderId}>
            {saving ? 'Creando…' : 'Crear picking'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
