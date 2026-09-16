import { useEffect, useState } from 'react';
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

interface Driver {
  id: string;
  nombre: string;
  licencia?: string | null;
  telefono?: string | null;
  estado: string;
}

export function ConductoresPage() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Paginated<Driver>>('/drivers?pageSize=50');
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
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Conductores"
        subtitle="Logística · personal de reparto"
        action={
          hasPermission('driver:manage') && (
            <Button onClick={() => setModalOpen(true)}>+ Nuevo conductor</Button>
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
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Licencia</th>
              <th className="px-4 py-3">Teléfono</th>
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
                  Sin conductores
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                >
                  <td className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-200">
                    {d.nombre}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{d.licencia ?? '—'}</td>
                  <td className="px-4 py-3 text-neutral-500">{d.telefono ?? '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.estado} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NuevoConductorModal
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

function NuevoConductorModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [licencia, setLicencia] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.post('/drivers', {
        nombre,
        licencia: licencia || undefined,
        telefono: telefono || undefined,
      });
      setNombre('');
      setLicencia('');
      setTelefono('');
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo conductor" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nombre">
          <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Licencia">
          <input className={inputClass} value={licencia} onChange={(e) => setLicencia(e.target.value)} />
        </Field>
        <Field label="Teléfono">
          <input className={inputClass} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving || !nombre}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
