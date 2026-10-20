import { Platform } from 'react-native';
import { authStorage } from './authStorage';

const defaultHost = (typeof window !== 'undefined' && (window?.location?.hostname === 'localhost' || window?.location?.hostname === '127.0.0.1'))
  ? 'http://localhost:4000'
  : 'http://192.168.100.33:4000';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || process.env.API_BASE_URL || defaultHost;

let activeWaitingRoomToken = null;
let lastServerWriteTimestamp = null;

export const setWaitingRoomToken = (token) => {
  activeWaitingRoomToken = token;
};

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const requestId = generateUUID();
  const headers = {
    'Content-Type': 'application/json',
    'X-Request-Id': requestId,
    ...(options.headers || {})
  };

  const token = await authStorage.getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (activeWaitingRoomToken) {
    headers['X-Waiting-Room-Token'] = activeWaitingRoomToken;
  }

  // Include recent write timestamp for Read-Your-Own-Writes consistency
  if (lastServerWriteTimestamp && (Date.now() - lastServerWriteTimestamp < 5000)) {
    headers['X-Matinee-Write-Timestamp'] = String(lastServerWriteTimestamp);
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Capture RYOW write timestamp if response indicates a state change
    const respWriteTs = response.headers.get('x-matinee-write-timestamp');
    if (respWriteTs) {
      lastServerWriteTimestamp = parseInt(respWriteTs, 10);
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.error?.message || `HTTP ${response.status}: Failed request`;
      const err = new Error(errorMsg);
      err.code = data?.error?.code || 'API_ERROR';
      err.status = response.status;
      err.data = data;
      err.requestId = response.headers.get('x-request-id') || requestId;

      // Report client-side caught API errors to telemetry
      if (response.status >= 500) {
        api.reportError({
          errorName: 'ApiError',
          message: `${options.method || 'GET'} ${endpoint} failed with ${response.status}`,
          path: endpoint,
          requestId: err.requestId
        }).catch(() => {});
      }

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

  async register({ email, password, name, role }) {
    const data = await request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: (email || '').trim().toLowerCase(),
        password,
        name,
        role
      })
    });
    if (data?.token && data?.user) {
      await authStorage.saveSession(data.token, data.user);
    }
    return data;
  },

  async login({ email, password }) {
    const data = await request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: (email || '').trim().toLowerCase(),
        password
      })
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

  // --- Showtimes & Inventory ---
  getShowtimes() {
    return request('/api/v1/showtimes');
  },

  getShowtimeSeats(showtimeId) {
    return request(`/api/v1/showtimes/${showtimeId}/seats`);
  },

  // --- Payment & Booking Lifecycles ---
  acquireSeatHold({ showtimeId, seatIds }) {
    return request('/api/v1/payments/hold', {
      method: 'POST',
      body: JSON.stringify({ showtimeId, seatIds })
    });
  },

  initiateCheckout({ showtimeId, seatIds, idempotencyKey, customer }) {
    return request('/api/v1/payments/checkout', {
      method: 'POST',
      body: JSON.stringify({
        showtimeId,
        seatIds,
        idempotencyKey,
        customer
      })
    });
  },

  abandonCheckout({ bookingId, showtimeId, seatIds }) {
    return request('/api/v1/payments/abandon', {
      method: 'POST',
      body: JSON.stringify({ bookingId, showtimeId, seatIds })
    });
  },

  getBookingStatus(bookingId) {
    return request(`/api/v1/bookings/${bookingId}/status`);
  },

  getBookingTickets(bookingId) {
    return request(`/api/v1/bookings/${bookingId}/tickets`);
  },

  testConfirmPayment({ bookingId, txRef }) {
    return request('/api/v1/payments/test-confirm', {
      method: 'POST',
      body: JSON.stringify({ bookingId, txRef })
    });
  },

  cancelShowtime(showtimeId, reason) {
    return request(`/api/v1/showtimes/${showtimeId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  // --- Traffic Management & Waiting Room ---
  joinWaitingRoom(showtimeId) {
    return request('/api/v1/waiting-room/join', {
      method: 'POST',
      body: JSON.stringify({ showtimeId })
    });
  },

  getWaitingRoomStatus(showtimeId) {
    return request(`/api/v1/waiting-room/status?showtimeId=${encodeURIComponent(showtimeId)}`);
  },

  // --- Observability & Error Telemetry ---
  reportError({ errorName, message, stack, componentStack, path, requestId }) {
    return request('/api/v1/telemetry/errors', {
      method: 'POST',
      body: JSON.stringify({
        errorName,
        message,
        stack,
        componentStack,
        path,
        requestId,
        deviceInfo: Platform.OS
      })
    }).catch(() => null);
  },

  async logout() {
    await authStorage.clearSession();
  }
};

