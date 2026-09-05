import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, setAccessToken } from '../api/client';

export interface CurrentUser {
  id: string;
  nombre?: string;
  email?: string;
  companyId: string;
  roles: string[];
  permissions: string[];
}

interface LoginInput {
  companyRut: string;
  email: string;
  password: string;
  totp?: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Al montar: intenta refrescar la sesión y cargar el perfil.
  useEffect(() => {
    let active = true;
    (async () => {
      const refreshed = await api.refresh();
      if (refreshed && active) {
        try {
          const me = await api.get<CurrentUser>('/users/me');
          if (active) setUser(me);
        } catch {
          if (active) setUser(null);
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const res = await api.post<{ accessToken: string; user: CurrentUser }>(
      '/auth/login',
      input,
    );
    setAccessToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const hasPermission = useCallback(
    (perm: string) =>
      !!user &&
      (user.roles.includes('ADMINISTRADOR') || user.permissions.includes(perm)),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, hasPermission }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
