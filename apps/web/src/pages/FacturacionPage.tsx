import { useCallback, useEffect, useState } from 'react';
import { DteType } from '@agrogood/shared';
import { api, ApiError, type Paginated } from '../api/client';
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

interface Invoice {
  id: string;
  tipoDte: string;
  folio: string;
  estado: string;
  total: string | number;
  pagado: string | number;
  fechaEmision: string;
  customer: { razonSocial: string };
}
interface CustomerOpt {
  id: string;
  razonSocial: string;
}

export function FacturacionPage() {
  const { hasPermission } = useAuth();
  const [rows, setRows] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [payFor, setPayFor] = useState<Invoice | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<Paginated<Invoice>>('/invoices?pageSize=50');
      setRows(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Facturación"
        subtitle="Registro de DTE emitidos en el SII (emisión manual en sii.cl)"
        action={
          hasPermission('invoice:manage') && (
            <Button onClick={() => setCreateOpen(true)}>+ Registrar DTE</Button>
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
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Pagado</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Sin documentos
                </td>
              </tr>
            ) : (
              rows.map((i) => {
                const saldo = Number(i.total) - Number(i.pagado);
                return (
                  <tr key={i.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                    <td className="px-4 py-3">
                      <div className="font-medium text-neutral-700 dark:text-neutral-200">
                        {i.tipoDte}
                      </div>
                      <div className="font-mono text-xs text-neutral-400">#{i.folio}</div>
                    </td>
                    <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">
                      {i.customer.razonSocial}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatCLP(i.total)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-500">
                      {formatCLP(i.pagado)}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={i.estado} /></td>
                    <td className="px-4 py-3 text-right">
                      {hasPermission('payment:register') &&
                        saldo > 0 &&
                        i.estado !== 'ANULADA' && (
                          <button
                            onClick={() => setPayFor(i)}
                            className="text-xs text-brand-600 hover:underline"
                          >
                            Registrar pago
                          </button>
                        )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CreateInvoiceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={() => {
          setCreateOpen(false);
          void load();
        }}
      />
      <PayModal
        invoice={payFor}
        onClose={() => setPayFor(null)}
        onDone={() => {
          setPayFor(null);
          void load();
        }}
      />
    </div>
  );
}

function CreateInvoiceModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [tipoDte, setTipoDte] = useState<DteType>(DteType.FACTURA);
  const [folio, setFolio] = useState('');
  const [neto, setNeto] = useState('');
  const [fechaVencim, setFechaVencim] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      api
        .get<Paginated<CustomerOpt>>('/customers?pageSize=100')
        .then((res) => setCustomers(res.data))
        .catch(() => setCustomers([]));
    }
  }, [open]);

  async function save() {
    setError(null);
    try {
      await api.post('/invoices', {
        customerId,
        tipoDte,
        folio,
        neto: Number(neto),
        fechaVencim: fechaVencim || undefined,
      });
      setCustomerId('');
      setFolio('');
      setNeto('');
      setFechaVencim('');
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo registrar');
    }
  }

  const ivaPreview = Math.round(Number(neto || 0) * 0.19);

  return (
    <Modal title="Registrar DTE" open={open} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Cliente">
          <select className={inputClass} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">— Selecciona —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.razonSocial}</option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo DTE">
            <select className={inputClass} value={tipoDte} onChange={(e) => setTipoDte(e.target.value as DteType)}>
              {Object.values(DteType).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Folio (del SII)">
            <input className={inputClass} value={folio} onChange={(e) => setFolio(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Neto">
            <input className={inputClass} type="number" value={neto} onChange={(e) => setNeto(e.target.value)} />
          </Field>
          <Field label="Vencimiento">
            <input className={inputClass} type="date" value={fechaVencim} onChange={(e) => setFechaVencim(e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-neutral-500">
          IVA (19%): {formatCLP(ivaPreview)} · Total: {formatCLP(Number(neto || 0) + ivaPreview)}
        </p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={!customerId || !folio || !neto}>
            Registrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function PayModal({
  invoice,
  onClose,
  onDone,
}: {
  invoice: Invoice | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [monto, setMonto] = useState('');
  const [medio, setMedio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const saldo = invoice ? Number(invoice.total) - Number(invoice.pagado) : 0;

  async function save() {
    if (!invoice) return;
    setError(null);
    try {
      await api.post(`/invoices/${invoice.id}/payments`, {
        monto: Number(monto),
        medio: medio || undefined,
      });
      setMonto('');
      setMedio('');
      onDone();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo registrar');
    }
  }

  return (
    <Modal title="Registrar pago" open={!!invoice} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-neutral-500">Saldo pendiente: {formatCLP(saldo)}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto">
            <input className={inputClass} type="number" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </Field>
          <Field label="Medio">
            <input className={inputClass} value={medio} onChange={(e) => setMedio(e.target.value)} placeholder="Transferencia…" />
          </Field>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => void save()} disabled={!monto || Number(monto) <= 0}>
            Registrar pago
          </Button>
        </div>
      </div>
    </Modal>
  );
}
