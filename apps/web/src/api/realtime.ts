import { io, type Socket } from 'socket.io-client';

/**
 * Cliente de tiempo real (socket.io) compartido. Se conecta por el mismo origen
 * (proxy de Vite → API) autenticando con el access token en el handshake.
 */
let socket: Socket | null = null;

export function connectRealtime(token: string): Socket {
  if (socket) socket.disconnect();
  socket = io({
    path: '/socket.io',
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
  return socket;
}

export function disconnectRealtime(): void {
  socket?.disconnect();
  socket = null;
}

/** Suscribe a un evento; devuelve la función para desuscribir. */
export function onRealtime(
  event: string,
  handler: (payload: unknown) => void,
): () => void {
  socket?.on(event, handler);
  return () => {
    socket?.off(event, handler);
  };
}
