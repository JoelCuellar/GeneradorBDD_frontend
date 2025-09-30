// lib/auth/token.ts
const LS_KEYS = ['auth_token', 'access_token', 'token', 'jwt'];
const COOKIE_CANDIDATES = ['auth_token', 'access_token', 'token', 'jwt'];
const DEFAULT_COOKIE = 'auth_token';

export function setAuthToken(token: string, opts?: { cookie?: boolean; days?: number; cookieName?: string }) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LS_KEYS[0], token); } catch {}
  if (opts?.cookie) {
    const days = opts.days ?? 7;
    const name = opts.cookieName ?? DEFAULT_COOKIE;
    const exp = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${encodeURIComponent(token)}; Path=/; SameSite=Lax; Expires=${exp.toUTCString()}`;
  }
}

export function getAuthToken(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  for (const key of LS_KEYS) {
    try { const v = localStorage.getItem(key); if (v) return v; } catch {}
  }
  const cookie = typeof document !== 'undefined' ? document.cookie : '';
  for (const name of COOKIE_CANDIDATES) {
    const m = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    if (m) return decodeURIComponent(m[1]);
  }
  return undefined;
}

export function clearAuthToken(opts?: { cookieName?: string }) {
  if (typeof window === 'undefined') return;
  for (const key of LS_KEYS) { try { localStorage.removeItem(key); } catch {} }
  const name = opts?.cookieName ?? 'auth_token';
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

type JwtPayload = { sub?: string; id?: string; userId?: string; email?: string; [k: string]: any };

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const norm = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = norm.length % 4 ? "=".repeat(4 - (norm.length % 4)) : "";
    const json = atob(norm + pad);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/** Devuelve el userId (sub/id/userId) del JWT, si existe */
export function getAuthUserId(): string | undefined {
  const t = getAuthToken();
  if (!t) return undefined;
  const p = decodeJwtPayload(t);
  return p?.sub || p?.id || p?.userId || undefined;
}

/** (Opcional) sesión práctica para otros usos */
export function getAuthSession():
  | { accessToken: string; userId?: string; email?: string }
  | null {
  const t = getAuthToken();
  if (!t) return null;
  const p = decodeJwtPayload(t) || {};
  return { accessToken: t, userId: p.sub || p.id || p.userId, email: p.email };
  }