"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PROJECT_ROLES,
  assignProjectRole,
  createUser,
  getUserHistory,
  listUsers,
  removeProjectCollaborator,
  type ProjectMembershipSnapshot,
  type ProjectRole,
  type UserAuditRecord,
  type UserListItem,
} from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";

interface CollaboratorManagementProps {
  actorId: string;
  projectId: string;
  projectName: string;
  onClose: () => void;
}

type ModalState =
  | { type: "invite" }
  | { type: "role"; user: UserListItem; membership: ProjectMembershipSnapshot }
  | { type: "remove"; user: UserListItem }
  | { type: "history"; user: UserListItem };

type FiltersState = {
  name: string;
  email: string;
};

const ROLE_LABEL: Record<ProjectRole, string> = {
  PROPIETARIO: "Propietario",
  EDITOR: "Editor",
  LECTOR: "Lector",
};

const resolveError = (error: unknown) => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Ocurrio un error inesperado";
};

export default function CollaboratorManagement({ actorId, projectId, projectName, onClose }: CollaboratorManagementProps) {
  const [records, setRecords] = useState<UserListItem[]>([]);
  const [filters, setFilters] = useState<FiltersState>({ name: "", email: "" });
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>({ name: "", email: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [pending, setPending] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "EDITOR" as ProjectRole });
  const [roleForm, setRoleForm] = useState<ProjectRole>("EDITOR");
  const [historyCache, setHistoryCache] = useState<Record<string, UserAuditRecord[]>>({});
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadCollaborators = useCallback(() => {
    setLoading(true);
    setError(null);
    listUsers({
      actorId,
      projectId,
      name: appliedFilters.name || undefined,
      email: appliedFilters.email || undefined,
    })
      .then((data) => setRecords(data))
      .catch((err) => setError(resolveError(err)))
      .finally(() => setLoading(false));
  }, [actorId, projectId, appliedFilters]);

  useEffect(() => {
    loadCollaborators();
  }, [loadCollaborators]);

  useEffect(() => {
    if (!feedback) return;
    const timeout = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const rows = useMemo(() => {
    return records
      .map((item) => {
        const membership = item.memberships.find((membership) => membership.projectId === projectId);
        return membership ? { item, membership } : null;
      })
      .filter((value): value is { item: UserListItem; membership: ProjectMembershipSnapshot } => value !== null);
  }, [records, projectId]);

  const activeCollaborators = useMemo(
    () => rows.filter((row) => row.membership.active),
    [rows],
  );

  const ownerCount = useMemo(
    () => activeCollaborators.filter((row) => row.membership.role === "PROPIETARIO").length,
    [activeCollaborators],
  );

  const closeModal = () => {
    setModal(null);
    setPending(false);
    setInviteForm({ name: "", email: "", role: "EDITOR" });
    setRoleForm("EDITOR");
  };

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedFilters(filters);
  };

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createUser({
        actorId,
        projectId,
        email: inviteForm.email.trim(),
        name: inviteForm.name.trim() || undefined,
        role: inviteForm.role,
      });
      setFeedback("Colaborador invitado correctamente");
      closeModal();
      loadCollaborators();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setPending(false);
    }
  };

  const handleRoleChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (modal?.type !== "role") return;
    setPending(true);
    setError(null);
    try {
      await assignProjectRole({
        actorId,
        projectId,
        userId: modal.user.user.id,
        role: roleForm,
      });
      setFeedback("Rol actualizado");
      closeModal();
      loadCollaborators();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setPending(false);
    }
  };

  const handleRemove = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (modal?.type !== "remove") return;
    setPending(true);
    setError(null);
    try {
      await removeProjectCollaborator({
        actorId,
        projectId,
        userId: modal.user.user.id,
      });
      setFeedback("Acceso revocado");
      closeModal();
      loadCollaborators();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setPending(false);
    }
  };

  const openHistory = (user: UserListItem) => {
    setModal({ type: "history", user });
    if (!historyCache[user.user.id]) {
      setHistoryLoading(true);
      getUserHistory({ actorId, projectId, userId: user.user.id })
        .then((items) =>
          setHistoryCache((prev) => ({
            ...prev,
            [user.user.id]: items,
          })),
        )
        .catch((err) => setFeedback(resolveError(err)))
        .finally(() => setHistoryLoading(false));
    }
  };

  const historyRecords = modal?.type === "history" && historyCache[modal.user.user.id]
    ? historyCache[modal.user.user.id]
    : [];

  const isLastOwner = (membership: ProjectMembershipSnapshot) =>
    membership.role === "PROPIETARIO" && ownerCount <= 1;

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <header className="flex flex-col gap-3 border-b border-gray-200 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Colaboradores de {projectName}</h2>
          <p className="text-sm text-gray-600">Administra el acceso y los roles de las personas que participan en el proyecto.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
            onClick={() => {
              setModal({ type: "invite" });
              setInviteForm({ name: "", email: "", role: "EDITOR" });
            }}
          >
            Agregar colaborador
          </button>
          <button
            className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </header>

      <div className="space-y-4 p-6">
        {error ? (
          <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}
        {feedback ? (
          <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div>
        ) : null}

        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={applyFilters}>
          <input
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Buscar por nombre"
            value={filters.name}
            onChange={(event) => setFilters((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Buscar por correo"
            value={filters.email}
            onChange={(event) => setFilters((prev) => ({ ...prev, email: event.target.value }))}
          />
          <button
            type="submit"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Filtrar
          </button>
        </form>

        {loading ? (
          <p className="text-sm text-gray-600">Cargando colaboradores...</p>
        ) : activeCollaborators.length === 0 ? (
          <p className="text-sm text-gray-600">Aun no hay colaboradores activos en el proyecto.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Nombre</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Correo</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Rol</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Asignado</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeCollaborators.map((row) => {
                  const lastOwner = isLastOwner(row.membership);
                  return (
                    <tr key={row.item.user.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{row.item.user.name}</div>
                        <div className="text-xs text-gray-500">Estado: {row.item.user.status}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.item.user.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">{ROLE_LABEL[row.membership.role]}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{formatDate(row.membership.assignedAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                            onClick={() => {
                              setRoleForm(row.membership.role);
                              setModal({ type: "role", user: row.item, membership: row.membership });
                            }}
                          >
                            Cambiar rol
                          </button>
                          <button
                            className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
                            onClick={() => openHistory(row.item)}
                          >
                            Historial
                          </button>
                          <button
                            className="rounded border border-rose-200 px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                            onClick={() => {
                              if (lastOwner) return;
                              setModal({ type: "remove", user: row.item });
                            }}
                            disabled={lastOwner}
                          >
                            Quitar acceso
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal ? (
        <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white shadow-lg">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                {modal.type === "invite" && "Agregar colaborador"}
                {modal.type === "role" && "Actualizar rol"}
                {modal.type === "remove" && "Quitar acceso"}
                {modal.type === "history" && "Historial de cambios"}
              </h3>
              <button className="text-xs text-gray-500 hover:text-gray-700" onClick={closeModal}>Cerrar</button>
            </div>

            {modal.type === "invite" ? (
              <form className="space-y-3" onSubmit={handleInvite}>
                <input
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Nombre"
                  value={inviteForm.name}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, name: event.target.value }))}
                  required
                />
                <input
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  type="email"
                  placeholder="Correo electronico"
                  value={inviteForm.email}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
                <select
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={inviteForm.role}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, role: event.target.value as ProjectRole }))}
                >
                  {PROJECT_ROLES.map((role) => (
                    <option key={role} value={role}>{ROLE_LABEL[role]}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
                  disabled={pending}
                >
                  {pending ? "Guardando..." : "Invitar"}
                </button>
              </form>
            ) : null}

            {modal.type === "role" ? (
              <form className="space-y-3" onSubmit={handleRoleChange}>
                <p className="text-sm text-gray-600">Selecciona el nuevo rol para {modal.user.user.name}.</p>
                <select
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  value={roleForm}
                  onChange={(event) => setRoleForm(event.target.value as ProjectRole)}
                >
                  {PROJECT_ROLES.map((role) => {
                    const isDisabled =
                      modal.membership.role === "PROPIETARIO" && ownerCount <= 1 && role !== "PROPIETARIO";
                    return (
                      <option key={role} value={role} disabled={isDisabled}>
                        {ROLE_LABEL[role]}
                        {isDisabled ? " (ultimo propietario)" : ""}
                      </option>
                    );
                  })}
                </select>
                <button
                  type="submit"
                  className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
                  disabled={pending}
                >
                  {pending ? "Guardando..." : "Actualizar"}
                </button>
              </form>
            ) : null}

            {modal.type === "remove" ? (
              <form className="space-y-3" onSubmit={handleRemove}>
                <p className="text-sm text-gray-600">
                  Estas a punto de revocar el acceso de {modal.user.user.name}. Podras volver a invitarlo cuando lo necesites.
                </p>
                <button
                  type="submit"
                  className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                  disabled={pending}
                >
                  {pending ? "Procesando..." : "Confirmar revocacion"}
                </button>
              </form>
            ) : null}

            {modal.type === "history" ? (
              <div className="max-h-64 overflow-y-auto rounded border border-gray-200 p-3 text-xs">
                {historyLoading ? (
                  <p className="text-gray-600">Cargando historial...</p>
                ) : historyRecords.length === 0 ? (
                  <p className="text-gray-600">Sin registros de auditoria.</p>
                ) : (
                  <ul className="space-y-2">
                    {historyRecords.map((record) => (
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
            ) : null}
          </div>
        </aside>
      ) : null}
    </section>
  );
}
