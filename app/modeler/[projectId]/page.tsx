"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import AppNav from "@/components/layout/AppNav";
import ProjectModeler from "@/components/domain-model/ProjectModeler";
import { getSession } from "@/lib/session";
import type { ProjectRole } from "@/lib/api/users";

export default function ModelerPage({ params }: { params: { projectId: string } }) {
  const router = useRouter();
  const { projectId } = params;

  const session = getSession();

  // 1) Si no hay sesión, redirige a login (pero NO retornes aún)
  useEffect(() => {
    if (!session) {
      router.replace((`/login?next=/modeler/${projectId}` as unknown) as Route);
    }
  }, [session, router, projectId]);

  // 2) Hooks SIEMPRE (usando fallback cuando no hay sesión)
  const modelableProjects = useMemo(
    () =>
      (session?.memberships ?? [])
        .filter((m) => m.active && (m.role === "PROPIETARIO" || m.role === "EDITOR"))
        .map((m) => ({
          projectId: m.projectId,
          projectName: m.projectName,
          role: m.role as ProjectRole,
          active: m.active,
          assignedAt: m.assignedAt,
        })),
    [session],
  );

  // 3) Si hay sesión pero no acceso a ese proyecto, manda al dashboard
  useEffect(() => {
    if (session && !modelableProjects.some((p) => p.projectId === projectId)) {
      router.replace("/dashboard" as Route);
    }
  }, [session, modelableProjects, projectId, router]);

  // Mientras redirige, no renderizamos nada
  if (!session) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav session={session} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ProjectModeler
          actorId={session.user.id}
          projects={modelableProjects as any}
          selectedProjectId={projectId}
          onSelectProject={(pid) => router.replace((`/modeler/${pid}` as unknown) as Route)}
          onClose={() => router.push("/dashboard" as Route)}
        />
      </div>
    </main>
  );
}
