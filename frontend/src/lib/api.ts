/**
 * Loyallia API client layer.
 *
 * Configures an Axios instance with:
 *  - Automatic JWT Bearer token injection
 *  - Token refresh on 401 responses
 *  - Exponential-backoff retry for transient HTTP errors
 *  - Offline detection helpers
 *
 * @module api
 */

import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { tokenManager } from './token-manager';

/** Maximum number of retries for transient failures. */
const MAX_RETRIES = 3;
/** Base delay in milliseconds for exponential backoff. */
const BASE_DELAY_MS = 1000;
/** HTTP status codes that trigger an automatic retry. */
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

/**
 * Compute the delay before the next retry attempt.
 *
 * @param attempt - Zero-based retry attempt number.
 * @param retryAfter - Optional `Retry-After` header value (seconds or string).
 * @returns Delay in milliseconds.
 */
function getRetryDelay(attempt: number, retryAfter?: string | number): number {
  if (retryAfter) {
    const seconds = typeof retryAfter === 'number' ? retryAfter : parseInt(String(retryAfter), 10);
    if (!isNaN(seconds) && seconds > 0) return seconds * 1000;
  }
  return BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
}

/** Internal offline state updated by browser `online`/`offline` events. */
let _isOffline = false;

/**
 * Returns the current offline state.
 *
 * @returns `true` if the browser reports it is offline.
 */
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
  baseURL: typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || ''),
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

/** In-flight request deduplication cache — maps request keys to active promises. */
const inflight = new Map<string, Promise<unknown>>();

/** Generate a deduplication key from request config. */
function getRequestKey(config: AxiosRequestConfig): string {
  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';
  const params = config.params ? JSON.stringify(config.params) : '';
  const data = config.data ? JSON.stringify(config.data) : '';
  return `${method}:${url}:${params}:${data}`;
}

/** Deduplicate identical in-flight GET requests to prevent redundant network calls. */
const _originalGet = api.get.bind(api);
api.get = function getDeduped<T = unknown, R = import('axios').AxiosResponse<T>, D = unknown>(
  url: string,
  config?: import('axios').AxiosRequestConfig<D>
): Promise<R> {
  const key = getRequestKey({ method: 'get', url, ...config });
  const existing = inflight.get(key);
  if (existing) {
    return existing as Promise<R>;
  }
  const promise = _originalGet<T, R, D>(url, config).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, promise);
  return promise;
};

/**
 * Recursively trim all string values in an object.
 */
function deepTrim<T>(value: T): T {
  if (typeof value === 'string') return value.trim() as unknown as T;
  if (Array.isArray(value)) return value.map(deepTrim) as unknown as T;
  if (value && typeof value === 'object') {
    const trimmed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      trimmed[k] = deepTrim(v);
    }
    return trimmed as unknown as T;
  }
  return value;
}

// Attach JWT access token to every request and sanitize data
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Trim all string inputs before sending to API
  if (config.data && typeof config.data === 'object') {
    config.data = deepTrim(config.data);
  }
  return config;
});

// On 401, attempt refresh — if refresh fails, clear tokens and redirect to login.
// On retryable errors, retry with exponential backoff.
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

    // Retry on retryable errors
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

/** Per-request AbortControllers tracked for cleanup. */
const activeControllers = new Set<AbortController>();

/** Create a new AbortController and track it. */
export function createRequestSignal(): AbortSignal {
  const ctrl = new AbortController();
  activeControllers.add(ctrl);
  return ctrl.signal;
}

/** Abort all tracked in-flight requests and clear the set. */
export const cancelAllRequests = () => {
  activeControllers.forEach((ctrl) => {
    try { ctrl.abort(); } catch { /* ignore */ }
  });
  activeControllers.clear();
};

export default api;

// ── Typed API helpers ───────────────────────────────────────────────

/** Authentication endpoints. */
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/v1/auth/login/', { email, password }),
  register: (data: Record<string, unknown>) =>
    api.post('/api/v1/auth/register/', data),
  logout: () => api.post('/api/v1/auth/logout/'),
  me: () => api.get('/api/v1/auth/users/me/'),
  updateProfile: (data: { first_name?: string; last_name?: string }) =>
    api.put('/api/v1/auth/users/profile/', data),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/api/v1/auth/users/change-password/', data),
  googleConfig: () => api.get('/api/v1/auth/google/config/'),
  googleLogin: (credential: string, business_name?: string, is_login_only: boolean = false) =>
    api.post('/api/v1/auth/google/login/', { credential, business_name: business_name || '', is_login_only }),
  phoneVerifyStart: (phone: string, channel: string = 'sms') =>
    api.post('/api/v1/auth/verify-phone/start/', { phone, channel }),
  phoneVerifyCheck: (phone: string, code: string, sid: string = '') =>
    api.post('/api/v1/auth/verify-phone/check/', { phone, code, sid }),
};

/** Analytics & reporting endpoints. */
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

/** Customer CRUD, import/export, and segmentation endpoints. */
export const customersApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/v1/customers/', { params }),
  get: (id: string) => api.get(`/api/v1/customers/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/api/v1/customers/', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/api/v1/customers/${id}/`, data),
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

