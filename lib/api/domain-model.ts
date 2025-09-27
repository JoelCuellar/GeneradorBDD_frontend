
import { apiFetch } from "./client";

export type DomainAttributeType =
  | "STRING"
  | "ENTERO"
  | "DECIMAL"
  | "BOOLEANO"
  | "FECHA"
  | "FECHA_HORA"
  | "UUID"
  | "TEXTO";

export const DOMAIN_ATTRIBUTE_TYPES: DomainAttributeType[] = [
  "STRING",
  "ENTERO",
  "DECIMAL",
  "BOOLEANO",
  "FECHA",
  "FECHA_HORA",
  "UUID",
  "TEXTO",
];

export type DomainMultiplicity = "UNO" | "CERO_O_UNO" | "UNO_O_MAS" | "CERO_O_MAS";

export interface DomainConstraintConfig {
  lengthMin?: number;
  lengthMax?: number;
  min?: number;
  max?: number;
  pattern?: string;
  scale?: number;
  precision?: number;
}

export interface DomainAttribute {
  id: string;
  classId: string;
  name: string;
  type: DomainAttributeType;
  required: boolean;
  config: DomainConstraintConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface DomainIdentity {
  id: string;
  classId: string;
  name: string;
  description: string | null;
  attributeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DomainClass {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  attributes: DomainAttribute[];
  identities: DomainIdentity[];
  createdAt: string;
  updatedAt: string;
}

export interface DomainRelation {
  id: string;
  projectId: string;
  name: string | null;
  sourceClassId: string;
  targetClassId: string;
  sourceRole: string | null;
  targetRole: string | null;
  sourceMultiplicity: DomainMultiplicity;
  targetMultiplicity: DomainMultiplicity;
  createdAt: string;
  updatedAt: string;
}

export interface DomainModelSnapshot {
  classes: DomainClass[];
  relations: DomainRelation[];
}

const buildQuery = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value && value.length > 0) {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
};

export function getDomainModel(projectId: string, actorId: string) {
  const query = buildQuery({ actorId });
  return apiFetch<DomainModelSnapshot>(`/projects/${projectId}/domain${query}`);
}

export interface CreateClassPayload {
  projectId: string;
  actorId: string;
  name: string;
  description?: string | null;
}

export function createDomainClass(payload: CreateClassPayload) {
  const { projectId, ...body } = payload;
  return apiFetch<DomainClass>(`/projects/${projectId}/domain/classes`, {
    method: "POST",
    body: {
      ...body,
      description: body.description ?? null,
    },
  });
}

export interface UpdateClassPayload {
  projectId: string;
  actorId: string;
  classId: string;
  name?: string;
  description?: string | null;
}

export function updateDomainClass(payload: UpdateClassPayload) {
  const { projectId, classId, ...body } = payload;
  return apiFetch<DomainClass>(`/projects/${projectId}/domain/classes/${classId}`, {
    method: "PATCH",
    body: {
      ...body,
      description: body.description ?? null,
    },
  });
}

export interface DeleteClassPayload {
  projectId: string;
  actorId: string;
  classId: string;
}

export function deleteDomainClass(payload: DeleteClassPayload) {
  const { projectId, classId, actorId } = payload;
  return apiFetch<void>(`/projects/${projectId}/domain/classes/${classId}`, {
    method: "DELETE",
    body: { actorId },
  });
}

export interface CreateAttributePayload {
  projectId: string;
  actorId: string;
  classId: string;
  name: string;
  type: DomainAttributeType;
  required: boolean;
  config?: DomainConstraintConfig | null;
}

export function createDomainAttribute(payload: CreateAttributePayload) {
  const { projectId, classId, ...body } = payload;
  return apiFetch<DomainAttribute>(`/projects/${projectId}/domain/classes/${classId}/attributes`, {
    method: "POST",
    body: {
      ...body,
      config: body.config ?? null,
    },
  });
}

export interface UpdateAttributePayload {
  projectId: string;
  actorId: string;
  attributeId: string;
  name?: string;
  type?: DomainAttributeType;
  required?: boolean;
  config?: DomainConstraintConfig | null;
}

export function updateDomainAttribute(payload: UpdateAttributePayload) {
  const { projectId, attributeId, ...body } = payload;
  return apiFetch<DomainAttribute>(`/projects/${projectId}/domain/attributes/${attributeId}`, {
    method: "PATCH",
    body: {
      ...body,
      config: body.config ?? null,
    },
  });
}

export interface DeleteAttributePayload {
  projectId: string;
  actorId: string;
  attributeId: string;
}

export function deleteDomainAttribute(payload: DeleteAttributePayload) {
  const { projectId, attributeId, actorId } = payload;
  return apiFetch<void>(`/projects/${projectId}/domain/attributes/${attributeId}`, {
    method: "DELETE",
    body: { actorId },
  });
}

export interface CreateRelationPayload {
  projectId: string;
  actorId: string;
  sourceClassId: string;
  targetClassId: string;
  name?: string | null;
  sourceRole?: string | null;
  targetRole?: string | null;
  sourceMultiplicity: DomainMultiplicity;
  targetMultiplicity: DomainMultiplicity;
}

export function createDomainRelation(payload: CreateRelationPayload) {
  const { projectId, ...body } = payload;
  return apiFetch<DomainRelation>(`/projects/${projectId}/domain/relations`, {
    method: "POST",
    body: {
      ...body,
      name: body.name ?? null,
      sourceRole: body.sourceRole ?? null,
      targetRole: body.targetRole ?? null,
    },
  });
}

export interface UpdateRelationPayload {
  projectId: string;
  actorId: string;
  relationId: string;
  name?: string | null;
  sourceRole?: string | null;
  targetRole?: string | null;
  sourceMultiplicity?: DomainMultiplicity;
  targetMultiplicity?: DomainMultiplicity;
}

export function updateDomainRelation(payload: UpdateRelationPayload) {
  const { projectId, relationId, ...body } = payload;
  return apiFetch<DomainRelation>(`/projects/${projectId}/domain/relations/${relationId}`, {
    method: "PATCH",
    body: {
      ...body,
      name: body.name ?? null,
      sourceRole: body.sourceRole ?? null,
      targetRole: body.targetRole ?? null,
    },
  });
}

export interface DeleteRelationPayload {
  projectId: string;
  actorId: string;
  relationId: string;
}

export function deleteDomainRelation(payload: DeleteRelationPayload) {
  const { projectId, relationId, actorId } = payload;
  return apiFetch<void>(`/projects/${projectId}/domain/relations/${relationId}`, {
    method: "DELETE",
    body: { actorId },
  });
}

export interface DefineIdentityPayload {
  projectId: string;
  actorId: string;
  classId: string;
  name: string;
  description?: string | null;
  attributeIds: string[];
  identityId?: string;
}

export function defineDomainIdentity(payload: DefineIdentityPayload) {
  const { projectId, classId, ...body } = payload;
  return apiFetch<DomainIdentity>(`/projects/${projectId}/domain/classes/${classId}/identities`, {
    method: "POST",
    body: {
      ...body,
      description: body.description ?? null,
    },
  });
}

export interface RemoveIdentityPayload {
  projectId: string;
  actorId: string;
  identityId: string;
}

export function removeDomainIdentity(payload: RemoveIdentityPayload) {
  const { projectId, identityId, actorId } = payload;
  return apiFetch<void>(`/projects/${projectId}/domain/identities/${identityId}`, {
    method: "DELETE",
    body: { actorId },
  });
}
