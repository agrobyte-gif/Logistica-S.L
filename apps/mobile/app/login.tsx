import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/auth/AuthContext';
import { ApiError } from '../src/api/client';
import { colors } from '../src/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [companyRut, setCompanyRut] = useState('76123456-7');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await login(companyRut.trim(), email.trim(), password);
      // El guard del layout redirige a /home al detectar la sesión.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo iniciar sesión');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.logoWrap}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>A</Text>
          </View>
          <Text style={styles.brand}>AGROGOOD</Text>
          <Text style={styles.subtitle}>Operaciones</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>RUT empresa</Text>
          <TextInput
            style={styles.input}
            value={companyRut}
            onChangeText={setCompanyRut}
            autoCapitalize="none"
            placeholder="76123456-7"
          />
          <Text style={styles.label}>Correo</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="picker@agrogood.cl"
          />
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={busy || !email || !password}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 40 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff', fontSize: 36, fontWeight: '800' },
  brand: { marginTop: 12, fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, letterSpacing: 2 },
  form: { gap: 6 },
  label: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 10,
    marginBottom: 2,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: colors.danger, marginTop: 12, fontSize: 14 },
  button: {
    marginTop: 24,
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
