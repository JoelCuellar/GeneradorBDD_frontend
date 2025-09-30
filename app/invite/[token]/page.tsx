// app/invite/[token]/page.tsx
"use client";
import { useEffect, useState } from "react";
import { acceptInvitation } from "@/lib/api/invitations";
import { ApiError } from "@/lib/api/client";

import { getAuthToken, getAuthUserId } from "@/components/auth/token";

export default function AcceptInvitePage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Si volvemos del login y ya hay token + userId + pending = aceptar automático
  useEffect(() => {
    const hasJwt = !!getAuthToken();
    const uid = getAuthUserId();
    const pending = typeof window !== "undefined" ? localStorage.getItem("pendingInviteToken") : null;
    if (hasJwt && uid && pending === token) {
      (async () => {
        try {
          setBusy(true);
          const r = await acceptInvitation(token, uid);
          localStorage.removeItem("pendingInviteToken");
          window.location.href = `/projects/${r.projectId}`;
        } catch (e) {
          setError(e instanceof ApiError ? e.message : "Invitación no válida o expirada");
          setBusy(false);
        }
      })();
    }
  }, [token]);

  const onAccept = async () => {
    const uid = getAuthUserId();
    if (!uid) {
      // sin sesión → guardar token y redirigir a login, que vuelva aquí
      localStorage.setItem("pendingInviteToken", token);
      const next = encodeURIComponent(`/invite/${token}`);
      window.location.href = `/login?next=${next}`;
      return;
    }
    try {
      setBusy(true);
      setError(null);
      const r = await acceptInvitation(token, uid);
      localStorage.removeItem("pendingInviteToken");
      window.location.href = `/projects/${r.projectId}`;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Invitación no válida o expirada");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-2 text-xl font-semibold">Invitación al proyecto</h1>
      <p className="text-sm text-gray-600">Pulsa aceptar para unirte al proyecto.</p>

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
