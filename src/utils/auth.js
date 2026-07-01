import { timingSafeEqual } from 'node:crypto';

export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const AUTH_COOKIE = 'vitastore_session';

export function isPublicPath(path) {
  const publicExact = new Set([
    '/',
    '/index.html',
    '/health',
    '/login',
    '/login.html',
    '/api/auth/login',
  ]);

  if (publicExact.has(path)) return true;
  if (path.startsWith('/css/')) return true;
  if (path.startsWith('/js/')) return true;
  if (path.startsWith('/docs')) return true;
  return false;
}

export function isProtectedPath(path) {
  return path === '/dashboard' || path === '/dashboard.html';
}
