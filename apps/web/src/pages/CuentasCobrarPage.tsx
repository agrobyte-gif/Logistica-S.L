import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { AgingBadge, formatCLP, PageHeader } from '../components/ui';

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

export function CuentasCobrarPage() {
  const [data, setData] = useState<AgingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AgingResult>('/finance/receivables')
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error'));
  }, []);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Cuentas por cobrar"
        subtitle="Documentos con saldo pendiente y su vencimiento"
      />
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="text-xs text-neutral-500">Total por cobrar</div>
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
      <AgingTable rows={data?.rows ?? []} contraparteLabel="Cliente" />
    </div>
  );
}

export function AgingTable({
  rows,
  contraparteLabel,
}: {
  rows: AgingRow[];
  contraparteLabel: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
          <tr>
            <th className="px-4 py-3">Documento</th>
            <th className="px-4 py-3">{contraparteLabel}</th>
            <th className="px-4 py-3">Vencimiento</th>
            <th className="px-4 py-3 text-right">Saldo</th>
            <th className="px-4 py-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                Sin saldos pendientes
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60">
                <td className="px-4 py-3 font-mono text-xs text-neutral-600 dark:text-neutral-300">
                  {r.folio}
                </td>
                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">
                  {r.contraparte}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {r.fechaVencim
                    ? new Date(r.fechaVencim).toLocaleDateString('es-CL')
                    : '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCLP(r.saldo)}
                </td>
                <td className="px-4 py-3">
                  <AgingBadge aging={r.aging} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
