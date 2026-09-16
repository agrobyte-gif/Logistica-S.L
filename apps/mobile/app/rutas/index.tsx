import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, ApiError } from '../../src/api/client';
import { Card, StatusPill } from '../../src/components/ui';
import { colors } from '../../src/theme';
import type { Paginated, RouteListItem } from '../../src/types';

export default function RutasListScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<RouteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<RouteListItem>>('/routes?pageSize=50');
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

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No hay rutas.</Text> : null
        }
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/rutas/${item.id}`)}>
            <View style={styles.row}>
              <Text style={styles.numero}>{item.numero}</Text>
              <StatusPill status={item.estado} />
            </View>
            <Text style={styles.meta}>
              {new Date(item.fecha).toLocaleDateString('es-CL')} ·{' '}
              {item._count.stops} parada(s)
            </Text>
            <Text style={styles.meta}>
              {item.vehicle?.patente ?? 'Sin vehículo'} ·{' '}
              {item.driver?.nombre ?? 'Sin conductor'}
            </Text>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  numero: { fontSize: 17, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  error: { color: colors.danger, padding: 16 },
});
