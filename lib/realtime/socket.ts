// lib/realtime/socket.ts
import { io, Socket } from "socket.io-client";
import { getAuthToken } from "@/components/auth/token";

type Role = "PROPIETARIO" | "EDITOR" | "LECTOR";
type RolesMap = Record<string, Role>;

let socket: Socket | null = null;
let roles: RolesMap = {};
const listeners = new Set<() => void>();

function notify() { for (const l of listeners) l(); }

export function getSocket(): Socket {
  if (socket) return socket;

  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") || "";
  const auth = getAuthToken?.();

  socket = io(`${base}/realtime`, {
    withCredentials: true,
    auth: { token: (auth as any)?.accessToken }, // tu WsAuthGuard lo lee aquí
    autoConnect: true,
  });

  // Backend te manda tus roles por proyecto al conectar
  socket.on("ready", (payload: { projectRoles: RolesMap }) => {
    roles = payload?.projectRoles || {};
    (socket as any).projectRoles = roles;
    notify();
  });

  // Te otorgaron rol (aceptaste invitación o te elevaron permisos)
  socket.on("membership_granted", ({ projectId, role }: { projectId: string; role: Role }) => {
    roles[projectId] = role;
    (socket as any).projectRoles = roles;
    // puedes auto-unirte al proyecto sin recargar
    socket!.emit("join", { projectId });
    notify();
  });

  // Te crearon una invitación mientras estás conectado (info opcional para UI)
  socket.on("invitation_created", (inv: any) => {
    // aquí puedes disparar un toast/badge y link a /invite/{inv.token}
    console.log("Nueva invitación:", inv);
  });

  return socket;
}

// Suscripción simple para que tu UI re-renderice cuando cambien roles
export function subscribeRealtime(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Roles y permisos
export function getRoles(): RolesMap { return roles; }
export function canEdit(projectId: string) {
  const r = roles[projectId];
  return r === "PROPIETARIO" || r === "EDITOR";
}

// Helpers de emisión
export function joinProject(projectId: string) { getSocket().emit("join", { projectId }); }
export function emitPresence(projectId: string, cursor?: { x: number; y: number }, selection?: string | null) {
  getSocket().emit("presence", { projectId, cursor, selection });
}
export function emitNodeMove(projectId: string, classId: string, x: number, y: number) {
  getSocket().emit("node_move", { projectId, classId, x, y });
}
export function emitNodeMoveCommit(projectId: string, classId: string, x: number, y: number) {
  getSocket().emit("node_move_commit", { projectId, classId, x, y });
}
export function emitEdgeAnchor(projectId: string, relationId: string, sourceHandle?: string, targetHandle?: string) {
  getSocket().emit("edge_anchor", { projectId, relationId, sourceHandle, targetHandle });
}
