import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../src/auth/AuthContext';
import { colors } from '../src/theme';

/** Redirige a /login si no hay sesión, y saca de /login si ya la hay. */
function useProtectedRoute(user: unknown, loading: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inLogin = segments[0] === 'login';
    if (!user && !inLogin) router.replace('/login');
    else if (user && inLogin) router.replace('/home');
  }, [user, loading, segments, router]);
}

function RootNavigator() {
  const { user, loading } = useAuth();
  useProtectedRoute(user, loading);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.brand },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="home" options={{ title: 'AGROGOOD' }} />
      <Stack.Screen name="pickings/index" options={{ title: 'Mis pickings' }} />
      <Stack.Screen name="pickings/[id]" options={{ title: 'Picking' }} />
      <Stack.Screen name="rutas/index" options={{ title: 'Mis rutas' }} />
      <Stack.Screen name="rutas/[id]" options={{ title: 'Ruta' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
