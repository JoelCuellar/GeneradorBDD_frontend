"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import AppNav from "@/components/layout/AppNav";
import { getSession } from "@/lib/session";
import type { ProjectRole } from "@/lib/api/users";

const ROLE_LABEL: Record<ProjectRole, string> = {
  PROPIETARIO: "Propietario",
  EDITOR: "Editor",
  LECTOR: "Lector",
};

export default function DashboardPage() {
  const router = useRouter();

  // 1) Cargar la sesión SOLO al montar (evita mismatch de hidratación)
  const [session, setSession] = useState<ReturnType<typeof getSession>>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setSession(getSession());  // lee localStorage en cliente
    setLoaded(true);
  }, []);

  // 2) Redirigir cuando ya cargó y no hay sesión
  useEffect(() => {
    if (loaded && !session) {
      router.replace("/login?next=/dashboard" as Route);
    }
  }, [loaded, session, router]);

  // 3) Hooks SIEMPRE (usa fallback mientras no hay sesión)
  const ownedProjects = useMemo(
    () => (session?.memberships ?? []).filter((m) => m.active && m.role === "PROPIETARIO"),
    [session],
  );

  const participatingProjects = useMemo(
    () => (session?.memberships ?? []).filter((m) => m.active && m.role !== "PROPIETARIO"),
    [session],
  );

  const openUsers = () => { router.push("/users" as Route); };
  const openProjects = () => { router.push("/projects" as Route); };
  const openModeler = (projectId: string) => {
    router.push((`/modeler/${projectId}` as unknown) as Route);
  };

  // 4) Mientras se carga o se redirige, renderiza un <main> vacío y válido
  if (!loaded || !session) return <main className="min-h-screen bg-gray-50" />;

  // 5) UI normal cuando hay sesión
  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav session={session} />

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        {/* Bienvenida */}
        <section className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">Hola, {session.user.name}</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gestiona los equipos de tus proyectos o revisa aquellos en los que colaboras como editor o lector.
          </p>
        </section>

        {/* Proyectos donde eres propietario */}
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
                onClick={openProjects}
              >
                Administrar proyectos
              </button>
            </div>
          </header>

          {ownedProjects.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">Aún no eres propietario de ningún proyecto activo.</p>
          ) : (
            <ul className="mt-4 grid gap-3 md:grid-cols-2">
              {ownedProjects.map((p) => (
                <li key={p.projectId} className="rounded border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{p.projectName}</p>
                      <p className="mt-1 text-xs text-gray-600">Rol: {ROLE_LABEL[p.role as ProjectRole]}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="rounded bg-gray-900 px-3 py-1 text-xs font-medium text-white hover:bg-black"
                        onClick={() => openUsers()}
                      >
                        Gestionar usuarios
                      </button>
                      <button
                        className="rounded border border-blue-600 px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
                        onClick={() => openModeler(p.projectId)}
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

        {/* Proyectos donde participas */}
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
              {participatingProjects.map((p) => {
                const canModel = p.role === "EDITOR";
                return (
                  <li key={p.projectId} className="rounded border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">{p.projectName}</p>
                        <p className="mt-1 text-xs text-gray-600">Rol: {ROLE_LABEL[p.role as ProjectRole]}</p>
                      </div>
                      <button
                        className={
                          "rounded border px-3 py-1 text-xs font-medium " +
                          (canModel ? "border-blue-600 text-blue-600 hover:bg-blue-50" : "border-gray-300 text-gray-400")
                        }
                        onClick={() => canModel && openModeler(p.projectId)}
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
    </main>
  );
}
