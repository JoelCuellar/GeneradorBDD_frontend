"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PROJECT_ROLES,
  USER_STATUSES,
  assignProjectRole,
  changeUserStatus,

  getUserHistory,
  listUsers,
  softDeleteUser,
  updateUser,
  type ProjectMembershipSnapshot,
  type ProjectRole,
  type UserAuditRecord,
  type UserListItem,
  type UserStatus,
} from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { createInvitation } from "@/lib/api/invitations";
interface UserManagementProps {
  actorId: string;
  projects: ProjectMembershipSnapshot[];
  selectedProjectId: string | null;
  onProjectChange: (projectId: string | null) => void;
}

type ActionType = "create" | "edit" | "role" | "status" | "delete" | "history";
interface ActionState {
  type: ActionType;
  user?: UserListItem;
}

type FiltersState = {
  name: string;
  email: string;
  role: string;
  status: string;
};

const ROLE_LABEL: Record<ProjectRole, string> = {
  PROPIETARIO: "Propietario",
  EDITOR: "Editor",
  LECTOR: "Lector",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVO: "Activo",
  SUSPENDIDO: "Suspendido",
  ELIMINADO: "Eliminado",
};

const INITIAL_FILTERS: FiltersState = { name: "", email: "", role: "", status: "" };

const resolveError = (error: unknown) => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Ocurrio un error inesperado";
};

