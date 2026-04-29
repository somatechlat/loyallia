/**
 * TokenManager — Single source of truth for JWT token refresh.
 * Replaces duplicate refresh logic in auth.tsx (proactive) and api.ts (reactive).
 */
import Cookies from 'js-cookie';
import axios from 'axios';

class TokenManager {
  private refreshPromise: Promise<string> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly REFRESH_BUFFER_MS = 5 * 60 * 1000;
  private static readonly MIN_REFRESH_MS = 30 * 1000;

  getAccessToken(): string | undefined {
    return Cookies.get('access_token');
  }

  setTokens(accessToken: string, refreshToken: string): void {
    const isProd = process.env.NODE_ENV === 'production';
    Cookies.set('access_token', accessToken, { expires: 1/24, secure: isProd, sameSite: 'strict' });
    Cookies.set('refresh_token', refreshToken, { expires: 7, secure: isProd, sameSite: 'strict' });
    this.scheduleRefresh();
  }

  clearTokens(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
  }

  async refresh(): Promise<string> {
    if (!this.refreshPromise) {
      const refresh = Cookies.get('refresh_token');
      if (!refresh) return Promise.reject(new Error('No refresh token'));

      this.refreshPromise = axios
        .post('/api/v1/auth/refresh/', { refresh_token: refresh }, { withCredentials: true })
        .then(({ data }) => {
          const isProd = process.env.NODE_ENV === 'production';
          Cookies.set('access_token', data.access_token, { expires: 1/24, secure: isProd, sameSite: 'strict' });
          this.scheduleRefresh();
          return data.access_token;
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  scheduleRefresh(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const token = Cookies.get('access_token');
    if (!token) return;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return;
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof payload.exp !== 'number') return;

      const nowSec = Math.floor(Date.now() / 1000);
      const msUntilExpiry = (payload.exp - nowSec) * 1000;
      const delay = Math.max(msUntilExpiry - TokenManager.REFRESH_BUFFER_MS, TokenManager.MIN_REFRESH_MS);

      this.refreshTimer = setTimeout(() => {
        this.refresh().catch(() => {});
      }, delay);
    } catch {}
  }

  cleanup(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const tokenManager = new TokenManager();
