import { useEffect, useState } from 'react';
import { api, ApiError, getAccessToken } from '../api/client';
import { Button, formatCLP, PageHeader } from '../components/ui';

interface ReportDef {
  key: string;
  label: string;
}
interface ReportResult {
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
}

// Claves de columna cuyo valor se muestra como moneda.
const MONEY_KEYS = new Set(['total', 'monto', 'costo']);

export function ReportesPage() {
  const [defs, setDefs] = useState<ReportDef[]>([]);
  const [sel, setSel] = useState<string>('');
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ReportDef[]>('/reports')
      .then((d) => {
        setDefs(d);
        if (d[0]) setSel(d[0].key);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error'));
  }, []);

  useEffect(() => {
    if (!sel) return;
    setLoading(true);
    setError(null);
    api
      .get<ReportResult>(`/reports/${sel}`)
      .then(setResult)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [sel]);

  async function download(format: 'csv' | 'xlsx' | 'pdf') {
    const res = await fetch(`/api/reports/${sel}?format=${format}`, {
      headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
      credentials: 'include',
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sel}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Reportes"
        subtitle="Inteligencia de negocio · exporta a CSV/Excel"
        action={
          result && result.rows.length > 0 ? (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => void download('csv')}>
                ⬇ CSV
              </Button>
              <Button variant="ghost" onClick={() => void download('xlsx')}>
                ⬇ Excel
              </Button>
              <Button variant="ghost" onClick={() => void download('pdf')}>
                ⬇ PDF
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {defs.map((d) => (
          <button
            key={d.key}
            onClick={() => setSel(d.key)}
            className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
              sel === d.key
                ? 'bg-brand-600 text-white'
                : 'bg-white text-neutral-600 hover:bg-neutral-100 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {loading || !result ? (
          <p className="py-10 text-center text-neutral-400">Cargando…</p>
        ) : result.rows.length === 0 ? (
          <p className="py-10 text-center text-neutral-400">Sin datos para este reporte</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <tr>
                {result.columns.map((c) => (
                  <th key={c.key} className="px-4 py-3">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
                >
                  {result.columns.map((c) => (
                    <td key={c.key} className="px-4 py-2.5 text-neutral-700 dark:text-neutral-200">
                      {MONEY_KEYS.has(c.key)
                        ? formatCLP(row[c.key] as number)
                        : String(row[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
