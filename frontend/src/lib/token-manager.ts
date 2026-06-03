/**
 * TokenManager — Single source of truth for JWT token refresh.
 * Replaces duplicate refresh logic in auth.tsx (proactive) and api.ts (reactive).
 */
import Cookies from 'js-cookie';
import axios from 'axios';
import { APP_CONFIG } from './constants';

class TokenManager {
  private refreshPromise: Promise<string> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  /** Retrieve the current access token from cookies. */
  getAccessToken(): string | undefined {
    if (typeof window === 'undefined') return undefined;
    return Cookies.get('access_token');
  }

  /**
   * Persist both tokens in secure, same-site cookies and schedule
   * proactive refresh before expiry.
   */
  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    const isSecure = window.location.protocol === 'https:';
    Cookies.set('access_token', accessToken, { expires: 1/24, secure: isSecure, sameSite: 'strict' });
    Cookies.set('refresh_token', refreshToken, { expires: 7, secure: isSecure, sameSite: 'strict' });
    this.scheduleRefresh();
  }

  /** Remove all tokens and cancel pending refresh timers. */
  clearTokens(): void {
    if (typeof window === 'undefined') return;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    Cookies.remove('access_token');
    Cookies.remove('refresh_token');
  }

  /**
   * Attempt to refresh the access token using the refresh token.
   *
   * Deduplicates concurrent refresh calls so only one network request
   * is ever in-flight at a time.
   *
   * @returns The new access token.
   * @throws {Error} If no refresh token exists or the request fails.
   */
  async refresh(): Promise<string> {
    if (typeof window === 'undefined') return Promise.reject(new Error('SSR: cannot refresh token'));
    if (!this.refreshPromise) {
      const refresh = Cookies.get('refresh_token');
      if (!refresh) return Promise.reject(new Error('No refresh token'));

      this.refreshPromise = axios
        .post('/api/v1/auth/refresh/', { refresh_token: refresh }, { withCredentials: true })
        .then(({ data }) => {
          const isSecure = window.location.protocol === 'https:';
          Cookies.set('access_token', data.access_token, { expires: 1/24, secure: isSecure, sameSite: 'strict' });
          this.scheduleRefresh();
          return data.access_token;
        })
        .finally(() => {
          this.refreshPromise = null;
        });
    }
    return this.refreshPromise;
  }

  /**
   * Decode the current access token and schedule a proactive refresh
   * shortly before it expires.
   */
  scheduleRefresh(): void {
    if (typeof window === 'undefined') return;
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    const token = Cookies.get('access_token');
    if (!token) return;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return;
      const payloadSegment = parts[1];
      if (!payloadSegment) return;
      const payload = JSON.parse(atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/')));
      if (typeof payload.exp !== 'number') return;

      const nowSec = Math.floor(Date.now() / 1000);
      const msUntilExpiry = (payload.exp - nowSec) * 1000;
      const delay = Math.max(msUntilExpiry - APP_CONFIG.TOKEN_REFRESH_BUFFER_MS, APP_CONFIG.MIN_REFRESH_INTERVAL_MS);

      this.refreshTimer = setTimeout(() => {
        this.refresh().catch(() => {});
      }, delay);
    } catch {}
  }

  /** Cancel any pending refresh timer. Safe to call repeatedly. */
  cleanup(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export const tokenManager = new TokenManager();
