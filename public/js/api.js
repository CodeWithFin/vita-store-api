const API = {
  async request(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 && !path.includes('/api/auth/login')) {
      window.location.href = '/login?next=/dashboard';
      throw new Error('Session expired');
    }

    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
  },

  login(username, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  logout() {
    return this.request('/api/auth/logout', { method: 'POST' });
  },

  me() {
    return this.request('/api/auth/me');
  },

  getMetrics() {
    return this.request('/api/dashboard/metrics');
  },

  getItems(params = {}) {
    const query = new URLSearchParams();
    if (params.category) query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    if (params.low_stock) query.set('low_stock', 'true');
    const qs = query.toString();
    return this.request(`/api/items${qs ? `?${qs}` : ''}`);
  },

  getItem(id) {
    return this.request(`/api/items/${id}`);
  },

  createItem(body) {
    return this.request('/api/items', { method: 'POST', body: JSON.stringify(body) });
  },

  async importItems(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/items/import', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {
      window.location.href = '/login?next=/dashboard';
      throw new Error('Session expired');
    }

    if (!response.ok) {
      throw new Error(data.message || `Import failed (${response.status})`);
    }

    return data;
  },

  downloadImportTemplate() {
    window.location.href = '/api/items/import/template';
  },

  updateItem(id, body) {
    return this.request(`/api/items/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  },

  deleteItem(id) {
    return this.request(`/api/items/${id}`, { method: 'DELETE' });
  },

  getMovements(params = {}) {
    const query = new URLSearchParams();
    if (params.item_id) query.set('item_id', params.item_id);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.request(`/api/movements${qs ? `?${qs}` : ''}`);
  },

  createMovement(body) {
    return this.request('/api/movements', { method: 'POST', body: JSON.stringify(body) });
  },
};

export default API;
