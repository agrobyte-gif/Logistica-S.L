import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { api, ApiError } from '../../src/api/client';
import { PrimaryButton, StatusPill } from '../../src/components/ui';
import { colors } from '../../src/theme';
import {
  PICKING_ITEM_STATES,
  type PickingDetail,
  type PickingItem,
  type PickingItemStatus,
} from '../../src/types';

export default function PickingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [pk, setPk] = useState<PickingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setPk(await api.get<PickingDetail>(`/pickings/${id}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar');
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(path: string) {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/pickings/${id}/${path}`);
      await load();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'No se pudo completar';
      setError(msg);
      Alert.alert('Aviso', msg);
    } finally {
      setBusy(false);
    }
  }

  if (!pk) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>{error ?? 'Cargando…'}</Text>
      </View>
    );
  }

  const editable = ['PENDIENTE', 'EN_PROCESO', 'INCOMPLETO'].includes(pk.estado);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.numero}>{pk.salesOrder.numero}</Text>
          <Text style={styles.cliente}>{pk.salesOrder.customer.razonSocial}</Text>
        </View>
        <StatusPill status={pk.estado} />
      </View>

      {pk.estado === 'PENDIENTE' && (
        <PrimaryButton
          label="Iniciar picking"
          onPress={() => void action('start')}
          busy={busy}
        />
      )}

      {pk.items.map((it) => (
        <ItemCard
          key={it.id}
          pickingId={pk.id}
          item={it}
          editable={editable}
          onSaved={load}
          onError={(m) => setError(m)}
        />
      ))}

      {(pk.estado === 'EN_PROCESO' || pk.estado === 'INCOMPLETO') && (
        <View style={{ marginTop: 8 }}>
          <PrimaryButton
            label="Cerrar picking"
            onPress={() => void action('finalize')}
            busy={busy}
          />
          <Text style={styles.hint}>
            No se puede cerrar con diferencias (faltante, sustitución o cantidad
            menor) sin una justificación en la línea.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function ItemCard({
  pickingId,
  item,
  editable,
  onSaved,
  onError,
}: {
  pickingId: string;
  item: PickingItem;
  editable: boolean;
  onSaved: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [cantidad, setCantidad] = useState(String(item.cantidadPickeada));
  const [estado, setEstado] = useState<PickingItemStatus>(
    item.estado === 'PENDIENTE' ? 'OK' : item.estado,
  );
  const [obs, setObs] = useState(item.observacion ?? '');
  const [saving, setSaving] = useState(false);

  const solicitada = Number(item.cantidadSolicitada);
  const hayDiferencia =
    Number(cantidad) !== solicitada || estado === 'FALTANTE' || estado === 'SUSTITUCION';

  async function save() {
    setSaving(true);
    try {
      await api.post(`/pickings/${pickingId}/items/${item.id}`, {
        cantidadPickeada: Number(cantidad),
        estado,
        observacion: obs || undefined,
      });
      await onSaved();
    } catch (e) {
      onError(e instanceof ApiError ? e.message : 'No se pudo guardar la línea');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.prodName}>{item.product.nombre}</Text>
          <Text style={styles.sku}>{item.product.sku}</Text>
        </View>
        <StatusPill status={item.estado} />
      </View>
      <Text style={styles.solicitado}>
        Solicitado: {solicitada.toLocaleString('es-CL')} {item.product.unidadBase}
      </Text>

      {editable ? (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Pickeado</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={cantidad}
              onChangeText={setCantidad}
            />
          </View>

          <View style={styles.stateRow}>
            {PICKING_ITEM_STATES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setEstado(s)}
                style={[styles.stateBtn, estado === s && styles.stateBtnActive]}
              >
                <Text
                  style={[styles.stateText, estado === s && styles.stateTextActive]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {hayDiferencia && (
            <View style={styles.field}>
              <Text style={styles.label}>Justificación (obligatoria)</Text>
              <TextInput
                style={styles.input}
                placeholder="Motivo de la diferencia"
                value={obs}
                onChangeText={setObs}
              />
            </View>
          )}

          <PrimaryButton
            label={saving ? 'Guardando…' : 'Guardar línea'}
            onPress={save}
            busy={saving}
          />
        </>
      ) : (
        <Text style={styles.solicitado}>
          Pickeado: {Number(item.cantidadPickeada).toLocaleString('es-CL')}
          {item.observacion ? ` · ${item.observacion}` : ''}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  numero: { fontSize: 18, fontWeight: '800', color: colors.text },
  cliente: { fontSize: 14, color: colors.textMuted },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  prodName: { fontSize: 16, fontWeight: '700', color: colors.text },
  sku: { fontSize: 12, color: colors.textMuted },
  solicitado: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  field: { marginTop: 12 },
  label: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  stateRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  stateBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  stateBtnActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  stateText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  stateTextActive: { color: '#fff' },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 8, textAlign: 'center' },
});
