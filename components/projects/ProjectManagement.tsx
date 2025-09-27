
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  archiveProject,
  createProject,
  listProjects,
  updateProject,
  type ProjectDto,
  type ProjectStatus,
} from "@/lib/api/projects";
import { ApiError } from "@/lib/api/client";
import DomainModelDesigner from "@/components/domain-model/DomainModelDesigner";
import CollaboratorManagement from "@/components/collaborators/CollaboratorManagement";

interface ProjectManagementProps {
  ownerId: string;
  onProjectsChange?: (projects: ProjectDto[]) => void;
}

type ActiveModal =
  | { type: "edit"; project: ProjectDto }
  | { type: "archive"; project: ProjectDto }
  | null;

interface FormState {
  name: string;
  description: string;
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  ACTIVO: "Activo",
  ARCHIVADO: "Archivado",
};

const STATUS_STYLE: Record<ProjectStatus, string> = {
  ACTIVO: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ARCHIVADO: "border-gray-200 bg-gray-100 text-gray-600",
};

export default function ProjectManagement({ ownerId, onProjectsChange }: ProjectManagementProps) {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [createForm, setCreateForm] = useState<FormState>({ name: "", description: "" });
  const [createLoading, setCreateLoading] = useState(false);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [modalForm, setModalForm] = useState<FormState>({ name: "", description: "" });
  const [modalLoading, setModalLoading] = useState(false);
  const [modelProjectId, setModelProjectId] = useState<string | null>(null);
  const [collaboratorProjectId, setCollaboratorProjectId] = useState<string | null>(null);

  const activeProjects = useMemo(
    () => projects.filter((project) => !project.archived),
    [projects],
  );

  const archivedProjects = useMemo(
    () => projects.filter((project) => project.archived),
    [projects],
  );

  const collaboratorProject = useMemo(
    () => (collaboratorProjectId ? projects.find((project) => project.id === collaboratorProjectId) ?? null : null),
    [collaboratorProjectId, projects],
  );

  useEffect(() => {
    if (!ownerId) return;
    setLoading(true);
    setError(null);
    listProjects({ ownerId, includeArchived: true })
      .then((data) => {
        setProjects(data);
        onProjectsChange?.(data);
        if (modelProjectId && !data.some((project) => project.id === modelProjectId)) {
          setModelProjectId(null);
        }
      })
      .catch((err) => setError(resolveError(err)))
      .finally(() => setLoading(false));
  }, [ownerId, refreshNonce, onProjectsChange, modelProjectId]);

  useEffect(() => {
    if (!collaboratorProjectId) return;
    if (!collaboratorProject || collaboratorProject.archived) {
      setCollaboratorProjectId(null);
    }
  }, [collaboratorProjectId, collaboratorProject]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const resetModal = () => {
    setModal(null);
    setModalForm({ name: "", description: "" });
    setModalLoading(false);
  };

  const triggerRefresh = () => setRefreshNonce((value) => value + 1);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = createForm.name.trim();
    if (!name) {
      setError("El nombre del proyecto es obligatorio");
      return;
    }
    setCreateLoading(true);
    setError(null);
    try {
      await createProject({
        ownerId,
        name,
        description: createForm.description.trim() || undefined,
      });
      setCreateForm({ name: "", description: "" });
      setFeedback("Proyecto creado correctamente");
      triggerRefresh();
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setCreateLoading(false);
    }
  };

  const openEditModal = (project: ProjectDto) => {
    setModal({ type: "edit", project });
    setModalForm({ name: project.name, description: project.description ?? "" });
  };

  const openArchiveModal = (project: ProjectDto) => {
    setModal({ type: "archive", project });
    setModalForm({ name: project.name, description: project.description ?? "" });
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal || modal.type !== "edit") return;
    const name = modalForm.name.trim();
    if (!name) {
      setError("El nombre del proyecto es obligatorio");
      return;
    }
    setModalLoading(true);
    setError(null);
    try {
      await updateProject({
        projectId: modal.project.id,
        ownerId,
        name,
        description: modalForm.description.trim() || null,
      });
      setFeedback("Proyecto actualizado");
      triggerRefresh();
      resetModal();
    } catch (err) {
      setError(resolveError(err));
      setModalLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!modal || modal.type !== "archive") return;
    setModalLoading(true);
    setError(null);
    try {
      await archiveProject({ projectId: modal.project.id, ownerId });
      setFeedback("Proyecto archivado");
      triggerRefresh();
      resetModal();
    } catch (err) {
      setError(resolveError(err));
      setModalLoading(false);
    }
  };

  const handleModelProject = (projectId: string) => {
    setModelProjectId((current) => (current === projectId ? null : projectId));
  };

  const renderProjectRow = (project: ProjectDto) => {
    const status: ProjectStatus = project.archived ? "ARCHIVADO" : "ACTIVO";
    return (
      <tr key={project.id} className="bg-white hover:bg-gray-50">
        <td className="px-4 py-3 text-sm font-medium text-gray-900">{project.name}</td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {project.description && project.description.length > 0 ? project.description : "Sin descripcion"}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(project.createdAt)}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(project.updatedAt)}</td>
        <td className="px-4 py-3 text-xs">
          <div className="flex flex-wrap gap-2">
            {!project.archived ? (
              <button
                type="button"
                className="rounded border border-blue-300 px-3 py-1 font-medium text-blue-700 hover:bg-blue-50"
                onClick={() => openEditModal(project)}
              >
                Editar
              </button>
            ) : null}
            {!project.archived ? (
              <button
                type="button"
                className="rounded border border-rose-300 px-3 py-1 font-medium text-rose-700 hover:bg-rose-50"
                onClick={() => openArchiveModal(project)}
              >
                Archivar
              </button>
            ) : null}
            {!project.archived ? (
              <button
                type="button"
                className="rounded border border-indigo-300 px-3 py-1 font-medium text-indigo-700 hover:bg-indigo-50"
                onClick={() => setCollaboratorProjectId((current) => (current === project.id ? null : project.id))}
              >
                Gestionar colaboradores
              </button>
            ) : null}
            {!project.archived ? (
              <button
                type="button"
                className="rounded border border-gray-300 px-3 py-1 font-medium text-gray-700 hover:bg-gray-100"
                onClick={() => handleModelProject(project.id)}
              >
                {modelProjectId === project.id ? "Cerrar modelador" : "Modelar dominio"}
              </button>
            ) : null}
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900">Gestion de proyectos</h1>
        <p className="text-sm text-gray-600">
          Crea, actualiza o archiva proyectos segun su estado. Desde aqui tambien puedes abrir el modelador de dominio.
        </p>
      </header>

      <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Resumen de proyectos</h2>
            <p className="text-sm text-gray-600">Los proyectos activos se muestran primero. Los archivados se mantienen solo para referencia.</p>
          </div>
          <span className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {activeProjects.length} activos / {archivedProjects.length} archivados
          </span>
        </div>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando proyectos...</p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-gray-500">Aun no tienes proyectos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Proyecto</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Descripcion</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Estado</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Creado</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Actualizado</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {[...activeProjects, ...archivedProjects].map(renderProjectRow)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Crear proyecto</h2>
        <p className="text-sm text-gray-600">Define un nombre unico y una descripcion breve opcional.</p>
        <form className="mt-4 space-y-4" onSubmit={handleCreate}>
          <div className="space-y-1">
            <label htmlFor="project-name" className="text-sm font-medium text-gray-700">Nombre*</label>
            <input
              id="project-name"
              value={createForm.name}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Nombre del proyecto"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="project-description" className="text-sm font-medium text-gray-700">Descripcion</label>
            <textarea
              id="project-description"
              value={createForm.description}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="Resumen del objetivo del proyecto (opcional)"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={createLoading}
            >
              {createLoading ? "Creando..." : "Crear proyecto"}
            </button>
            {error ? <span className="text-sm text-rose-600">{error}</span> : null}
            {feedback ? <span className="text-sm text-emerald-600">{feedback}</span> : null}
          </div>
        </form>
      </section>

      {collaboratorProject ? (
        <CollaboratorManagement
          actorId={ownerId}
          projectId={collaboratorProject.id}
          projectName={collaboratorProject.name}
          onClose={() => setCollaboratorProjectId(null)}
        />
      ) : null}

      {modelProjectId ? (
        <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Modelador de dominio</h2>
              <p className="text-sm text-gray-600">Administra clases, atributos, relaciones e identidades del proyecto seleccionado.</p>
            </div>
            <button
              className="rounded border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
              onClick={() => setModelProjectId(null)}
            >
              Cerrar
            </button>
          </div>
          <DomainModelDesigner projectId={modelProjectId} actorId={ownerId} onRefresh={triggerRefresh} />
        </section>
      ) : null}

      <ProjectModal
        modal={modal}
        form={modalForm}
        loading={modalLoading}
        onChange={setModalForm}
        onClose={resetModal}
        onSubmit={handleUpdate}
        onConfirmArchive={handleArchive}
      />
    </div>
  );
}

interface ProjectModalProps {
  modal: ActiveModal;
  form: FormState;
  loading: boolean;
  onChange: (state: FormState) => void;
  onClose: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onConfirmArchive: () => void;
}

function ProjectModal({ modal, form, loading, onChange, onClose, onSubmit, onConfirmArchive }: ProjectModalProps) {
  if (!modal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {modal.type === "edit" ? "Editar proyecto" : "Archivar proyecto"}
          </h3>
          <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
            Cerrar
          </button>
        </div>
        {modal.type === "edit" ? (
          <form className="space-y-4 px-6 py-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Nombre</label>
              <input
                value={form.name}
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Descripcion</label>
              <textarea
                value={form.description}
                onChange={(event) => onChange({ ...form, description: event.target.value })}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 px-6 py-4 text-sm text-gray-600">
            <p>
              El proyecto <span className="font-semibold text-gray-900">{modal.project.name}</span> pasara a estado archivado. No se pierde la informacion y se mantiene visible en la lista.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirmArchive}
                className="rounded bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Archivando..." : "Archivar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const resolveError = (error: unknown) => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Ocurrio un error inesperado";
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};
