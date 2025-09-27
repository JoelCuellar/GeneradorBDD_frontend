"use client";

import type { ChangeEvent } from "react";
import { useMemo } from "react";
import DomainModelDesigner from "@/components/domain-model/DomainModelDesigner";
import type { ProjectMembershipSnapshot } from "@/lib/api/users";

interface ProjectModelerProps {
  actorId: string;
  projects: ProjectMembershipSnapshot[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onClose: () => void;
}

export default function ProjectModeler({ actorId, projects, selectedProjectId, onSelectProject, onClose }: ProjectModelerProps) {
  const selectedProject = useMemo(
    () => projects.find((project) => project.projectId === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );

  const handleSelectProject = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    onSelectProject(value ? value : null);
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Modelador de dominio</h1>
          <p className="text-sm text-gray-600">Selecciona un proyecto para modelar o actualizar su diagrama conceptual.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="w-64 min-w-[240px] rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={selectedProjectId ?? ""}
            onChange={handleSelectProject}
          >
            <option value="">Selecciona un proyecto</option>
            {projects.map((project) => (
              <option key={project.projectId} value={project.projectId}>
                {project.projectName}
              </option>
            ))}
          </select>
          <button
            className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Volver al inicio
          </button>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
          No tienes proyectos habilitados para modelar. Solicita acceso como editor o propietario para continuar.
        </div>
      ) : selectedProject ? (
        <DomainModelDesigner projectId={selectedProject.projectId} actorId={actorId} />
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          Selecciona un proyecto para comenzar a modelar.
        </div>
      )}
    </section>
  );
}


