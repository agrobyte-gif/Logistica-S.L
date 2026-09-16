import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'agrogood_access_token';

let accessToken: string | null = null;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function loadStoredToken(): Promise<string | null> {
  try {
    accessToken = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    accessToken = null;
  }
  return accessToken;
}

export async function setAccessToken(token: string | null): Promise<void> {
  accessToken = token;
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* el token en memoria sigue sirviendo esta sesión */
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Sin conexión con el servidor');
  }

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

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body }),
};
