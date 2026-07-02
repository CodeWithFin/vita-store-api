export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const hasBody = options.body !== undefined && options.body !== null;
  const headers = new Headers(options.headers);

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...options,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'message' in data
        ? String((data as { message: string }).message)
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return data as T;
}

export const clientApi = {
  login(username: string, password: string) {
    return apiFetch<{ data: { user: { username: string }; message: string } }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  logout() {
    return apiFetch('/api/auth/logout', { method: 'POST' });
  },

  me() {
    return apiFetch<{ data: { user: { username: string } } }>('/api/auth/me');
  },

  getMetrics() {
    return apiFetch<{ data: import('./types').Metrics }>('/api/dashboard/metrics');
  },

  getExpiring(days = 90) {
    return apiFetch<{ data: import('./types').ExpiringBatch[]; count: number }>(
      `/api/dashboard/expiring?days=${days}`
    );
  },

  getBrands() {
    return apiFetch<{ data: import('./types').BrandSummary[]; count: number }>('/api/dashboard/brands');
  },

  getItems(params: Record<string, string | boolean | undefined> = {}) {
    const query = new URLSearchParams();
    if (params.product_type) query.set('product_type', String(params.product_type));
    if (params.brand) query.set('brand', String(params.brand));
    if (params.search) query.set('search', String(params.search));
    if (params.low_stock) query.set('low_stock', 'true');
    const qs = query.toString();
    return apiFetch<{ data: import('./types').Item[]; count: number }>(
      `/api/items${qs ? `?${qs}` : ''}`
    );
  },

  getItem(id: string) {
    return apiFetch<{ data: import('./types').Item }>(`/api/items/${id}`);
  },

  createItem(body: Record<string, unknown>) {
    return apiFetch<{ data: import('./types').Item }>('/api/items', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  updateItem(id: string, body: Record<string, unknown>) {
    return apiFetch<{ data: import('./types').Item }>(`/api/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  deleteItem(id: string) {
    return apiFetch(`/api/items/${id}`, { method: 'DELETE' });
  },

  getMovements(params: { item_id?: string; page?: number; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.item_id) query.set('item_id', params.item_id);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return apiFetch<{
      data: import('./types').Movement[];
      pagination: { page: number; limit: number; total: number; total_pages: number };
    }>(`/api/movements${qs ? `?${qs}` : ''}`);
  },

  createMovement(body: Record<string, unknown>) {
    return apiFetch('/api/movements', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};
