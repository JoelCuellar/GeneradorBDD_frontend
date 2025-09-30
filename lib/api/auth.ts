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

export function login(email: string, password: string) {
  return apiFetch<LoginResp>("/auth/login", { method: "POST", body: { email, password } });
}
export function register(payload: RegisterPayload) {
  return apiFetch<LoginSuccess>("/auth/register", {
    method: "POST",
    body: payload,
  });
}
export type LoginResp = {
  accessToken: string;
  user: { id: string; email: string; name?: string };
};

