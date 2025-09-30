// lib/api/auth.ts
import { apiFetch } from "./client";
import type { ProjectMembershipSnapshot, UserDto } from "./users";

export type AuthSuccess = {
  accessToken: string;                     // ⬅ token firmado por tu backend
  user: UserDto;
  memberships: ProjectMembershipSnapshot[];
};

export type LoginSuccess = AuthSuccess;
// Login con objeto (recomendado)
export async function login(payload: { email: string; password: string }): Promise<LoginSuccess> {
  return apiFetch<AuthSuccess>("/auth/login", {
    method: "POST",
    body: {
      email: payload.email.trim().toLowerCase(),   // nombres EXACTOS
      password: payload.password,
    },
  });
}

// Overload opcional si en algún sitio llamas login(email, password)
export function loginWithArgs(email: string, password: string): Promise<LoginSuccess> {
  return login({ email, password });
}

// Registro devolviendo el mismo shape que login
export async function register(payload: { name: string; email: string; password: string }): Promise<AuthSuccess> {
  return apiFetch<AuthSuccess>("/auth/register", {
    method: "POST",
    body: {
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    },
  });
}
