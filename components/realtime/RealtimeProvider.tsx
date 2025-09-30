'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { getRealtimeSocket,  closeRealtimeSocket } from './socket';
import { RT_EVENTS, type PresencePayload } from '@/lib/realtime/events';

type UserInfo = { id: string; name?: string; color?: string };
type PresenceState = Record<string, { cursor?: { x: number; y: number } | null; selection?: string | null; name?: string; color?: string; lastSeen: number }>;

type Ctx = {
  socket: ReturnType<typeof getRealtimeSocket> | null;
  projectId: string;
  me: UserInfo;
  presence: PresenceState;
  updatePresence: (p: Omit<PresencePayload, 'projectId'>) => void;
  isConnected: boolean;
};

const RealtimeCtx = createContext<Ctx | null>(null);

const palette = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316'];

function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

export function RealtimeProvider({
  children, projectId, token, me,
}: React.PropsWithChildren<{ projectId: string; token?: string; me: UserInfo }>) {
  const [presence, setPresence] = useState<PresenceState>({});
  const [isConnected, setIsConnected] = useState(false);
  const socket = useMemo(() => getRealtimeSocket(), []);

// si quieres re-inicializar cuando cambie el token:
useEffect(() => {
  closeRealtimeSocket();
  getRealtimeSocket();
}, [token]);
  const meInfo = useMemo(() => ({ ...me, color: me.color ?? colorFor(me.id) }), [me]);

  useEffect(() => {
    if (!socket) return;
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.emit(RT_EVENTS.JOIN, { projectId });

    socket.on(RT_EVENTS.PRESENCE, (p: { userId: string; cursor?: {x:number;y:number}; selection?: string | null }) => {
      setPresence((prev) => ({
        ...prev,
        [p.userId]: {
          ...prev[p.userId],
          cursor: p.cursor, selection: p.selection,
          lastSeen: Date.now(),
          color: prev[p.userId]?.color ?? colorFor(p.userId),
        },
      }));
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(RT_EVENTS.PRESENCE);
      closeRealtimeSocket();
    };
  }, [socket, projectId]);

  // Heartbeat: limpia presencias viejas
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      setPresence((prev) => {
        const next = { ...prev };
        Object.entries(next).forEach(([uid, p]) => {
          if (now - p.lastSeen > 15000) delete next[uid];
        });
        return next;
      });
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const updatePresence = (p: Omit<PresencePayload, 'projectId'>) => {
    socket?.emit(RT_EVENTS.PRESENCE, { projectId, ...p });
  };

  const value: Ctx = { socket, projectId, me: meInfo, presence, updatePresence, isConnected };
  return <RealtimeCtx.Provider value={value}>{children}</RealtimeCtx.Provider>;
}

export function useRealtime() {
  const ctx = useContext(RealtimeCtx);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}
