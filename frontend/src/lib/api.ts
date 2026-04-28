import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:33905'),
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// SEC-001 fix: Shared refresh lock prevents concurrent refresh requests
let refreshPromise: Promise<string> | null = null;

function doRefresh(): Promise<string> {
  if (!refreshPromise) {
    const refresh = Cookies.get('refresh_token');
    if (!refresh) {
      return Promise.reject(new Error('No refresh token'));
    }
    refreshPromise = axios
      .post('/api/v1/auth/refresh/', { refresh_token: refresh }, { withCredentials: true })
      .then(({ data }) => {
        const isProd = process.env.NODE_ENV === 'production';
        Cookies.set('access_token', data.access_token, { expires: 1 / 24, secure: isProd, sameSite: 'strict' });
        return data.access_token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// On 401, attempt refresh — if refresh fails, clear tokens and redirect to login
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const token = await doRefresh();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        window.location.replace('/login'); // SEC-004 fix: use replace to avoid referrer leak
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Typed API helpers
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/v1/auth/login/', { email, password }),
  register: (data: Record<string, unknown>) =>
    api.post('/api/v1/auth/register/', data),
  logout: () => api.post('/api/v1/auth/logout/'),
  me: () => api.get('/api/v1/auth/me/'),
  updateProfile: (data: { first_name?: string; last_name?: string }) =>
    api.put('/api/v1/auth/profile/', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/api/v1/auth/change-password/', data),
  googleConfig: () => api.get('/api/v1/auth/google/config/'),
  googleLogin: (credential: string, business_name?: string, is_login_only: boolean = false) =>
    api.post('/api/v1/auth/google/login/', { credential, business_name: business_name || '', is_login_only }),
  phoneVerifyRequest: (phone_number: string) =>
    api.post('/api/v1/auth/phone/verify/request/', { phone_number }),
  phoneVerifyConfirm: (phone_number: string, otp: string) =>
    api.post('/api/v1/auth/phone/verify/confirm/', { phone_number, otp }),
};

export const analyticsApi = {
  dashboard: () => api.get('/api/v1/analytics/overview/'),
  trends: (days = 30) => api.get(`/api/v1/analytics/trends/?days=${days}`),
  segments: () => api.get('/api/v1/analytics/segments/'),
  programs: () => api.get('/api/v1/analytics/programs/'),
  revenueBreakdown: (days = 30) => api.get(`/api/v1/analytics/revenue-breakdown/?days=${days}`),
  visits: (days = 30) => api.get(`/api/v1/analytics/visits/?days=${days}`),
  topBuyers: (limit = 15, days = 30) => api.get(`/api/v1/analytics/top-buyers/?limit=${limit}&days=${days}`),
  notifyTopBuyers: () => api.post('/api/v1/analytics/notify-top-buyers/'),
  demographics: () => api.get('/api/v1/analytics/demographics/'),
  byProgramType: (days = 30) => api.get(`/api/v1/analytics/by-program-type/?days=${days}`),
};

export const customersApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/v1/customers/', { params }),
  get: (id: string) => api.get(`/api/v1/customers/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/api/v1/customers/', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/v1/customers/${id}/`, data),
  delete: (id: string) => api.delete(`/api/v1/customers/${id}/`),
  importCsv: (formData: FormData) => api.post('/api/v1/customers/import/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  passes: (id: string) => api.get(`/api/v1/customers/${id}/passes/`),
  enroll: (id: string, cardId: string) =>
    api.post(`/api/v1/customers/${id}/enroll/?card_id=${cardId}`),
  segments: () => api.get('/api/v1/analytics/segments/'),
  segmentMembers: (segId: string, params?: Record<string, unknown>) =>
    api.get(`/api/v1/customers/segments/${segId}/members/`, { params }),
};

export const programsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/v1/programs/', { params }),
  get: (id: string) => api.get(`/api/v1/programs/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/api/v1/programs/', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/api/v1/programs/${id}/`, data),
  suspend: (id: string) => api.post(`/api/v1/programs/${id}/suspend/`),
  delete: (id: string) => api.delete(`/api/v1/programs/${id}/`),
  stats: (id: string) => api.get(`/api/v1/programs/${id}/stats/`),
};

export const notificationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/v1/notifications/', { params }),
  campaigns: (params?: Record<string, unknown>) => api.get('/api/v1/notifications/campaigns/', { params }),
  createCampaign: (data: Record<string, unknown>) => api.post('/api/v1/notifications/campaigns/', data),
  stats: () => api.get('/api/v1/notifications/stats/'),
};

export const automationApi = {
  list: () => api.get('/api/v1/automation/'),
  get: (id: string) => api.get(`/api/v1/automation/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/api/v1/automation/', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/v1/automation/${id}/`, data),
  delete: (id: string) => api.delete(`/api/v1/automation/${id}/`),
  toggle: (id: string) => api.post(`/api/v1/automation/${id}/toggle/`),
  execute: (id: string, customerId: string) => api.post(`/api/v1/automation/${id}/execute/?customer_id=${customerId}`),
  stats: () => api.get('/api/v1/automation/stats/'),
};

export const billingApi = {
  plans: () => api.get('/api/v1/billing/plans/'),
  subscription: () => api.get('/api/v1/billing/subscription/'),
  usage: () => api.get('/api/v1/billing/usage/'),
  invoices: () => api.get('/api/v1/billing/invoices/'),
};

export const transactionsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/v1/transactions/', { params }),
  get: (id: string) => api.get(`/api/v1/transactions/${id}/`),
};
