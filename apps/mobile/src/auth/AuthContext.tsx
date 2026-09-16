import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  ApiError,
  getAccessToken,
  loadStoredToken,
  setAccessToken,
} from '../api/client';
import type { AuthUser } from '../types';

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (companyRut: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Al arrancar: si hay token guardado, intenta recuperar el usuario.
  useEffect(() => {
    void (async () => {
      const token = await loadStoredToken();
      if (token) {
        try {
          const me = await api.get<AuthUser>('/users/me');
          setUser(me);
        } catch {
          await setAccessToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(
    async (companyRut: string, email: string, password: string) => {
      const res = await api.post<LoginResponse>('/auth/login', {
        companyRut,
        email,
        password,
      });
      await setAccessToken(res.accessToken);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      if (getAccessToken()) await api.post('/auth/logout');
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
    } finally {
      await setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login,
      logout,
      hasPermission: (perm) =>
        !!user &&
        (user.roles.includes('ADMINISTRADOR') ||
          user.permissions.includes(perm)),
      hasRole: (role) => user?.roles.includes(role) ?? false,
    }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
