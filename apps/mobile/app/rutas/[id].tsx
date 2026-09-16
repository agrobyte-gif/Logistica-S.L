import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '../../src/api/client';
import { StatusPill } from '../../src/components/ui';
import { colors } from '../../src/theme';
import type { RouteDetail } from '../../src/types';

export default function RutaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<RouteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (!route) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{error ?? 'Cargando…'}</Text>
      </View>
    );
  }

  const progreso = route.stops.filter((s) => s.estado === 'ENTREGADO').length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.numero}>{route.numero}</Text>
        <StatusPill status={route.estado} />
      </View>
      <Text style={styles.meta}>
        {route.vehicle?.patente ?? 'Sin vehículo'} ·{' '}
        {route.driver?.nombre ?? 'Sin conductor'}
      </Text>
      <Text style={styles.progreso}>
        Progreso: {progreso} / {route.stops.length}
      </Text>

      <View style={{ height: 12 }} />

      {route.stops.map((s) => (
        <View key={s.id} style={styles.stop}>
          <View style={styles.orden}>
            <Text style={styles.ordenText}>{s.orden}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.headerRow}>
              <Text style={styles.pedido}>{s.salesOrder.numero}</Text>
              <StatusPill status={s.estado} />
            </View>
            <Text style={styles.cliente}>{s.salesOrder.customer.razonSocial}</Text>
            {s.salesOrder.customerAddress?.direccion && (
              <Text style={styles.dir}>
                📍 {s.salesOrder.customerAddress.direccion}
                {s.salesOrder.customerAddress.comuna
                  ? `, ${s.salesOrder.customerAddress.comuna}`
                  : ''}
              </Text>
            )}
          </View>
        </View>
      ))}

      <Text style={styles.hint}>
        La confirmación de entrega con firma/foto y el seguimiento GPS llegan en
        la Fase 5.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numero: { fontSize: 20, fontWeight: '800', color: colors.text },
  meta: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  progreso: { fontSize: 15, fontWeight: '600', color: colors.text, marginTop: 8 },
  stop: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
  },
  orden: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ordenText: { color: '#fff', fontWeight: '800' },
  pedido: { fontSize: 16, fontWeight: '700', color: colors.text },
  cliente: { fontSize: 14, color: colors.text, marginTop: 2 },
  dir: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
});
