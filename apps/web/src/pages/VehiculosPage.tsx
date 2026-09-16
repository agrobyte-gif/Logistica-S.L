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

interface Vehicle {
  id: string;
  patente: string;
  tipo?: string | null;
  marca?: string | null;
  capacidadKg?: string | number | null;
  estado: string;
}

export function VehiculosPage() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Paginated<Vehicle>>('/vehicles?pageSize=50');
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
        title="Vehículos"
        subtitle="Logística · flota"
        action={
          hasPermission('vehicle:manage') && (
            <Button onClick={() => setModalOpen(true)}>+ Nuevo vehículo</Button>
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
              <th className="px-4 py-3">Patente</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Capacidad (kg)</th>
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
                  Sin vehículos
                </td>
              </tr>
            ) : (
              rows.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                >
                  <td className="px-4 py-3 font-mono text-xs">{v.patente}</td>
                  <td className="px-4 py-3 text-neutral-500">{v.tipo ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {v.capacidadKg ? Number(v.capacidadKg).toLocaleString('es-CL') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={v.estado} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NuevoVehiculoModal
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

function NuevoVehiculoModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [patente, setPatente] = useState('');
  const [tipo, setTipo] = useState('');
  const [capacidadKg, setCapacidadKg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api.post('/vehicles', {
        patente,
        tipo: tipo || undefined,
        capacidadKg: capacidadKg ? Number(capacidadKg) : undefined,
      });
      setPatente('');
      setTipo('');
      setCapacidadKg('');
      onCreated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nuevo vehículo" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Patente">
          <input className={inputClass} value={patente} onChange={(e) => setPatente(e.target.value)} />
        </Field>
        <Field label="Tipo">
          <input
            className={inputClass}
            placeholder="Camión refrigerado, furgón…"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          />
        </Field>
        <Field label="Capacidad (kg)">
          <input
            className={inputClass}
            type="number"
            value={capacidadKg}
            onChange={(e) => setCapacidadKg(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving || !patente}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
