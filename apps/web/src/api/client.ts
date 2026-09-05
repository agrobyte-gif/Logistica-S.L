/**
 * Cliente HTTP mínimo para la API AGROGOOD.
 * - Guarda el access token en memoria (no en localStorage: menor superficie XSS).
 * - El refresh token vive en cookie HttpOnly gestionada por el backend.
 * - Ante un 401 intenta refrescar una vez y reintenta la petición.
 */

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Si es true, no intenta refrescar ante un 401 (evita bucles). */
  skipRefresh?: boolean;
}

async function rawRequest<T>(path: string, opts: RequestOptions): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`/api${path}`, {
    method: opts.method ?? 'GET',
    headers,
    credentials: 'include',
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message = data?.message
      ? Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message
      : `Error ${res.status}`;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

/** Intenta renovar el access token usando la cookie de refresh. */
async function tryRefresh(): Promise<boolean> {
  try {
    const data = await rawRequest<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      skipRefresh: true,
    });
    setAccessToken(data.accessToken);
    return true;
  } catch {
    setAccessToken(null);
    return false;
  }
}

export async function apiRequest<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  try {
    return await rawRequest<T>(path, opts);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && !opts.skipRefresh) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        return rawRequest<T>(path, { ...opts, skipRefresh: true });
      }
    }
    throw err;
  }
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body }),
  refresh: tryRefresh,
};
