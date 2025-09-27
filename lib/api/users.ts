import { apiFetch } from "./client";

export type ProjectRole = "PROPIETARIO" | "EDITOR" | "LECTOR";
export type UserStatus = "ACTIVO" | "SUSPENDIDO" | "ELIMINADO";
export type UserAuditAction =
  | "CREACION"
  | "INVITACION"
  | "ACTUALIZACION_DATOS"
  | "CAMBIO_ROL"
  | "ACTIVACION"
  | "SUSPENSION"
  | "BAJA_LOGICA";

export const PROJECT_ROLES: ProjectRole[] = [
  "PROPIETARIO",
  "EDITOR",
  "LECTOR",
];

export const USER_STATUSES: UserStatus[] = [
  "ACTIVO",
  "SUSPENDIDO",
  "ELIMINADO",
];

export interface UserDto {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string | null;
  suspendedAt: string | null;
  deletedAt: string | null;
}

export interface ProjectMembershipSnapshot {
  projectId: string;
  projectName: string;
  role: ProjectRole;
  active: boolean;
  assignedAt: string;
}

export interface UserListItem {
  user: UserDto;
  memberships: ProjectMembershipSnapshot[];
}

export interface UserDetails extends UserListItem {}

export interface UserAuditRecord {
  id: string;
  action: UserAuditAction;
  actorId: string | null;
  actorName: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export interface ListUsersFilters {
  name?: string;
  email?: string;
  role?: ProjectRole;
  status?: UserStatus;
}

export interface ListUsersParams extends ListUsersFilters {
  actorId: string;
  projectId: string;
}

const buildQuery = (params: Record<string, string | undefined>): string => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query.length > 0 ? `?${query}` : "";
};

export function listUsers(params: ListUsersParams) {
  const { actorId, projectId, ...filters } = params;
  const query = buildQuery({
    actorId,
    projectId,
    name: filters.name,
    email: filters.email,
    role: filters.role,
    status: filters.status,
  });
  return apiFetch<UserListItem[]>(`/users${query}`);
}

export interface CreateUserInput {
  actorId: string;
  projectId: string;
  email: string;
  name?: string;
  role: ProjectRole;
}

export function createUser(payload: CreateUserInput) {
  return apiFetch<UserDetails>("/users", {
    method: "POST",
    body: payload,
  });
}

export interface UpdateUserInput {
  actorId: string;
  projectId: string;
  userId: string;
  email?: string;
  name?: string;
}

export function updateUser({ userId, ...body }: UpdateUserInput) {
  return apiFetch<UserDetails>(`/users/${userId}`, {
    method: "PATCH",
    body,
  });
}

export interface AssignRoleInput {
  actorId: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
}

export function assignProjectRole({ userId, ...body }: AssignRoleInput) {
  return apiFetch<ProjectMembershipSnapshot>(`/users/${userId}/role`, {
    method: "PATCH",
    body,
  });
}

export interface RemoveCollaboratorInput {
  actorId: string;
  projectId: string;
  userId: string;
}

export function removeProjectCollaborator({ userId, ...body }: RemoveCollaboratorInput) {
  return apiFetch<ProjectMembershipSnapshot>(`/users/${userId}/collaboration/remove`, {
    method: "PATCH",
    body,
  });
}

export interface ChangeStatusInput {
  actorId: string;
  projectId: string;
  userId: string;
  status: UserStatus;
  reason?: string;
}

export function changeUserStatus({ userId, ...body }: ChangeStatusInput) {
  return apiFetch<UserDetails>(`/users/${userId}/status`, {
    method: "PATCH",
    body,
  });
}

export interface SoftDeleteInput {
  actorId: string;
  projectId: string;
  userId: string;
  reason?: string;
}

export function softDeleteUser({ userId, ...body }: SoftDeleteInput) {
  return apiFetch<UserDetails>(`/users/${userId}/delete`, {
    method: "PATCH",
    body,
  });
}

export interface GetUserDetailsInput {
  actorId: string;
  projectId: string;
  userId: string;
}

export function getUserDetails({ userId, actorId, projectId }: GetUserDetailsInput) {
  const query = buildQuery({ actorId, projectId });
  return apiFetch<UserDetails>(`/users/${userId}${query}`);
}

export interface GetUserHistoryInput extends GetUserDetailsInput {}

export function getUserHistory({ userId, actorId, projectId }: GetUserHistoryInput) {
  const query = buildQuery({ actorId, projectId });
  return apiFetch<UserAuditRecord[]>(`/users/${userId}/history${query}`);
}
