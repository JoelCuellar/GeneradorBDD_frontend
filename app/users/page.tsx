"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import AppNav from "@/components/layout/AppNav";
import UserManagement from "@/components/user-management/UserManagement";
import { getSession } from "@/lib/session";
import type { ProjectMembershipSnapshot } from "@/lib/api/users";

export default function UsersPage() {
  const router = useRouter();
  const session = getSession();

  // 1) Redirige si no hay sesión (NO retornes aún)
  useEffect(() => {
    if (!session) {
      router.replace("/login?next=/users" as Route);
    }
  }, [session, router]);

  // 2) Lista de proyectos donde es propietario (hook siempre)
  const owned: ProjectMembershipSnapshot[] = useMemo(
    () =>
      (session?.memberships ?? []).filter(
        (m) => m.active && m.role === "PROPIETARIO",
      ) as any,
    [session],
  );

  const [selected, setSelected] = useState<string | null>(null);

  // 3) Seleccionar por defecto el primero disponible
  useEffect(() => {
    if (owned.length === 0) {
      setSelected(null);
      return;
    }
    setSelected((prev) =>
      prev && owned.some((p) => p.projectId === prev) ? prev : owned[0].projectId,
    );
  }, [owned]); // ✅ depende del array completo, no de owned.length

  // Mientras redirige, no renderizamos nada
  if (!session) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <AppNav session={session} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <UserManagement
          actorId={session.user.id}
          projects={owned}
          selectedProjectId={selected}
          onProjectChange={setSelected}
        />
      </div>
    </main>
  );
}
