import { cookies } from 'next/headers';

const API_BASE = process.env.VITASTORE_API_BASE_URL || 'http://localhost:3000';

export async function serverFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieStore = cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: 'no-store',
  });

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message: string }).message)
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}
