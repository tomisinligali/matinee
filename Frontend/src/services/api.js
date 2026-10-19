import { authStorage } from './authStorage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || process.env.API_BASE_URL || 'http://192.168.100.33:4000';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = await authStorage.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}: Failed request`;
      const err = new Error(errorMsg);
      err.code = data?.error?.code || 'API_ERROR';
      err.status = response.status;
      throw err;
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('Network request failed')) {
      const networkErr = new Error(`Cannot reach server at ${BASE_URL}. Ensure backend is running and phone is on the same Wi-Fi.`);
      networkErr.code = 'NETWORK_ERROR';
      throw networkErr;
    }
    throw err;
  }
}

export const api = {
  checkHealth() {
    return request('/health');
  },

  async register({ email, password, name }) {
    const data = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });
    if (data?.token && data?.user) {
      await authStorage.saveSession(data.token, data.user);
    }
    return data;
  },

  async login({ email, password }) {
    const data = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data?.token && data?.user) {
      await authStorage.saveSession(data.token, data.user);
    }
    return data;
  },

  getProfile() {
    return request('/api/v1/auth/me');
  },

  getDashboard() {
    return request('/api/v1/dashboard');
  },

  getNowPlaying(page = 1) {
    return request(`/api/v1/movies/now-playing?page=${page}`);
  },

  getMovieDetails(movieId) {
    return request(`/api/v1/movies/${movieId}`);
  },

  async logout() {
    await authStorage.clearSession();
  }
};
