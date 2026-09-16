import { Redirect } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';

/** Punto de entrada: manda al home (el guard del layout redirige a login). */
export default function Index() {
  const { user } = useAuth();
  return <Redirect href={user ? '/home' : '/login'} />;
}
