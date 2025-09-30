"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import AppNav from "@/components/layout/AppNav";
import ProjectManagement from "@/components/projects/ProjectManagement";
import { useClientSession } from "@/lib/useClienteSession";
export default function ProjectsPage() {
  const router = useRouter();
  const { session, loaded } = useClientSession();

  // Redirige solo cuando ya cargó y no hay sesión (en cliente)
  useEffect(() => {
    if (loaded && !session) {
      router.replace("/login?next=/projects" as Route);
    }
  }, [loaded, session, router]);

  // Placeholder estable mientras carga o redirige (evita hydration mismatch)
  if (!loaded || !session) return <main className="min-h-screen bg-gray-50" />;

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav session={session} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <ProjectManagement ownerId={session.user.id} onProjectsChange={() => {}} />
      </div>
    </main>
  );
}
