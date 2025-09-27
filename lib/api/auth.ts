import { apiFetch } from "./client";
import type { ProjectMembershipSnapshot, UserDto } from "./users";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginSuccess {
  user: UserDto;
  memberships: ProjectMembershipSnapshot[];
}

export function login(payload: LoginPayload) {
  return apiFetch<LoginSuccess>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function register(payload: RegisterPayload) {
  return apiFetch<LoginSuccess>("/auth/register", {
    method: "POST",
    body: payload,
  });
}
