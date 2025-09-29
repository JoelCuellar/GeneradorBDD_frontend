import { io, Socket } from 'socket.io-client';

let sock: Socket | null = null;

export function getRealtimeSocket(token?: string) {
  if (sock) return sock;
  sock = io('/realtime', {
    withCredentials: true,
    auth: token ? { token } : undefined,
    transports: ['websocket'],
  });
  return sock;
}

export function closeRealtimeSocket() {
  if (sock) { try { sock.disconnect(); } catch {} ; sock = null; }
}
