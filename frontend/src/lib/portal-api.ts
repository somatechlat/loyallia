import axios, { type AxiosError } from 'axios';
import Cookies from 'js-cookie';

const portalApi = axios.create({
  baseURL: typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || ''),
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

portalApi.interceptors.request.use((config) => {
  const token = Cookies.get('portal_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

portalApi.interceptors.response.use(
  (res) => res,
  async (error: AxiosError & { config: { _retry?: boolean } }) => {
    if (error.response?.status === 401 && !error.config._retry) {
      Cookies.remove('portal_token');
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/portal/login')) {
        window.location.replace('/portal/login');
      }
    }
    return Promise.reject(error);
  }
);

export default portalApi;

export const portalApiClient = {
  generatePassword: (email: string) =>
    portalApi.post('/api/v1/portal/generate-password/', { email }),
  login: (email: string, password: string) =>
    portalApi.post('/api/v1/portal/login/', { email, password }),
  passes: () =>
    portalApi.get('/api/v1/portal/passes/'),
  disenroll: (passId: string) =>
    portalApi.delete(`/api/v1/portal/passes/${passId}/`),
  exportData: () =>
    portalApi.get('/api/v1/portal/export-data/'),
  deleteData: (password: string) =>
    portalApi.post('/api/v1/portal/delete-data/', { password }),
  deleteAccount: (password: string, confirmationPhrase: string) =>
    portalApi.post('/api/v1/portal/delete-account/', { password, confirmation_phrase: confirmationPhrase }),
};
