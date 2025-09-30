"use client";

import { useEffect, useMemo, useState } from "react";
import LoginForm from "@/components/auth/LoginForm";
import NavBar from "@/components/layout/NavBar";
import UserManagement from "@/components/user-management/UserManagement";
import ProjectManagement from "@/components/projects/ProjectManagement";
import ProjectModeler from "@/components/domain-model/ProjectModeler";
import type { LoginSuccess } from "@/lib/api/auth";
import type { ProjectMembershipSnapshot, ProjectRole } from "@/lib/api/users";
import type { ProjectDto } from "@/lib/api/projects";
import { setAuthToken, clearAuthToken, getAuthToken } from "@/components/auth/token";
import { useSearchParams } from "next/navigation";
const ROLE_LABEL: Record<ProjectRole, string> = {
  PROPIETARIO: "Propietario",
  EDITOR: "Editor",
  LECTOR: "Lector",
};

export default function Page() {
  const [session, setSession] = useState<LoginSuccess | null>(null);
  const [view, setView] = useState<"dashboard" | "users" | "projects" | "model">("dashboard");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [modelProjectId, setModelProjectId] = useState<string | null>(null);

  const [ownedProjects, setOwnedProjects] = useState<ProjectMembershipSnapshot[]>([]);
  // debajo de tus useState principales
const SESSION_KEY = "app_login_success";
const searchParams = useSearchParams();
 useEffect(() => {
    if (session) return;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw) as LoginSuccess);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    } catch {}
  }, [session]);

  const participatingProjects = useMemo(
    () => session?.memberships.filter((m) => m.role !== "PROPIETARIO" && m.active) ?? [],
    [session],
  );

  const modelableProjects = useMemo(
    () => {
      if (!session) return [];
      const map = new Map<string, ProjectMembershipSnapshot>();
      session.memberships.forEach((membership) => {
        if (!membership.active) return;
        if (membership.role === "PROPIETARIO" || membership.role === "EDITOR") {
          map.set(membership.projectId, {
            projectId: membership.projectId,
            projectName: membership.projectName,
            role: membership.role as ProjectRole,
            active: membership.active,
            assignedAt: membership.assignedAt,
          });
        }
      });
      return Array.from(map.values());
    },
    [session],
  );

  useEffect(() => {
    if (!session) {
      setOwnedProjects([]);
      return;
    }
    const snapshots = session.memberships
      .filter((membership) => membership.role === "PROPIETARIO")
      .map((membership) => ({
        projectId: membership.projectId,
        projectName: membership.projectName,
        role: membership.role,
        active: membership.active,
        assignedAt: membership.assignedAt,
      }));
    setOwnedProjects(snapshots);
  }, [session]);

  const handleProjectsChange = (projects: ProjectDto[]) => {
    const activeProjects = projects
      .filter((project) => !project.archived)
      .map((project) => ({
        projectId: project.id,
        projectName: project.name,
        role: "PROPIETARIO" as ProjectRole,
        active: true,
        assignedAt: project.createdAt,
      }));
    setOwnedProjects(activeProjects);
  };

  useEffect(() => {
    if (ownedProjects.length === 0) {
      setSelectedProjectId(null);
      return;
    }
    setSelectedProjectId((current) => {
      if (!current) return ownedProjects[0].projectId;
      return ownedProjects.some((p) => p.projectId === current) ? current : ownedProjects[0].projectId;
    });
  }, [ownedProjects]);

  useEffect(() => {
    if (modelableProjects.length === 0) {
      setModelProjectId(null);
      return;
    }
    setModelProjectId((current) => {
      if (!current) return modelableProjects[0].projectId;
      return modelableProjects.some((project) => project.projectId === current)
        ? current
        : modelableProjects[0].projectId;
    });
  }, [modelableProjects]);

 const handleLogin = (data: LoginSuccess) => {
  // toma el JWT que ya guardó el LoginForm (o tu login API)
  const token = getAuthToken();
  if (token) {
    // opcional: también guárdalo como cookie para websockets/etc.
    setAuthToken(token, { cookie: true });
  }

  setSession(data);

  const next = searchParams.get("next");
  if (next) {
    window.location.replace(next);
    return;
  }
  setView("dashboard");
};
  const handleLogout = () => {
  clearAuthToken();                       // <-- limpia JWT
  try { localStorage.removeItem(SESSION_KEY); } catch {}
  setSession(null);
  setSelectedProjectId(null);
  setModelProjectId(null);
  setView("dashboard");
};

  const canOpenModeler = modelableProjects.length > 0;

  const handleNavigate = (nextView: "dashboard" | "users" | "projects" | "model") => {
    if (nextView === "users" && ownedProjects.length === 0) return;
    if (nextView === "model") {
      if (!canOpenModeler) return;
      if (!modelProjectId && modelableProjects.length > 0) {
        setModelProjectId(modelableProjects[0].projectId);
      }
    }
    setView(nextView);
  };

  if (!session) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <LoginForm onSuccess={handleLogin} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar
        activeView={view}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        userName={session.user.name}
        projectCount={session.memberships.filter((m) => m.active).length}
        canManageUsers={ownedProjects.length > 0}
        canOpenModeler={canOpenModeler}
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        {view === "dashboard" ? (
          <Dashboard
            userName={session.user.name}
            ownedProjects={ownedProjects}
            participatingProjects={participatingProjects}
            onSelectProject={(projectId) => {
              setSelectedProjectId(projectId);
              handleNavigate("users");
            }}
            onManageProjects={() => handleNavigate("projects")}
            onOpenModeler={(projectId) => {
              setModelProjectId(projectId);
              handleNavigate("model");
            }}
          />
        ) : view === "users" ? (
          <UserManagement
            actorId={session.user.id}
            projects={ownedProjects}
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
          />
        ) : view === "projects" ? (
          <ProjectManagement ownerId={session.user.id} onProjectsChange={handleProjectsChange} />
        ) : (
          <ProjectModeler
            actorId={session.user.id}
            projects={modelableProjects}
            selectedProjectId={modelProjectId}
            onSelectProject={setModelProjectId}
            onClose={() => handleNavigate("dashboard")}
          />
        )}
      </div>
    </main>
  );
}

