"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { getSession } from "@/lib/session";

export default function ModelerSelectorPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();

    if (!session) {
      router.replace("/login?next=/modeler" as Route);
      return;
    }

    const modelable = session.memberships.find(
      (m) => m.active && (m.role === "PROPIETARIO" || m.role === "EDITOR")
    );

    if (modelable) {
      router.replace((`/modeler/${modelable.projectId}` as unknown) as Route);
    } else {
      router.replace("/dashboard" as Route);
    }
  }, [router]);

  return null;
}
