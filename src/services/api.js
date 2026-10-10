import axios from 'axios';

// ReHome API client configuration — base URL driven by environment
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const TOKEN_KEY = 'rehome_token';
export const USER_KEY = 'rehome_user';

// Attach JWT token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: 401 triggers token cleanup and network error friendly handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('rehome:unauthorized'));
      }
    } else if (!error.response) {
      // Network failure: normalize message for UI displays
      error.friendlyMessage = 'Cannot reach the ReHome server. Please check your connection and try again.';
    }
    return Promise.reject(error);
  }
);

// Shared helper to persist or clear the current session
const setSession = (data) => {
  if (data?.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
  }
  if (data?.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }
  return data;
};

export const authService = {
  async login(credentials) {
    const res = await api.post('/auth/login', credentials);
    return setSession(res.data);
  },

  async register(data) {
    const res = await api.post('/auth/register', data);
    return setSession(res.data);
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getStoredUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
};

export const normalizeItem = (item) => {
  if (!item) return null;
  const loc = item.location || {};
  return {
    ...item,
    id: item._id || item.id,
    location: {
      ...loc,
      address: loc.address || '',
      city: loc.city || ''
    },
    price: Number(item.price ?? 0),
    isFree: Boolean(item.isFree)
  };
};

export const normalizeListResponse = (data) => ({
  ...data,
  items: (data.items || []).map(normalizeItem)
});

// Service layer — every operation talks to the real backend. No mock fallbacks.
export const itemsService = {
  async getItems(params = {}) {
    const res = await api.get('/items', { params });
    return normalizeListResponse(res.data);
  },

  async getItemById(id) {
    const res = await api.get(`/items/${id}`);
    return { ...res.data, item: normalizeItem(res.data.item) };
  },

  async getNearbyItems(params = {}) {
    const res = await api.get('/items/nearby', { params });
    return normalizeListResponse(res.data);
  },

  async getMyListings(params = {}) {
    const res = await api.get('/items/my/listings', { params });
    return normalizeListResponse(res.data);
  },

  async updateItemStatus(id, status) {
    const res = await api.patch(`/items/${id}/status`, { status });
    return res.data;
  },

  async createItem(itemData) {
    const isFormData = typeof FormData !== 'undefined' && itemData instanceof FormData;
    const res = await api.post('/items', itemData, isFormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined);
    return { ...res.data, item: normalizeItem(res.data.item) };
  },

  async updateItem(id, itemData) {
    const res = await api.put(`/items/${id}`, itemData);
    return { ...res.data, item: normalizeItem(res.data.item) };
  },

  async deleteItem(id) {
    const res = await api.delete(`/items/${id}`);
    return res.data;
  }
};

export const userService = {
  async getProfile(id) {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },

  async updateProfile(data) {
    const res = await api.put('/users/me', data);
    return res.data;
  }
};

export default api;
