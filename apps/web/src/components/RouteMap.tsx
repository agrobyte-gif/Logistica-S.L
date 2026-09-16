import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
}

const SANTIAGO: [number, number] = [-33.4489, -70.6693];

// Marcador con emoji (evita depender de las imágenes por defecto de Leaflet,
// que fallan con algunos bundlers).
function truckIcon() {
  return L.divIcon({
    html: '<div style="font-size:22px;line-height:22px">🚚</div>',
    className: 'agrogood-truck-marker',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

/**
 * Mapa interactivo (OpenStreetMap vía Leaflet) que muestra la última posición
 * de cada vehículo. Sin API key ni proveedor de pago; se puede cambiar el
 * `TileLayer` a Google/Mapbox más adelante sin tocar el resto.
 */
export function RouteMap({ markers }: { markers: MapMarker[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Inicializa el mapa una vez.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView(SANTIAGO, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Redibuja marcadores cuando cambian.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (markers.length === 0) return;
    const bounds: [number, number][] = [];
    for (const m of markers) {
      L.marker([m.lat, m.lng], { icon: truckIcon() })
        .bindPopup(
          `<strong>${m.label}</strong>${m.sublabel ? `<br/>${m.sublabel}` : ''}`,
        )
        .addTo(layer);
      bounds.push([m.lat, m.lng]);
    }
    if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    } else {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [markers]);

  return (
    <div
      ref={containerRef}
      className="h-80 w-full overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800"
      style={{ zIndex: 0 }}
    />
  );
}
