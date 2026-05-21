/**
 * Strip hardcoded local MinIO URLs (localhost:33903 / 127.0.0.1:33903)
 * so they resolve as relative paths from any origin.
 */
export function stripLocalMinioUrl(url: string | undefined): string {
  if (typeof url !== 'string') return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return '';
  if (url.includes('://localhost:33903/') || url.includes('://127.0.0.1:33903/')) {
    return url.replace(/^https?:\/\/[^/]+:33903/, '');
  }
  return url;
}
