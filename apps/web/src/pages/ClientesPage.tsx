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

interface Customer {
  id: string;
  rut: string;
  razonSocial: string;
  nombreComercial?: string | null;
  tipoCliente?: string | null;
  estado: string;
}

export function ClientesPage() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Paginated<Customer>>(
        `/customers?pageSize=50${q ? `&q=${encodeURIComponent(q)}` : ''}`,
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
        title="Clientes"
        subtitle="CRM · ficha de clientes"
        action={
          hasPermission('customer:create') && (
            <Button onClick={() => setModalOpen(true)}>+ Nuevo cliente</Button>
          )
        }
      />

      <div className="mb-4 flex gap-2">
        <input
          className={inputClass}
          placeholder="Buscar por razón social o RUT…"
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
              <th className="px-4 py-3">RUT</th>
              <th className="px-4 py-3">Razón social</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Estado</th>
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
                  Sin clientes
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                >
                  <td className="px-4 py-3 font-mono text-xs">{c.rut}</td>
                  <td className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-200">
                    {c.razonSocial}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {c.tipoCliente ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{c.estado}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NuevoClienteModal
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

function NuevoClienteModal({
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
  const [tipoCliente, setTipoCliente] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.post('/customers', { rut, razonSocial, tipoCliente });
      setRut('');
      setRazonSocial('');
      setTipoCliente('');
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo cliente" open={open} onClose={onClose}>
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
        <Field label="Tipo de cliente">
          <input
            className={inputClass}
            placeholder="RESTAURANT, HOTEL, SUSHI…"
            value={tipoCliente}
            onChange={(e) => setTipoCliente(e.target.value)}
          />
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
