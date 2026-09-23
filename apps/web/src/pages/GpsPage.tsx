import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { onRealtime } from '../api/realtime';
import { PageHeader } from '../components/ui';
import { RouteMap, type MapMarker } from '../components/RouteMap';

interface LatestPos {
  routeId: string;
  numero: string;
  position: {
    lat: string | number;
    lng: string | number;
    velocidad?: string | number | null;
    recordedAt: string;
  };
}

export function GpsPage() {
  const [rows, setRows] = useState<LatestPos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Carga inicial + refresco periódico de respaldo (por si se pierde el WS).
    let active = true;
    const load = () =>
      api
        .get<LatestPos[]>('/gps/latest')
        .then((res) => active && setRows(res))
        .catch((e) => active && setError(e instanceof ApiError ? e.message : 'Error'))
        .finally(() => active && setLoading(false));
    void load();
    const t = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  // Actualización en vivo por WebSocket: el backend emite `gps:update` a la
  // empresa cada vez que un conductor reporta posición.
  const applyLiveUpdate = useCallback((payload: unknown) => {
    const p = payload as {
      routeId: string;
      numero: string;
      lat: number;
      lng: number;
      velocidad?: number | null;
      recordedAt: string;
    };
    if (!p?.routeId) return;
    setRows((prev) => {
      const next: LatestPos = {
        routeId: p.routeId,
        numero: p.numero,
        position: {
          lat: p.lat,
          lng: p.lng,
          velocidad: p.velocidad ?? null,
          recordedAt: p.recordedAt,
        },
      };
      const idx = prev.findIndex((r) => r.routeId === p.routeId);
      if (idx === -1) return [...prev, next];
      const copy = prev.slice();
      copy[idx] = next;
      return copy;
    });
  }, []);

  useEffect(() => onRealtime('gps:update', applyLiveUpdate), [applyLiveUpdate]);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="GPS · rutas en curso"
        subtitle="Última posición de cada vehículo, en vivo (WebSocket)"
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="mb-4">
        <RouteMap
          markers={rows.map<MapMarker>((r) => ({
            id: r.routeId,
            lat: Number(r.position.lat),
            lng: Number(r.position.lng),
            label: `🚚 ${r.numero}`,
            sublabel: `${new Date(r.position.recordedAt).toLocaleTimeString('es-CL')}${
              r.position.velocidad != null
                ? ` · ${Number(r.position.velocidad).toFixed(0)} km/h`
                : ''
            }`,
          }))}
        />
      </div>

      {loading ? (
        <p className="py-8 text-center text-neutral-400">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/50 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/40">
          No hay rutas en curso con posiciones GPS. Cuando un conductor inicie una
          ruta y su app reporte ubicación, aparecerá aquí.
          <p className="mt-2 text-xs">
            El mapa interactivo se conectará al elegir el proveedor de mapas
            (ver docs/04, decisión pendiente).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <div
              key={r.routeId}
              className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-medium text-brand-700 dark:text-brand-300">
                  🚚 {r.numero}
                </span>
                <span className="text-xs text-neutral-400">
                  {new Date(r.position.recordedAt).toLocaleTimeString('es-CL')}
                </span>
              </div>
              <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                📍 {Number(r.position.lat).toFixed(5)},{' '}
                {Number(r.position.lng).toFixed(5)}
              </div>
              {r.position.velocidad != null && (
                <div className="text-xs text-neutral-500">
                  {Number(r.position.velocidad).toFixed(0)} km/h
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
