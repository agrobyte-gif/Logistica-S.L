import { useCallback, useEffect, useState } from 'react';
import { CashMovementType } from '@agrogood/shared';
import { api, ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  Button,
  Field,
  formatCLP,
  inputClass,
  Modal,
  PageHeader,
  StatusBadge,
} from '../components/ui';

interface Register {
  id: string;
  nombre: string;
  estado: string;
  saldoInicial: string | number;
  saldoActual: string | number;
  abiertaAt: string;
}
interface Movement {
  id: string;
  tipo: string;
  monto: string | number;
  categoria?: string | null;
  descripcion?: string | null;
  createdAt: string;
}

export function CajaPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('cash:manage');
  const [registers, setRegisters] = useState<Register[]>([]);
  const [sel, setSel] = useState<Register | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [movModal, setMovModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const regs = await api.get<Register[]>('/cash/registers');
      setRegisters(regs);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = useCallback(async (r: Register) => {
    const full = await api.get<Register & { movements: Movement[] }>(
      `/cash/registers/${r.id}`,
    );
    setSel(full);
    setMovements(full.movements);
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Caja chica"
        subtitle="Apertura, ingresos/egresos, rendición y cierre"
        action={
          canManage && (
            <Button onClick={() => setOpenModal(true)}>+ Abrir caja</Button>
          )
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {registers.length === 0 ? (
          <p className="py-8 text-center text-neutral-400">Sin cajas</p>
        ) : (
          registers.map((r) => (
            <button
              key={r.id}
              onClick={() => void openDetail(r)}
              className={`rounded-2xl border p-5 text-left transition-colors ${
                sel?.id === r.id
                  ? 'border-brand-400 bg-brand-50/40 dark:border-brand-700 dark:bg-brand-900/20'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-neutral-800 dark:text-neutral-100">
                  {r.nombre}
                </span>
                <StatusBadge status={r.estado} />
              </div>
              <div className="mt-2 text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                {formatCLP(r.saldoActual)}
              </div>
              <div className="text-xs text-neutral-400">
                Inicial {formatCLP(r.saldoInicial)}
              </div>
            </button>
          ))
        )}
      </div>

      {sel && (
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between border-b border-neutral-100 p-4 dark:border-neutral-800">
            <h2 className="font-semibold text-neutral-800 dark:text-neutral-100">
              Movimientos · {sel.nombre}
            </h2>
            {canManage && sel.estado === 'ABIERTA' && (
              <div className="flex gap-2">
                <Button onClick={() => setMovModal(true)}>+ Movimiento</Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await api.post(`/cash/registers/${sel.id}/close`);
                    await load();
                    await openDetail(sel);
                  }}
                >
                  Cerrar caja
                </Button>
              </div>
            )}
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="px-4 py-2">Fecha</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2">Categoría</th>
                <th className="px-4 py-2 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-400">
                    Sin movimientos
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="border-t border-neutral-100 dark:border-neutral-800/60">
                    <td className="px-4 py-2 text-xs text-neutral-500">
                      {new Date(m.createdAt).toLocaleString('es-CL')}
                    </td>
                    <td className="px-4 py-2">{m.tipo}</td>
                    <td className="px-4 py-2 text-neutral-500">
                      {m.categoria ?? '—'}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${
                        m.tipo === 'EGRESO'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {m.tipo === 'EGRESO' ? '-' : '+'}
                      {formatCLP(m.monto)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <OpenCajaModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onDone={() => {
          setOpenModal(false);
          void load();
        }}
      />
      {sel && (
        <MovModal
          open={movModal}
          registerId={sel.id}
          onClose={() => setMovModal(false)}
          onDone={async () => {
            setMovModal(false);
            await load();
            await openDetail(sel);
          }}
        />
      )}
    </div>
  );
}

function OpenCajaModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [nombre, setNombre] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      await api.post('/cash/registers', {
        nombre,
        saldoInicial: Number(saldoInicial || 0),
      });
      setNombre('');
      setSaldoInicial('');
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo abrir');
    }
  }

  return (
    <Modal title="Abrir caja" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Nombre">
          <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Saldo inicial">
          <input
            className={inputClass}
            type="number"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={!nombre}>Abrir</Button>
        </div>
      </div>
    </Modal>
  );
}

function MovModal({
  open,
  registerId,
  onClose,
  onDone,
}: {
  open: boolean;
  registerId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [tipo, setTipo] = useState<CashMovementType>(CashMovementType.EGRESO);
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    try {
      await api.post(`/cash/registers/${registerId}/movements`, {
        tipo,
        monto: Number(monto),
        categoria: categoria || undefined,
      });
      setMonto('');
      setCategoria('');
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo registrar');
    }
  }

  return (
    <Modal title="Registrar movimiento" open={open} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <select className={inputClass} value={tipo} onChange={(e) => setTipo(e.target.value as CashMovementType)}>
              {Object.values(CashMovementType).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Monto">
            <input className={inputClass} type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </Field>
        </div>
        <Field label="Categoría">
          <input className={inputClass} value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Combustible, insumos…" />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={!monto || Number(monto) <= 0}>Registrar</Button>
        </div>
      </div>
    </Modal>
  );
}
