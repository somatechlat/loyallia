export const COOKIE_CONFIG = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  ACCESS_TOKEN_EXPIRY: 1/24, // 1 hour
  REFRESH_TOKEN_EXPIRY: 7, // 7 days
  SAME_SITE: 'strict' as const,
} as const;

export const API_CONFIG = {
  BASE_URL: typeof window !== 'undefined' ? '' : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:33905'),
  TIMEOUT: 30000,
} as const;
