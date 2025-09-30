// app/login/LoginClient.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { login, register } from "@/lib/api/auth";
import type { LoginSuccess } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

type Props = { next: string };

export default function LoginClient({ next }: Props) {
  const router = useRouter();

  // ----- estado formulario -----
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ----- persistir sesión -----
  const persistSession = useCallback((s: LoginSuccess) => {
    localStorage.setItem("accessToken", s.accessToken);
    localStorage.setItem(
      "session",
      JSON.stringify({ user: s.user, memberships: s.memberships ?? [] })
    );
  }, []);

  // ----- submit -----
  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      setSubmitting(true);

      if (mode === "login") {
        if (!email || !password) throw new Error("Ingresa tu correo y contraseña.");
        const res = await login({ email, password });
        persistSession(res);
      } else {
        // register
        if (!name.trim()) throw new Error("Ingresa tu nombre.");
        if (!email) throw new Error("Ingresa tu correo.");
        if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
        if (password !== confirm) throw new Error("Las contraseñas no coinciden.");
        const res = await register({ name: name.trim(), email, password });
        persistSession(res);
      }

      router.replace((next || "/dashboard") as Route);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(typeof err.message === "string" ? err.message : "Error de autenticación.");
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("No se pudo procesar la solicitud.");
      }
      setSubmitting(false);
    }
  };

  // ----- UI -----
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-md border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">
              {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </h1>
            <button
              type="button"
              className="text-xs text-blue-700 hover:underline"
              onClick={() => {
                setMode((m) => (m === "login" ? "register" : "login"));
                setError(null);
              }}
            >
              {mode === "login" ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
            </button>
          </div>

          <p className="mt-1 text-sm text-gray-600">
            {mode === "login"
              ? <>Accede para continuar a <span className="font-medium">{next}</span></>
              : "Crea tu cuenta para empezar a usar el sistema."}
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                <input
                  type="text"
                  autoComplete="name"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Correo</label>
              <input
                type="email"
                autoComplete="email"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Contraseña</label>
              <div className="mt-1 flex">
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full rounded-l border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="rounded-r border border-l-0 border-gray-300 px-3 text-xs text-gray-600 hover:bg-gray-50"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPwd ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirmar contraseña</label>
                <input
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-600"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={submitting}
                  required
                  minLength={6}
                />
              </div>
            )}

            {error && (
              <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              className="w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
              disabled={submitting}
            >
              {submitting ? (mode === "login" ? "Ingresando..." : "Creando cuenta...") : (mode === "login" ? "Ingresar" : "Crear cuenta")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
