import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, type Paginated } from '../api/client';
import {
  Button,
  Field,
  formatCLP,
  inputClass,
  PageHeader,
} from '../components/ui';

interface CustomerOpt {
  id: string;
  razonSocial: string;
}
interface ProductOpt {
  id: string;
  sku: string;
  nombre: string;
  precioVenta?: string | number | null;
}
interface ItemRow {
  productId: string;
  cantidad: string;
}

export function NuevoPedidoPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [notas, setNotas] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ productId: '', cantidad: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Paginated<CustomerOpt>>('/customers?pageSize=100'),
      api.get<Paginated<ProductOpt>>('/products?pageSize=100'),
    ])
      .then(([c, p]) => {
        setCustomers(c.data);
        setProducts(p.data);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Error al cargar datos'),
      );
  }, []);

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  }
  function addItem() {
    setItems((prev) => [...prev, { productId: '', cantidad: '' }]);
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const priceOf = (productId: string) => {
    const p = products.find((x) => x.id === productId);
    return p?.precioVenta != null ? Number(p.precioVenta) : 0;
  };
  const estimatedTotal = items.reduce(
    (sum, it) =>
      sum + (it.productId ? priceOf(it.productId) * Number(it.cantidad || 0) : 0),
    0,
  );

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        customerId,
        notas: notas || undefined,
        items: items
          .filter((it) => it.productId && Number(it.cantidad) > 0)
          .map((it) => ({
            productId: it.productId,
            cantidad: Number(it.cantidad),
          })),
      };
      if (!payload.customerId) throw new ApiError(400, 'Selecciona un cliente');
      if (payload.items.length === 0)
        throw new ApiError(400, 'Agrega al menos un producto');
      const order = await api.post<{ id: string }>('/sales-orders', payload);
      navigate(`/ventas/pedidos/${order.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo crear el pedido');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Nuevo pedido"
        subtitle="El sistema validará el stock y creará necesidades de compra si falta."
        action={
          <Button variant="ghost" onClick={() => navigate('/ventas/pedidos')}>
            ← Volver
          </Button>
        }
      />

      <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <Field label="Cliente">
          <select
            className={inputClass}
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          >
            <option value="">— Selecciona —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razonSocial}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Productos</span>
            <button
              onClick={addItem}
              className="text-sm text-brand-600 hover:underline"
            >
              + Agregar línea
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  className={inputClass}
                  value={it.productId}
                  onChange={(e) => updateItem(idx, { productId: e.target.value })}
                >
                  <option value="">— Producto —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.sku})
                    </option>
                  ))}
                </select>
                <input
                  className={`${inputClass} w-28`}
                  type="number"
                  placeholder="Cant."
                  value={it.cantidad}
                  onChange={(e) => updateItem(idx, { cantidad: e.target.value })}
                />
                <div className="w-28 text-right text-sm tabular-nums text-neutral-500">
                  {formatCLP(priceOf(it.productId) * Number(it.cantidad || 0))}
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="px-2 text-neutral-400 hover:text-red-500"
                  aria-label="Quitar"
                  disabled={items.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <Field label="Notas">
          <textarea
            className={inputClass}
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <span className="text-sm text-neutral-500">
            Total estimado:{' '}
            <span className="font-semibold text-neutral-700 dark:text-neutral-200">
              {formatCLP(estimatedTotal)}
            </span>
          </span>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Creando…' : 'Crear pedido'}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
