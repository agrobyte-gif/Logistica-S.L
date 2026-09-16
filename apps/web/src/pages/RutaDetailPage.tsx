import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, type Paginated } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button, formatCLP, PageHeader, StatusBadge } from '../components/ui';

interface Stop {
  id: string;
  orden: number;
  estado: string;
  salesOrder: {
    numero: string;
    total: string | number;
    customer: { razonSocial: string };
    customerAddress?: { direccion: string; comuna?: string | null } | null;
  };
}
interface RouteDetail {
  id: string;
  numero: string;
  estado: string;
  cargaConfirmada: boolean;
  vehicle?: { id: string; patente: string } | null;
  driver?: { id: string; nombre: string } | null;
  stops: Stop[];
}
interface Vehicle { id: string; patente: string; estado: string }
interface Driver { id: string; nombre: string }

export function RutaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canManage = hasPermission('dispatch:manage');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setRoute(await api.get<RouteDetail>(`/routes/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!canManage) return;
    void (async () => {
      try {
        const [v, d] = await Promise.all([
          api.get<Paginated<Vehicle>>('/vehicles?pageSize=100'),
          api.get<Paginated<Driver>>('/drivers?pageSize=100'),
        ]);
        setVehicles(v.data);
        setDrivers(d.data);
      } catch {
        /* selects vacíos si falla */
      }
    })();
  }, [canManage]);

  async function assign(field: 'vehicleId' | 'driverId', value: string) {
    if (!id || !value) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/routes/${id}/assign`, { [field]: value });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo asignar');
    } finally {
      setBusy(false);
    }
  }

  async function action(path: string, body?: unknown) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/routes/${id}/${path}`, body);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo completar la acción');
    } finally {
      setBusy(false);
    }
  }

  async function removeStop(stopId: string) {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api.del(`/routes/${id}/stops/${stopId}`);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo quitar la parada');
    } finally {
      setBusy(false);
    }
  }

  if (error && !route) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }
  if (!route) return <div className="p-8 text-neutral-400">Cargando…</div>;

  const editable = ['PLANIFICADA', 'CARGANDO'].includes(route.estado);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={route.numero}
        subtitle={`${route.stops.length} parada(s)`}
        action={
          <Button variant="ghost" onClick={() => navigate('/logistica/rutas')}>
            ← Volver
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={route.estado} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Asignación de vehículo y conductor */}
      <div className="mb-6 grid gap-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">Vehículo</span>
          {canManage && editable ? (
            <select
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={route.vehicle?.id ?? ''}
              onChange={(e) => void assign('vehicleId', e.target.value)}
              disabled={busy}
            >
              <option value="">Selecciona…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.patente} ({v.estado})
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-neutral-700 dark:text-neutral-200">
              {route.vehicle?.patente ?? '—'}
            </div>
          )}
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-neutral-500">Conductor</span>
          {canManage && editable ? (
            <select
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              value={route.driver?.id ?? ''}
              onChange={(e) => void assign('driverId', e.target.value)}
              disabled={busy}
            >
              <option value="">Selecciona…</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-neutral-700 dark:text-neutral-200">
              {route.driver?.nombre ?? '—'}
            </div>
          )}
        </label>
      </div>

      {/* Acciones de estado */}
      {canManage && (
        <div className="mb-6 flex flex-wrap gap-2">
          {route.estado === 'PLANIFICADA' && (
            <Button
              onClick={() => void action('transition', { to: 'CARGANDO' })}
              disabled={busy}
            >
              Marcar en carga
            </Button>
          )}
          {route.estado === 'CARGANDO' && (
            <Button onClick={() => void action('depart')} disabled={busy}>
              🚚 Controlar salida
            </Button>
          )}
          {route.estado === 'EN_RUTA' && (
            <Button onClick={() => void action('complete')} disabled={busy}>
              Cerrar ruta
            </Button>
          )}
          {editable && (
            <Button
              variant="ghost"
              onClick={() => void action('transition', { to: 'CANCELADA' })}
              disabled={busy}
            >
              Cancelar ruta
            </Button>
          )}
        </div>
      )}

      {/* Paradas */}
      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
            <tr>
              <th className="px-4 py-3 w-10">#</th>
              <th className="px-4 py-3">Pedido</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Dirección</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Estado</th>
              {canManage && editable && <th className="px-4 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {route.stops.map((s) => (
              <tr
                key={s.id}
                className="border-b border-neutral-100 last:border-0 dark:border-neutral-800/60"
              >
                <td className="px-4 py-3 tabular-nums text-neutral-400">{s.orden}</td>
                <td className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-200">
                  {s.salesOrder.numero}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {s.salesOrder.customer.razonSocial}
                </td>
                <td className="px-4 py-3 text-neutral-500">
                  {s.salesOrder.customerAddress?.direccion ?? '—'}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCLP(s.salesOrder.total)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.estado} />
                </td>
                {canManage && editable && (
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => void removeStop(s.id)}
                      className="text-xs text-red-500 hover:underline"
                      title="Quitar parada"
                    >
                      Quitar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