interface DashboardProps {
  userName: string;
  ownedProjects: ProjectMembershipSnapshot[];
  participatingProjects: ProjectMembershipSnapshot[];
  onSelectProject: (projectId: string) => void;
  onManageProjects: () => void;
  onOpenModeler: (projectId: string) => void;
}

function Dashboard({ userName, ownedProjects, participatingProjects, onSelectProject, onManageProjects, onOpenModeler }: DashboardProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Hola, {userName}</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gestiona los equipos de tus proyectos o revisa aquellos en los que colaboras como editor o lector.
        </p>
      </section>

      <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
        <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Proyectos donde eres propietario</h2>
            <p className="text-sm text-gray-600">Gestiona equipos y administra el ciclo de vida de los proyectos.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {ownedProjects.length} {ownedProjects.length === 1 ? "proyecto" : "proyectos"}
            </span>
            <button
              className="rounded border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
              onClick={onManageProjects}
            >
              Administrar proyectos
            </button>
          </div>
        </header>
        {ownedProjects.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">Aun no eres propietario de ningun proyecto activo.</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {ownedProjects.map((project) => (
              <li key={project.projectId} className="rounded border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{project.projectName}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="rounded bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-black"
                      onClick={() => onSelectProject(project.projectId)}
                    >
                      Gestionar usuarios
                    </button>
                    <button
                      className="rounded border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                      onClick={() => onOpenModeler(project.projectId)}
                    >
                      Modelar dominio
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Otros proyectos donde participas</h2>
            <p className="text-sm text-gray-600">Consulta su estado y rol asignado.</p>
          </div>
          <span className="rounded bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            {participatingProjects.length}
          </span>
        </header>
        {participatingProjects.length === 0 ? (
          <p className="mt-4 text-sm text-gray-600">No tienes otros proyectos activos.</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {participatingProjects.map((project) => {
              const canModel = project.role === "EDITOR";
              return (
                <li key={project.projectId} className="rounded border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{project.projectName}</p>
                      <p className="mt-1 text-xs text-gray-600">Rol: {ROLE_LABEL[project.role]}</p>
                    </div>
                    <button
                      className={"rounded border px-3 py-1 text-xs font-medium " + (canModel ? "border-blue-600 text-blue-600 hover:bg-blue-50" : "border-gray-300 text-gray-400")}
                      onClick={() => { if (canModel) onOpenModeler(project.projectId); }}
                      disabled={!canModel}
                    >
                      Modelar dominio
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}


