import { apiFetch } from "./client";

export type ProjectStatus = "ACTIVO" | "ARCHIVADO";

export interface ProjectDto {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  archived: boolean;
  archivedAt: string | null;
  status: ProjectStatus;
}

const buildQuery = (params: Record<string, string | boolean | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined) return;
    if (typeof value === "boolean") {
      search.set(key, String(value));
      return;
    }
    if (value.length > 0) {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

export interface ListProjectsParams {
  ownerId: string;
  includeArchived?: boolean;
}

export function listProjects(params: ListProjectsParams) {
  const query = buildQuery({
    ownerId: params.ownerId,
    includeArchived:
      params.includeArchived !== undefined ? String(params.includeArchived) : undefined,
  });
  return apiFetch<ProjectDto[]>(`/projects${query}`);
}

export interface CreateProjectPayload {
  ownerId: string;
  name: string;
  description?: string | null;
}

export function createProject(payload: CreateProjectPayload) {
  return apiFetch<ProjectDto>("/projects", {
    method: "POST",
    body: payload,
  });
}

export interface UpdateProjectPayload {
  projectId: string;
  ownerId: string;
  name?: string;
  description?: string | null;
}

export function updateProject({ projectId, ...body }: UpdateProjectPayload) {
  return apiFetch<ProjectDto>(`/projects/${projectId}`, {
    method: "PATCH",
    body,
  });
}

export interface ArchiveProjectPayload {
  projectId: string;
  ownerId: string;
}

export function archiveProject({ projectId, ownerId }: ArchiveProjectPayload) {
  return apiFetch<ProjectDto>(`/projects/${projectId}/archive`, {
    method: "PATCH",
    body: { ownerId },
  });
}
