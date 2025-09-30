import { apiFetch } from "./client";
import type { ProjectRole } from "./users";

export function createInvitation(p: {
  projectId: string; actorId: string; email: string; role: ProjectRole; expiresInHours?: number;
}) {
  return apiFetch<{ invitation: any; acceptUrl: string }>(
    `/invitations`,                                // 👈 sin params en URL
    { method: "POST", body: p }                    // 👈 TODO en body
  );
}

export function acceptInvitation(token: string, actorId: string) {
  return apiFetch<{ projectId: string; role: ProjectRole }>(
    `/invitations/accept`,                         // 👈 sin params en URL
    { method: "POST", body: { token, actorId } }   // 👈 TODO en body
  );
}

export function getInvitation(token: string) {
  // (opcional, si usas la página de vista previa)
  return apiFetch<any>(`/invitations/${token}`);
}