export default function UserManagement({ actorId, projects, selectedProjectId, onProjectChange }: UserManagementProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [action, setAction] = useState<ActionState | null>(null);
  const [historyCache, setHistoryCache] = useState<Record<string, UserAuditRecord[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const project = useMemo(
    () => projects.find((item) => item.projectId === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  useEffect(() => {
    if (!project) {
      setUsers([]);
      return;
    }
    setLoading(true);
    setError(null);
    listUsers({
      actorId,
      projectId: project.projectId,
      name: appliedFilters.name || undefined,
      email: appliedFilters.email || undefined,
      role: appliedFilters.role ? (appliedFilters.role as ProjectRole) : undefined,
      status: appliedFilters.status ? (appliedFilters.status as UserStatus) : undefined,
    })
      .then((data) => setUsers(data))
      .catch((err) => setError(resolveError(err)))
      .finally(() => setLoading(false));
  }, [actorId, project, appliedFilters]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    setAction(null);
    setHistoryCache({});
  }, [project?.projectId]);

  const openAction = (type: ActionType, user?: UserListItem) => {
    if (!project && type !== "history") {
      setFeedback("Selecciona un proyecto para continuar");
      return;
    }
    setAction({ type, user });
    if (type === "history" && user && !historyCache[user.user.id] && project) {
      setHistoryLoading(true);
      getUserHistory({ actorId, projectId: project.projectId, userId: user.user.id })
        .then((records) => setHistoryCache((prev) => ({ ...prev, [user.user.id]: records })))
        .catch((err) => setFeedback(resolveError(err)))
        .finally(() => setHistoryLoading(false));
    }
  };

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
  };

  const refresh = () => {
    setAppliedFilters((prev) => ({ ...prev }));
  };

  const ensureProject = () => {
    if (!project) {
      setFeedback("Selecciona un proyecto para continuar");
      return false;
    }
    return true;
  };

const handleCreate = async (payload: { name: string; email: string; role: ProjectRole }) => {
  if (!ensureProject() || !project) return;

  const r = await createInvitation({
    actorId,
    projectId: project.projectId,
    email: payload.email.trim().toLowerCase(),
    role: payload.role,
    expiresInHours: 72,
  });

  const url = `${window.location.origin}${r.acceptUrl}`;
  try { await navigator.clipboard?.writeText(url); } catch {}

  setFeedback("Invitación creada. Enlace copiado al portapapeles.");
  refresh();
};

  const handleEdit = async (userId: string, data: { name: string; email: string }) => {
    if (!ensureProject() || !project) return;
    await updateUser({ actorId, projectId: project.projectId, userId, name: data.name, email: data.email });
    setFeedback("Datos actualizados");
    refresh();
  };

  const handleRole = async (userId: string, role: ProjectRole) => {
    if (!ensureProject() || !project) return;
    await assignProjectRole({ actorId, projectId: project.projectId, userId, role });
    setFeedback("Rol actualizado");
    refresh();
  };

  const handleStatus = async (userId: string, status: UserStatus, reason?: string) => {
    if (!ensureProject() || !project) return;
    await changeUserStatus({ actorId, projectId: project.projectId, userId, status, reason });
    setFeedback("Estado actualizado");
    refresh();
  };

  const handleDelete = async (userId: string, reason?: string) => {
    if (!ensureProject() || !project) return;
    await softDeleteUser({ actorId, projectId: project.projectId, userId, reason });
    setFeedback("Usuario dado de baja");
    refresh();
  };

  return (
    <div className="space-y-6">
      <header className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Gestion de usuarios</h1>
            <p className="text-sm text-gray-600">Administra los usuarios de tus proyectos como propietario.</p>
          </div>
          <div className="flex flex-col gap-2 md:w-72">
            <select
              value={project?.projectId ?? ""}
              onChange={(event) => onProjectChange(event.target.value === "" ? null : event.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Selecciona un proyecto</option>
              {projects.map((item) => (
                <option key={item.projectId} value={item.projectId}>{item.projectName}</option>
              ))}
            </select>
            <span className="text-xs text-gray-500">Participas en {projects.length} {projects.length === 1 ? "proyecto" : "proyectos"}.</span>
          </div>
        </div>
        {feedback ? <p className="mt-3 rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{feedback}</p> : null}
        {error ? <p className="mt-3 rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      </header>

      <section className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
        <form className="grid gap-3 md:grid-cols-4" onSubmit={applyFilters}>
          <input
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Nombre"
            value={filters.name}
            onChange={(event) => setFilters((prev) => ({ ...prev, name: event.target.value }))}
            disabled={!project}
          />
          <input
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Correo"
            value={filters.email}
            onChange={(event) => setFilters((prev) => ({ ...prev, email: event.target.value }))}
            disabled={!project}
          />
          <select
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={filters.role}
            onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
            disabled={!project}
          >
            <option value="">Rol</option>
            {PROJECT_ROLES.map((role) => (
              <option key={role} value={role}>{ROLE_LABEL[role]}</option>
            ))}
          </select>
          <select
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            disabled={!project}
          >
            <option value="">Estado</option>
            {USER_STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABEL[status]}</option>
            ))}
          </select>
          <div className="md:col-span-4 flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={!project}
            >
              Aplicar filtros
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={!project}
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => openAction("create")}
              className="ml-auto rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={!project}
            >
              Invitar usuario
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">Cargando usuarios...</div>
        ) : !project ? (
          <div className="rounded border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600 shadow-sm">
            Selecciona un proyecto para ver la lista de usuarios.
          </div>
        ) : users.length === 0 ? (
          <div className="rounded border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
            No hay usuarios con los filtros actuales.
          </div>
        ) : (
          users.map((item) => {
            const membership = project
              ? item.memberships.find((m) => m.projectId === project.projectId)
              : undefined;
            return (
              <article key={item.user.id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.user.name}</p>
                    <p className="text-xs text-gray-500">{item.user.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {STATUS_LABEL[item.user.status].toUpperCase()}
                    </span>
                    {membership ? (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {ROLE_LABEL[membership.role]}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <button className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100" onClick={() => openAction("edit", item)}>
                    Editar
                  </button>
                  <button className="rounded border border-blue-300 px-3 py-1 text-blue-700 hover:bg-blue-50" onClick={() => openAction("role", item)}>
                    Rol
                  </button>
                  <button className="rounded border border-amber-300 px-3 py-1 text-amber-700 hover:bg-amber-50" onClick={() => openAction("status", item)}>
                    Estado
                  </button>
                  <button className="rounded border border-rose-300 px-3 py-1 text-rose-700 hover:bg-rose-50" onClick={() => openAction("delete", item)}>
                    Baja
                  </button>
                  <button className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-100" onClick={() => openAction("history", item)}>
                    Historial
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      <ActionDrawer
        action={action}
        projectId={project?.projectId ?? null}
        onClose={() => setAction(null)}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onRole={handleRole}
        onStatus={handleStatus}
        onDelete={handleDelete}
        history={action?.type === "history" && action.user ? historyCache[action.user.user.id] ?? [] : []}
        historyLoading={historyLoading}
      />
    </div>
  );
}

interface ActionDrawerProps {
  action: ActionState | null;
  projectId: string | null;
  onClose: () => void;
  onCreate: (data: { name: string; email: string; role: ProjectRole }) => Promise<void>;
  onEdit: (userId: string, data: { name: string; email: string }) => Promise<void>;
  onRole: (userId: string, role: ProjectRole) => Promise<void>;
  onStatus: (userId: string, status: UserStatus, reason?: string) => Promise<void>;
  onDelete: (userId: string, reason?: string) => Promise<void>;
  history: UserAuditRecord[];
  historyLoading: boolean;
}

function ActionDrawer({
  action,
  projectId,
  onClose,
  onCreate,
  onEdit,
  onRole,
  onStatus,
  onDelete,
  history,
  historyLoading,
}: ActionDrawerProps) {
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState<{ name?: string; email?: string; role?: ProjectRole; status?: UserStatus; reason?: string }>({});

  useEffect(() => {
    setPending(false);
    if (!action) {
      setForm({});
      return;
    }
    if (action.type === "edit" && action.user) {
      setForm({ name: action.user.user.name, email: action.user.user.email });
      return;
    }
    if (action.type === "role" && action.user) {
      const membership = action.user.memberships.find((m) => m.projectId === projectId);
      setForm({ role: membership?.role ?? "EDITOR" });
      return;
    }
    if (action.type === "status" && action.user) {
      setForm({ status: action.user.user.status, reason: "" });
      return;
    }
    setForm({ name: "", email: "", role: "EDITOR" });
  }, [action, projectId]);

  if (!action) return null;

  const close = () => {
    if (!pending) onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!action) return;
    setPending(true);
    try {
      if (action.type === "create") {
        await onCreate({
          name: form.name?.trim() ?? "",
          email: form.email?.trim() ?? "",
          role: form.role ?? "EDITOR",
        });
      }
      if (action.type === "edit" && action.user) {
        await onEdit(action.user.user.id, {
          name: form.name?.trim() ?? "",
          email: form.email?.trim() ?? "",
        });
      }
      if (action.type === "role" && action.user && form.role) {
        await onRole(action.user.user.id, form.role);
      }
      if (action.type === "status" && action.user && form.status) {
        await onStatus(action.user.user.id, form.status, form.reason?.trim() || undefined);
      }
      if (action.type === "delete" && action.user) {
        await onDelete(action.user.user.id, form.reason?.trim() || undefined);
      }
      if (action.type !== "history") {
        onClose();
      }
    } catch (err) {
      alert(resolveError(err));
    } finally {
      setPending(false);
    }
  };

  return (
    <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white shadow-lg">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            {action.type === "create" && "Invitar usuario"}
            {action.type === "edit" && `Editar ${action.user?.user.name ?? "usuario"}`}
            {action.type === "role" && "Cambiar rol"}
            {action.type === "status" && "Actualizar estado"}
            {action.type === "delete" && "Baja logica"}
            {action.type === "history" && "Historial"}
          </h2>
          <button className="text-xs text-gray-500 hover:text-gray-700" onClick={close}>
            Cerrar
          </button>
        </div>

        {action.type === "history" ? (
          <div className="max-h-64 overflow-y-auto rounded border border-gray-200 p-3 text-xs">
            {historyLoading ? (
              <p className="text-gray-600">Cargando historial...</p>
            ) : history.length === 0 ? (
              <p className="text-gray-600">Sin registros de auditoria.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((record) => (
                  <li key={record.id} className="rounded border border-gray-200 p-2">
                    <p className="font-medium text-gray-900">{new Date(record.createdAt).toLocaleString()}</p>
                    <p className="text-gray-700">{record.action}</p>
                    <p className="text-gray-500">{record.actorName ?? "Usuario desconocido"}</p>
                    {record.detail ? (
                      <pre className="mt-1 whitespace-pre-wrap text-gray-500">{JSON.stringify(record.detail, null, 2)}</pre>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <form className="space-y-3" onSubmit={submit}>
            {(action.type === "create" || action.type === "edit") ? (
              <>
                <input
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Nombre"
                  value={form.name ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
                <input
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Correo"
                  type="email"
                  value={form.email ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </>
            ) : null}

            {action.type === "create" || action.type === "role" ? (
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                value={form.role ?? "EDITOR"}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as ProjectRole }))}
              >
                {PROJECT_ROLES.map((role) => (
                  <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                ))}
              </select>
            ) : null}

            {action.type === "status" ? (
              <>
                <select
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={form.status ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as UserStatus }))}
                  required
                >
                  <option value="">Selecciona estado</option>
                  {USER_STATUSES.map((status) => (
                    <option key={status} value={status}>{STATUS_LABEL[status]}</option>
                  ))}
                </select>
                <textarea
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Motivo (opcional)"
                  rows={3}
                  value={form.reason ?? ""}
                  onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                />
              </>
            ) : null}

            {action.type === "delete" ? (
              <textarea
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Motivo (opcional)"
                rows={3}
                value={form.reason ?? ""}
                onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              />
            ) : null}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
                disabled={pending}
              >
                {pending ? "Guardando..." : action.type === "delete" ? "Confirmar" : "Guardar"}
              </button>
              <button
                type="button"
                onClick={close}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={pending}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </aside>
  );
}

