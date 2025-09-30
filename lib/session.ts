// lib/session.ts
import type { LoginSuccess } from "@/lib/api/auth";

const SKEY = "app_login_success";

export function getSession(): LoginSuccess | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SKEY);
    return raw ? (JSON.parse(raw) as LoginSuccess) : null;
  } catch { return null; }
}

export function setSession(s: LoginSuccess | null) {
  if (typeof window === "undefined") return;
  try {
    if (s) localStorage.setItem(SKEY, JSON.stringify(s));
    else localStorage.removeItem(SKEY);
  } catch {}
}
