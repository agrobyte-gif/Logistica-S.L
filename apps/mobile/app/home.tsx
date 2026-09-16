import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import { Card, PrimaryButton } from '../src/components/ui';
import { colors } from '../src/theme';

export default function HomeScreen() {
  const { user, logout, hasPermission } = useAuth();
  const router = useRouter();

  const canPicking = hasPermission('picking:read') || hasPermission('picking:execute');
  const canRutas = hasPermission('route:read');

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.hello}>Hola, {user?.nombre ?? user?.email}</Text>
      <Text style={styles.roles}>{user?.roles.join(' · ')}</Text>

      <View style={{ height: 16 }} />

      {canPicking && (
        <Card onPress={() => router.push('/pickings')}>
          <Text style={styles.cardTitle}>📦 Mis pickings</Text>
          <Text style={styles.cardSub}>Preparar pedidos asignados</Text>
        </Card>
      )}

      {canRutas && (
        <Card onPress={() => router.push('/rutas')}>
          <Text style={styles.cardTitle}>🚚 Mis rutas</Text>
          <Text style={styles.cardSub}>Rutas de reparto asignadas</Text>
        </Card>
      )}

      {!canPicking && !canRutas && (
        <Card>
          <Text style={styles.cardSub}>
            Tu usuario no tiene módulos operativos móviles habilitados.
          </Text>
        </Card>
      )}

      <View style={{ height: 24 }} />
      <PrimaryButton label="Cerrar sesión" variant="ghost" onPress={() => void logout()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  hello: { fontSize: 22, fontWeight: '800', color: colors.text },
  roles: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
});
