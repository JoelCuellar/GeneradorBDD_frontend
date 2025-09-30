"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { acceptInvitation } from "@/lib/api/invitations";
import { getAuthToken, getAuthUserId } from "@/components/auth/token";
import { ApiError } from "@/lib/api/client";

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const { token } = params;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si volvemos del login y ya hay sesión, aceptar automáticamente
  useEffect(() => {
    const uid = getAuthUserId();
    const pending = typeof window !== "undefined"
      ? localStorage.getItem("pendingInviteToken")
      : null;

    if (getAuthToken() && uid && pending === token) {
      void onAccept(); // dispara aceptación automática
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onAccept = async () => {
    const uid = getAuthUserId();

    // Si no hay sesión, guardamos el token y vamos a /login con retorno
    if (!uid) {
      try { localStorage.setItem("pendingInviteToken", token); } catch {}
      const next = `/invite/${token}`;
      router.replace((`/login?next=${encodeURIComponent(next)}` as unknown) as Route);
      return;
    }

    try {
      setBusy(true);
      setError(null);
      const r = await acceptInvitation(token, uid);
      try { localStorage.removeItem("pendingInviteToken"); } catch {}
      router.replace((`/modeler/${r.projectId}` as unknown) as Route); // o "/dashboard"
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Invitación no válida o expirada");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-2 text-xl font-semibold">Invitación al proyecto</h1>
      <p className="text-sm text-gray-600">
        Pulsa <b>Aceptar invitación</b> para unirte al proyecto.
      </p>

      <button
        onClick={onAccept}
        disabled={busy}
        className="mt-4 rounded bg-green-600 px-3 py-1 text-white disabled:opacity-60"
      >
        {busy ? "Aceptando…" : "Aceptar invitación"}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
