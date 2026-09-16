import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Paginated } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  AgingBadge,
  Button,
  Field,
  formatCLP,
  inputClass,
  Modal,
  PageHeader,
} from '../components/ui';

interface AgingRow {
  id: string;
  folio: string;
  contraparte: string;
  saldo: number;
  fechaVencim: string | null;
  aging: string;
}
interface AgingResult {
  rows: AgingRow[];
  totalSaldo: number;
  totalVencido: number;
}
interface SupplierOpt {
  id: string;
  razonSocial: string;
}

export function CuentasPagarPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('payable:manage');
  const [data, setData] = useState<AgingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [payFor, setPayFor] = useState<AgingRow | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.get<AgingResult>('/finance/payables'));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Cuentas por pagar"
        subtitle="Facturas de proveedor con saldo y su vencimiento"
        action={
          canManage && (
            <Button onClick={() => setCreateOpen(true)}>+ Factura proveedor</Button>
          )
        }
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-xs text-neutral-500">Total por pagar</div>
          <div className="mt-1 text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            {formatCLP(data?.totalSaldo ?? 0)}
          </div>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-xs text-neutral-500">Vencido</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCLP(data?.totalVencido ?? 0)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
            <tr>
              <th className="px-4 py-3">Folio</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Vencimiento</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Sin saldos pendientes
                </td>
              </tr>
            ) : (
              data!.rows.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                  <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                    {r.folio}
                  </td>
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">{r.contraparte}</td>
                  <td className="px-4 py-3 text-neutral-500">
                    {r.fechaVencim ? new Date(r.fechaVencim).toLocaleDateString('es-CL') : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCLP(r.saldo)}</td>
                  <td className="px-4 py-3"><AgingBadge aging={r.aging} /></td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <button onClick={() => setPayFor(r)} className="text-xs text-brand-600 hover:underline">
                        Pagar
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CreateSupplierInvoiceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={() => {
          setCreateOpen(false);
          void load();
        }}
      />
      <PaySupplierModal
        row={payFor}
        onClose={() => setPayFor(null)}
        onDone={() => {
          setPayFor(null);
          void load();
        }}
      />
    </div>
  );
}

function CreateSupplierInvoiceModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [folio, setFolio] = useState('');
  const [neto, setNeto] = useState('');
  const [fechaVencim, setFechaVencim] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      api
        .get<Paginated<SupplierOpt>>('/suppliers?pageSize=100')
        .then((res) => setSuppliers(res.data))
        .catch(() => setSuppliers([]));
    }
  }, [open]);

  async function save() {
    setError(null);
    try {
      await api.post('/finance/supplier-invoices', {
        supplierId,
        folio,
        neto: Number(neto),
        fechaVencim: fechaVencim || undefined,
      });
      setSupplierId('');
      setFolio('');
      setNeto('');
      setFechaVencim('');
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo registrar');
    }
  }

  return (
    <Modal title="Registrar factura de proveedor" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Proveedor">
          <select className={inputClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">— Selecciona —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.razonSocial}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Folio">
            <input className={inputClass} value={folio} onChange={(e) => setFolio(e.target.value)} />
          </Field>
          <Field label="Neto">
            <input className={inputClass} type="number" value={neto} onChange={(e) => setNeto(e.target.value)} />
          </Field>
        </div>
        <Field label="Vencimiento">
          <input className={inputClass} type="date" value={fechaVencim} onChange={(e) => setFechaVencim(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={!supplierId || !folio || !neto}>
            Registrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function PaySupplierModal({
  row,
  onClose,
  onDone,
}: {
  row: AgingRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [monto, setMonto] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!row) return;
    setError(null);
    try {
      await api.post(`/finance/supplier-invoices/${row.id}/payments`, {
        monto: Number(monto),
      });
      setMonto('');
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo registrar');
    }
  }

  return (
    <Modal title="Pagar factura de proveedor" open={!!row} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-neutral-500">Saldo: {formatCLP(row?.saldo ?? 0)}</p>
        <Field label="Monto">
          <input className={inputClass} type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={!monto || Number(monto) <= 0}>Pagar</Button>
        </div>
      </div>
    </Modal>
  );
}
