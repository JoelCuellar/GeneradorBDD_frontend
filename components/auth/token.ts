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
