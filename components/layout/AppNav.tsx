// components/layout/AppNav.tsx
"use client";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import NavBar from "./NavBar";
import { clearAuthToken } from "../auth/token";

type Membership = {
  projectId: string;
  projectName: string;
  role: "PROPIETARIO" | "EDITOR" | "LECTOR";
  active: boolean;
  assignedAt: string;
};

type Props = {
  session: { user: { id: string; name: string }, memberships: Membership[] };
};

export default function AppNav({ session }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const activeView = useMemo<"dashboard" | "users" | "projects" | "model">(() => {
    if (pathname.startsWith("/users")) return "users";
    if (pathname.startsWith("/projects")) return "projects";
    if (pathname.startsWith("/modeler")) return "model";
    return "dashboard";
  }, [pathname]);

  // Primer proyecto donde puede modelar (owner/editor)
  const firstModelableId = useMemo(() => {
    const m = session.memberships.find(
      (x) => x.active && (x.role === "PROPIETARIO" || x.role === "EDITOR")
    );
    return m?.projectId ?? null;
  }, [session.memberships]);

  const onNavigate = (v: "dashboard" | "users" | "projects" | "model") => {
    if (v === "dashboard") router.push("/dashboard" as Route);
    else if (v === "users") router.push("/users" as Route);
    else if (v === "projects") router.push("/projects" as Route);
    else {
      const pid = firstModelableId;
      router.push(((pid ? `/modeler/${pid}` : "/dashboard") as unknown) as Route);
    }
  };

  const canManageUsers = session.memberships.some((m) => m.role === "PROPIETARIO" && m.active);
  const canOpenModeler = session.memberships.some(
    (m) => m.active && (m.role === "PROPIETARIO" || m.role === "EDITOR")
  );
  const projectCount = session.memberships.filter((m) => m.active).length;

  const onLogout = () => {
    // limpia sesión local si la usas
    try { localStorage.removeItem("app_login_success"); } catch {}
    clearAuthToken();
    router.replace("/login" as Route);
  };

  return (
    <NavBar
      activeView={activeView}
      onNavigate={onNavigate}
      onLogout={onLogout}
      userName={session.user.name}
      projectCount={projectCount}
      canManageUsers={canManageUsers}
      canOpenModeler={canOpenModeler}
    />
  );
}
