import Constants from 'expo-constants';

/**
 * URL base de la API. Se toma de app.json → expo.extra.apiBaseUrl.
 * IMPORTANTE: en un dispositivo físico NO uses "localhost" (apunta al teléfono);
 * usa la IP LAN de la máquina que corre la API, p. ej. http://192.168.1.100:3000/api
 */
export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'http://localhost:3000/api';
