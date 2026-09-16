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
import type { Paginated, PickingListItem } from '../../src/types';

export default function PickingsListScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<PickingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<Paginated<PickingListItem>>(
        '/pickings?pageSize=50',
      );
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
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.brand} />
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>No hay pickings asignados.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Card onPress={() => router.push(`/pickings/${item.id}`)}>
            <View style={styles.row}>
              <Text style={styles.numero}>{item.salesOrder.numero}</Text>
              <StatusPill status={item.estado} />
            </View>
            <Text style={styles.cliente}>{item.salesOrder.customer.razonSocial}</Text>
            <Text style={styles.meta}>
              {item.numero} · {item._count.items} línea(s)
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
  cliente: { fontSize: 15, color: colors.text, marginTop: 4 },
  meta: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  error: { color: colors.danger, padding: 16 },
});
