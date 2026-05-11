import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { tokenManager } from './token-manager';

/* ── LYL-M-FE-033: Retry with exponential backoff ────────────────────── */
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function getRetryDelay(attempt: number, retryAfter?: string | number): number {
  if (retryAfter) {
    const seconds = typeof retryAfter === 'number' ? retryAfter : parseInt(String(retryAfter), 10);
    if (!isNaN(seconds) && seconds > 0) return seconds * 1000;
  }
  return BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
}

/* ── LYL-M-FE-034: Offline detection ─────────────────────────────────── */
let _isOffline = false;
export function isOffline(): boolean {
  return _isOffline;
}

if (typeof window !== 'undefined') {
  _isOffline = !navigator.onLine;
  window.addEventListener('online', () => {
    _isOffline = false;
    window.dispatchEvent(new CustomEvent('loyallia-online'));
  });
  window.addEventListener('offline', () => {
    _isOffline = true;
    window.dispatchEvent(new CustomEvent('loyallia-offline'));
  });
}

const api = axios.create({
  // LYL-H-FE-007: Use environment variable, no hardcoded fallback
  baseURL: typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || ''),
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

// Attach JWT access token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, attempt refresh — if refresh fails, clear tokens and redirect to login
// LYL-M-FE-033: On retryable errors, retry with exponential backoff
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError & { config: AxiosRequestConfig & { _retryCount?: number; _retry?: boolean } }) => {
    const original = error.config;

    // 401 → try token refresh (existing logic)
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const token = await tokenManager.refresh();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        tokenManager.clearTokens();
        window.location.replace('/login'); // SEC-004 fix: use replace to avoid referrer leak
      }
    }

    // LYL-M-FE-033: Retry on retryable errors
    const retryCount = original._retryCount ?? 0;
    const status = error.response?.status;
    if (status && RETRYABLE_STATUS.has(status) && retryCount < MAX_RETRIES) {
      original._retryCount = retryCount + 1;
      const delay = getRetryDelay(retryCount, error.response?.headers?.['retry-after']);
      await new Promise(r => setTimeout(r, delay));
      return api(original);
    }

    return Promise.reject(error);
  }
);

// AbortController support for request cancellation
const globalController = new AbortController();

/** Abort all in-flight requests that used the global signal. */
export const cancelAllRequests = () => {
  globalController.abort();
};

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
  phoneVerifyStart: (phone: string, channel: string = 'sms') =>
    api.post('/api/v1/auth/verify-phone/start/', { phone, channel }),
  phoneVerifyCheck: (phone: string, code: string, sid: string = '') =>
    api.post('/api/v1/auth/verify-phone/check/', { phone, code, sid }),
};

export const analyticsApi = {
  dashboard: (days = 30) => api.get(`/api/v1/analytics/overview/?days=${days}`),
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
  exportCsvUrl: () => '/api/v1/customers/export/',
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
  // Campaign Analytics (LYL-SRS-006)
  campaignRuns: () => api.get('/api/v1/notifications/campaigns/runs/'),
  campaignResults: (runId: string) => api.get(`/api/v1/notifications/campaigns/${runId}/results/`),
  campaignRecipients: (runId: string, params?: { status?: string; page?: number }) =>
    api.get(`/api/v1/notifications/campaigns/${runId}/recipients/`, { params }),
  campaignExportUrl: (runId: string) => `/api/v1/notifications/campaigns/${runId}/export/`,
};

export const whatsappApi = {
  qr: (tenantId: string) => api.get(`/api/v1/whatsapp/qr/${tenantId}/`),
  status: (tenantId: string) => api.get(`/api/v1/whatsapp/status/${tenantId}/`),
  disconnect: (tenantId: string) => api.post(`/api/v1/whatsapp/disconnect/${tenantId}/`),
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

export const superAdminApi = {
  plans: () => api.get('/api/v1/admin/plans/'),
  createPlan: (data: Record<string, unknown>) => api.post('/api/v1/admin/plans/', data),
  updatePlan: (id: string, data: Record<string, unknown>) => api.patch(`/api/v1/admin/plans/${id}/`, data),
  deactivatePlan: (id: string) => api.delete(`/api/v1/admin/plans/${id}/`),
  metrics: () => api.get('/api/v1/admin/platform/metrics/'),
  integrations: () => api.get('/api/v1/admin/platform/integrations/'),
  locations: () => api.get('/api/v1/admin/platform/locations/'),
  broadcast: (data: { subject: string; message: string }) => api.post('/api/v1/admin/broadcast/', data),
  updateIntegrationSecret: (integrationKey: string, key: string, value: string) =>
    api.put(`/api/v1/admin/platform/integrations/${integrationKey}/secret/`, { key, value }),
  // SysAdmin Operations (LYL-BOOT-001)
  seedDemoData: () =>
    api.post('/api/v1/admin/platform/seed-demo-data/'),
  factoryResetRequest: () =>
    api.post('/api/v1/admin/platform/factory-reset/request/'),
  factoryResetConfirm: (otp: string) =>
    api.post('/api/v1/admin/platform/factory-reset/confirm/', { otp }),
};

export const transactionsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/v1/transactions/', { params }),
  get: (id: string) => api.get(`/api/v1/transactions/${id}/`),
};
