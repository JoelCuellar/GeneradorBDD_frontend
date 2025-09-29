"use client";

import { useState } from "react";
import { login, register, type LoginSuccess } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { setAuthToken } from "./token";
interface LoginFormProps {
  onSuccess: (session: LoginSuccess) => void;
}
function pickToken(session: LoginSuccess | any): string | undefined {
  // Ajusta el nombre del campo si tu backend devuelve otro
  return session?.token || session?.accessToken || session?.jwt || session?.data?.token || session?.data?.accessToken || session?.data?.jwt;
}
type AuthMode = "login" | "register";

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMode = () => {
    if (loading) return;
    setMode((current) => (current === "login" ? "register" : "login"));
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Ingresa un correo valido");
      return;
    }
    if (!password) {
      setError("La contrasena es obligatoria");
      return;
    }

    if (mode === "register") {
      if (!name.trim()) {
        setError("Ingresa tu nombre completo");
        return;
      }
      if (password.length < 8) {
        setError("La contrasena debe tener al menos 8 caracteres");
        return;
      }
      if (password !== confirmPassword) {
        setError("Las contrasenas no coinciden");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const result = await login({ email: email.trim(), password });
        const token = pickToken(result);
         if (token) setAuthToken(token, { cookie: true, days: 7, cookieName: "auth_token" });
       onSuccess(result);
        onSuccess(result);
      } else {
        const result = await register({
          name: name.trim(),
          email: email.trim(),
          password,
        });
        const token = pickToken(result);
        if (token) setAuthToken(token, { cookie: true, days: 7, cookieName: "auth_token" });
        onSuccess(result);
      }
    } catch (err) {
      setError(resolveError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          {mode === "login" ? "Inicia sesion" : "Crea tu cuenta"}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {mode === "login"
            ? "Ingresa tus credenciales para continuar."
            : "Registra una cuenta nueva para comenzar a crear y gestionar proyectos."}
        </p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <div className="space-y-1">
              <label htmlFor="auth-name" className="text-sm font-medium text-gray-700">Nombre completo</label>
              <input
                id="auth-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Nombre y apellido"
              />
            </div>
          ) : null}
          <div className="space-y-1">
            <label htmlFor="auth-email" className="text-sm font-medium text-gray-700">Correo</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="usuario@dominio.com"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="auth-password" className="text-sm font-medium text-gray-700">Contrasena</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder={mode === "login" ? "Tu contrasena" : "Minimo 8 caracteres"}
              required
            />
          </div>
          {mode === "register" ? (
            <div className="space-y-1">
              <label htmlFor="auth-confirm" className="text-sm font-medium text-gray-700">Confirmar contrasena</label>
              <input
                id="auth-confirm"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="Repite tu contrasena"
                required
              />
            </div>
          ) : null}
          {error ? (
            <p className="rounded bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}
          <button
            type="submit"
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
        </form>
      </div>
      <div className="rounded-md border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm">
        {mode === "login" ? (
          <>
            <span>Aun no tienes cuenta?</span>{" "}
            <button
              type="button"
              className="font-semibold text-blue-600 hover:underline"
              onClick={toggleMode}
            >
              Registrate
            </button>
          </>
        ) : (
          <>
            <span>Ya tienes una cuenta?</span>{" "}
            <button
              type="button"
              className="font-semibold text-blue-600 hover:underline"
              onClick={toggleMode}
            >
              Inicia sesion
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const resolveError = (error: unknown) => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Ocurrio un error inesperado";
};

