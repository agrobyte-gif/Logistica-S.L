import { useEffect, useState } from 'react';
import { ProductUnit } from '@agrogood/shared';
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

interface Product {
  id: string;
  sku: string;
  nombre: string;
  unidadBase: string;
  marca?: string | null;
  precioVenta?: string | number | null;
  estado: string;
}

export function ProductosPage() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Paginated<Product>>(
        `/products?pageSize=50${q ? `&q=${encodeURIComponent(q)}` : ''}`,
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
      <PageHeader
        title="Productos"
        subtitle="Maestro de productos"
        action={
          hasPermission('product:create') && (
            <Button onClick={() => setModalOpen(true)}>+ Nuevo producto</Button>
          )
        }
      />

      <div className="mb-4 flex gap-2">
        <input
          className={inputClass}
          placeholder="Buscar por nombre, SKU o código de barras…"
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
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Unidad</th>
              <th className="px-4 py-3 text-right">Precio</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  Sin productos
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                >
                  <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-200">
                    {p.nombre}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{p.unidadBase}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCLP(p.precioVenta ?? null)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NuevoProductoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function NuevoProductoModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [sku, setSku] = useState('');
  const [nombre, setNombre] = useState('');
  const [unidadBase, setUnidadBase] = useState<ProductUnit>(ProductUnit.KG);
  const [precioVenta, setPrecioVenta] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.post('/products', {
        sku,
        nombre,
        unidadBase,
        precioVenta: precioVenta ? Number(precioVenta) : undefined,
      });
      setSku('');
      setNombre('');
      setPrecioVenta('');
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo producto" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Field label="SKU">
          <input className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} />
        </Field>
        <Field label="Nombre">
          <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidad">
            <select
              className={inputClass}
              value={unidadBase}
              onChange={(e) => setUnidadBase(e.target.value as ProductUnit)}
            >
              {Object.values(ProductUnit).map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Precio venta (CLP)">
            <input
              className={inputClass}
              type="number"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
            />
          </Field>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving || !sku || !nombre}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
