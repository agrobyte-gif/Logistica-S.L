import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Paginated } from '../api/client';
import { Button, PageHeader } from '../components/ui';

interface Notif {
  id: string;
  nivel: 'INFO' | 'WARN' | 'CRITICAL';
  titulo: string;
  cuerpo?: string | null;
  leidaAt?: string | null;
  createdAt: string;
}

const NIVEL_STYLE: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export function NotificacionesPage() {
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<Paginated<Notif>>('/notifications?pageSize=50');
      setRows(res.data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    await api.post(`/notifications/${id}/read`);
    void load();
  }
  async function markAll() {
    await api.post('/notifications/read-all');
    void load();
  }

  const hayNoLeidas = rows.some((r) => !r.leidaAt);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notificaciones"
        subtitle="Avisos dirigidos según tu rol"
        action={
          hayNoLeidas && (
            <Button variant="ghost" onClick={() => void markAll()}>
              Marcar todas como leídas
            </Button>
          )
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <p className="py-8 text-center text-neutral-400">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-neutral-400">Sin notificaciones</p>
        ) : (
          rows.map((n) => (
            <div
              key={n.id}
              className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${
                n.leidaAt
                  ? 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                  : 'border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-900/10'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${NIVEL_STYLE[n.nivel]}`}
                  >
                    {n.nivel}
                  </span>
                  <span className="font-medium text-neutral-800 dark:text-neutral-100">
                    {n.titulo}
                  </span>
                </div>
                {n.cuerpo && (
                  <p className="mt-1 text-sm text-neutral-500">{n.cuerpo}</p>
                )}
                <p className="mt-1 text-[11px] text-neutral-400">
                  {new Date(n.createdAt).toLocaleString('es-CL')}
                </p>
              </div>
              {!n.leidaAt && (
                <button
                  onClick={() => void markRead(n.id)}
                  className="shrink-0 text-xs text-brand-600 hover:underline"
                >
                  Marcar leída
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
