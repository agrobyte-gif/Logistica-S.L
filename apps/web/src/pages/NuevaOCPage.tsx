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

interface SupplierOpt {
  id: string;
  razonSocial: string;
}
interface ProductOpt {
  id: string;
  sku: string;
  nombre: string;
}
interface PurchaseRequest {
  id: string;
  cantidad: string | number;
  product: { id: string; nombre: string };
}
interface ItemRow {
  productId: string;
  cantidad: string;
  precioUnitario: string;
}

export function NuevaOCPage() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<ItemRow[]>([
    { productId: '', cantidad: '', precioUnitario: '' },
  ]);
  const [requestIds, setRequestIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Paginated<SupplierOpt>>('/suppliers?pageSize=100'),
      api.get<Paginated<ProductOpt>>('/products?pageSize=100'),
    ])
      .then(([s, p]) => {
        setSuppliers(s.data);
        setProducts(p.data);
      })
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : 'Error al cargar datos'),
      );
  }, []);

  async function loadNeeds() {
    try {
      const res = await api.get<Paginated<PurchaseRequest>>(
        '/purchase-requests?estado=PENDIENTE&pageSize=100',
      );
      if (res.data.length === 0) {
        setError('No hay necesidades pendientes');
        return;
      }
      setItems(
        res.data.map((r) => ({
          productId: r.product.id,
          cantidad: String(Number(r.cantidad)),
          precioUnitario: '',
        })),
      );
      setRequestIds(res.data.map((r) => r.id));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar');
    }
  }

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  const total = items.reduce(
    (s, it) => s + Number(it.cantidad || 0) * Number(it.precioUnitario || 0),
    0,
  );

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        supplierId,
        purchaseRequestIds: requestIds.length ? requestIds : undefined,
        items: items
          .filter((it) => it.productId && Number(it.cantidad) > 0)
          .map((it) => ({
            productId: it.productId,
            cantidad: Number(it.cantidad),
            precioUnitario: Number(it.precioUnitario || 0),
          })),
      };
      if (!payload.supplierId) throw new ApiError(400, 'Selecciona un proveedor');
      if (payload.items.length === 0)
        throw new ApiError(400, 'Agrega al menos un producto');
      const oc = await api.post<{ id: string }>('/purchase-orders', payload);
      navigate(`/compras/ordenes/${oc.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo crear la OC');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Nueva orden de compra"
        action={
          <Button variant="ghost" onClick={() => navigate('/compras/ordenes')}>
            ← Volver
          </Button>
        }
      />

      <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Field label="Proveedor">
              <select
                className={inputClass}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">— Selecciona —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.razonSocial}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Button variant="ghost" onClick={() => void loadNeeds()}>
            Cargar necesidades
          </Button>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Productos</span>
            <button
              onClick={() =>
                setItems((p) => [
                  ...p,
                  { productId: '', cantidad: '', precioUnitario: '' },
                ])
              }
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
                  className={`${inputClass} w-24`}
                  type="number"
                  placeholder="Cant."
                  value={it.cantidad}
                  onChange={(e) => updateItem(idx, { cantidad: e.target.value })}
                />
                <input
                  className={`${inputClass} w-28`}
                  type="number"
                  placeholder="Precio"
                  value={it.precioUnitario}
                  onChange={(e) =>
                    updateItem(idx, { precioUnitario: e.target.value })
                  }
                />
                <button
                  onClick={() =>
                    setItems((p) => p.filter((_, i) => i !== idx))
                  }
                  className="px-2 text-neutral-400 hover:text-red-500"
                  disabled={items.length === 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <span className="text-sm text-neutral-500">
            Total:{' '}
            <span className="font-semibold text-neutral-700 dark:text-neutral-200">
              {formatCLP(total)}
            </span>
          </span>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? 'Creando…' : 'Crear OC'}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
