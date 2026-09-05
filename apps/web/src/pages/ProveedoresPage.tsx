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

interface Supplier {
  id: string;
  rut: string;
  razonSocial: string;
  telefono?: string | null;
  email?: string | null;
  estado: string;
}

export function ProveedoresPage() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Paginated<Supplier>>('/suppliers?pageSize=50');
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
        title="Proveedores"
        subtitle="Compras · maestro de proveedores"
        action={
          hasPermission('supplier:create') && (
            <Button onClick={() => setModalOpen(true)}>+ Nuevo proveedor</Button>
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
              <th className="px-4 py-3">RUT</th>
              <th className="px-4 py-3">Razón social</th>
              <th className="px-4 py-3">Contacto</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-neutral-400">
                  Sin proveedores
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                >
                  <td className="px-4 py-3 font-mono text-xs">{s.rut}</td>
                  <td className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-200">
                    {s.razonSocial}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {s.email ?? s.telefono ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NuevoProveedorModal
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

function NuevoProveedorModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [rut, setRut] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.post('/suppliers', { rut, razonSocial, email: email || undefined });
      setRut('');
      setRazonSocial('');
      setEmail('');
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo proveedor" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Field label="RUT">
          <input className={inputClass} value={rut} onChange={(e) => setRut(e.target.value)} />
        </Field>
        <Field label="Razón social">
          <input
            className={inputClass}
            value={razonSocial}
            onChange={(e) => setRazonSocial(e.target.value)}
          />
        </Field>
        <Field label="Email">
          <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving || !rut || !razonSocial}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
