// lib/realtime/socket.ts
import { io, Socket } from "socket.io-client";
import { getAuthToken } from "@/components/auth/token";

type Role = "PROPIETARIO" | "EDITOR" | "LECTOR";
type RolesMap = Record<string, Role>;

let socket: Socket | null = null;
let roles: RolesMap = {};
const subs = new Set<() => void>();
const notify = () => subs.forEach((fn) => fn());

/** ✅ EXACTO: export que tu Provider espera */
export function getRealtimeSocket(): Socket {
  if (socket) return socket;

  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  const auth = getAuthToken?.();

  socket = io(`${base}/realtime`, {
    withCredentials: true,
    auth: { token: (auth as any)?.accessToken }, // tu WsAuthGuard lo lee
    autoConnect: true,
  });

  // Al conectar, backend envía roles por proyecto
  socket.on("ready", (payload: { projectRoles: RolesMap }) => {
    roles = payload?.projectRoles || {};
    (socket as any).projectRoles = roles;
    notify();
  });

  // Cuando aceptas invitación (o te cambian rol) sin recargar
  socket.on("membership_granted", ({ projectId, role }: { projectId: string; role: Role }) => {
    roles[projectId] = role;
    (socket as any).projectRoles = roles;
    socket!.emit("join", { projectId }); // auto-unirse al room
    notify();
  });

  // Invitaciones nuevas en vivo (opcional para UI)
  socket.on("invitation_created", (_inv: any) => {
    // puedes mostrar un toast y link a /invite/${_inv.token}
  });

  return socket;
}

/** ✅ EXACTO: export que tu Provider espera */
export function closeRealtimeSocket() {
  if (!socket) return;
  try {
    socket.removeAllListeners();
    socket.disconnect();
  } finally {
    socket = null;
    roles = {};
    notify();
  }
}

/** (Opcional) API de suscripción para que tu Provider re-renderice cuando cambien roles */
export function subscribeRoles(fn: () => void) {
  subs.add(fn);
  return () => subs.delete(fn);
}

/** (Opcional) helpers de permisos y emisiones que puede usar tu editor */
export function getProjectRoles(): RolesMap { return roles; }
export function canEdit(projectId: string) {
  const r = roles[projectId];
  return r === "PROPIETARIO" || r === "EDITOR";
}
export function joinProject(projectId: string) { getRealtimeSocket().emit("join", { projectId }); }
export function emitPresence(projectId: string, cursor?: { x: number; y: number }, selection?: string | null) {
  getRealtimeSocket().emit("presence", { projectId, cursor, selection });
}
export function emitNodeMove(projectId: string, classId: string, x: number, y: number) {
  getRealtimeSocket().emit("node_move", { projectId, classId, x, y });
}
export function emitNodeMoveCommit(projectId: string, classId: string, x: number, y: number) {
  getRealtimeSocket().emit("node_move_commit", { projectId, classId, x, y });
}
export function emitEdgeAnchor(projectId: string, relationId: string, sourceHandle?: string, targetHandle?: string) {
  getRealtimeSocket().emit("edge_anchor", { projectId, relationId, sourceHandle, targetHandle });
}

/** (Compat extra) también exporto default para evitar tree-shaking raro en Next */
const realtimeSocketApi = {
  getRealtimeSocket,
  closeRealtimeSocket,
  subscribeRoles,
  getProjectRoles,
  canEdit,
  joinProject,
  emitPresence,
  emitNodeMove,
  emitNodeMoveCommit,
  emitEdgeAnchor,
};

export default realtimeSocketApi;