/** Loyalty program management endpoints. */
export const programsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/v1/programs/', { params }),
  get: (id: string) => api.get(`/api/v1/programs/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/api/v1/programs/', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/api/v1/programs/${id}/`, data),
  suspend: (id: string) => api.post(`/api/v1/programs/${id}/suspend/`),
  publish: (id: string) => api.post(`/api/v1/programs/${id}/publish/`),
  delete: (id: string) => api.delete(`/api/v1/programs/${id}/`),
  stats: (id: string) => api.get(`/api/v1/programs/${id}/stats/`),
  memberCount: (id: string) => api.get(`/api/v1/programs/${id}/member-count/`),
  members: (id: string, params?: { search?: string; limit?: number; offset?: number }) =>
    api.get(`/api/v1/programs/${id}/members/`, { params }),
  transactions: (id: string, params?: { limit?: number; offset?: number }) =>
    api.get(`/api/v1/programs/${id}/transactions/`, { params }),
};

/** Notification campaign management endpoints. */
export const notificationsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/v1/notifications/', { params }),
  campaigns: (params?: Record<string, unknown>) => api.get('/api/v1/notifications/campaigns/', { params }),
  createCampaign: (data: Record<string, unknown>) => api.post('/api/v1/notifications/campaigns/', data),
  stats: () => api.get('/api/v1/notifications/stats/'),
  campaignRuns: () => api.get('/api/v1/notifications/campaigns/runs/'),
  campaignResults: (runId: string) => api.get(`/api/v1/notifications/campaigns/${runId}/results/`),
  campaignRecipients: (runId: string, params?: { status?: string; page?: number }) =>
    api.get(`/api/v1/notifications/campaigns/${runId}/recipients/`, { params }),
  campaignExportUrl: (runId: string) => `/api/v1/notifications/campaigns/${runId}/export/`,
};

/** WhatsApp Bridge QR and status endpoints. */
export const whatsappApi = {
  qr: (tenantId: string) => api.get(`/api/v1/whatsapp/qr/${tenantId}/`),
  status: (tenantId: string) => api.get(`/api/v1/whatsapp/status/${tenantId}/`),
  disconnect: (tenantId: string) => api.post(`/api/v1/whatsapp/disconnect/${tenantId}/`),
};

/** Automation rule CRUD and execution endpoints. */
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

/** Billing, subscription, and invoice endpoints. */
export const billingApi = {
  plans: () => api.get('/api/v1/billing/plans/'),
  subscription: () => api.get('/api/v1/billing/subscription/'),
  usage: () => api.get('/api/v1/billing/usage/'),
  invoices: () => api.get('/api/v1/billing/invoices/'),
};

/** Super-admin platform management endpoints. */
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
  seedDemoData: () =>
    api.post('/api/v1/admin/platform/seed-demo-data/'),
  factoryResetRequest: () =>
    api.post('/api/v1/admin/platform/factory-reset/request/'),
  factoryResetConfirm: (otp: string) =>
    api.post('/api/v1/admin/platform/factory-reset/confirm/', { otp }),
  getPlatformMode: () => api.get('/api/v1/admin/platform/mode/'),
  togglePlatformMode: (mode: 'development' | 'production') =>
    api.post('/api/v1/admin/platform/mode/toggle/', { mode }),
};

/** Transaction history endpoints. */
export const transactionsApi = {
  list: (params?: Record<string, unknown>) => api.get('/api/v1/transactions/', { params }),
  get: (id: string) => api.get(`/api/v1/transactions/${id}/`),
};

/** Media asset management endpoints. */
export const mediaApi = {
  listAssets: () => api.get<{ success: boolean; assets: Array<{ url: string; name: string; size: number; last_modified: string }>; count: number }>('/api/v1/upload/assets/'),
};

/** Notification campaign creation endpoints. */
export const campaignsApi = {
  create: (data: Record<string, unknown>) => api.post('/api/v1/notifications/campaigns/', data),
};

/** AI assistant endpoints for Wallet Pass Studio. */
export const aiApi = {
  generateTemplate: (data: {
    description: string;
    card_type: string;
    industry: string;
    language?: string;
  }) => api.post('/api/v1/ai/generate-template/', data),
  suggestColors: (data: {
    description: string;
    industry: string;
  }) => api.post('/api/v1/ai/suggest-colors/', data),
  critiqueDesign: (data: {
    design_data: Record<string, unknown>;
  }) => api.post('/api/v1/ai/critique-design/', data),
  suggestStampIcons: (data: {
    business_type: string;
  }) => api.post('/api/v1/ai/suggest-stamp-icons/', data),
  suggestLayout: (data: {
    design_data: Record<string, unknown>;
    card_type: string;
  }) => api.post('/api/v1/ai/suggest-layout/', data),
};

/** Wallet template endpoints for Wallet Pass Studio. */
export const walletTemplatesApi = {
  list: () => api.get<Array<Record<string, unknown>>>('/api/v1/wallet/templates/'),
  create: (data: {
    name: string;
    description?: string;
    card_type: string;
    industry?: string;
    design_state: Record<string, unknown>;
    include_back_content?: boolean;
    tags?: string[];
  }) => api.post<Record<string, unknown>>('/api/v1/wallet/templates/', data),
  get: (id: string) => api.get<Record<string, unknown>>(`/api/v1/wallet/templates/${id}/`),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<Record<string, unknown>>(`/api/v1/wallet/templates/${id}/`, data),
  delete: (id: string) => api.delete(`/api/v1/wallet/templates/${id}/`),
  use: (id: string) => api.post<Record<string, unknown>>(`/api/v1/wallet/templates/${id}/use/`),
};

/** Scanner validation and transaction endpoints. */
export const scannerApi = {
  validate: (qr_code: string) =>
    api.post('/api/v1/scanner/validate/', { qr_code }),
  transact: (data: {
    qr_code: string;
    amount: number;
    notes: string;
    idempotency_key: string;
  }) => api.post('/api/v1/scanner/transact/', data),
};
