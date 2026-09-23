/**
 * Shared file upload utility.
 * Uploads a file using the centralized api instance (handles auth automatically).
 * Used by programs/[id], programs/new, campaigns, and settings pages.
 */
import api from './api';
import toast from 'react-hot-toast';

/** Standalone translation helper for use outside React components. */
function tStandalone(key: string): string {
  if (typeof window === 'undefined') return key;
  try {
    const { getNestedValue } = require('@/lib/i18n');
    const locale = localStorage.getItem('loyallia_lang') || 'es';
    const es = require('@/lib/i18n/locales/es.json');
    const en = require('@/lib/i18n/locales/en.json');
    const locales: Record<string, unknown> = { es, en };
    let value = getNestedValue((locales[locale] || es) as Record<string, unknown>, key);
    if (value === key && locale !== 'es') {
      value = getNestedValue(es as Record<string, unknown>, key);
    }
    return value;
  } catch {
    return key;
  }
}

export async function uploadFile(file: File, showToast = true): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  try {
    // Do NOT set Content-Type manually: axios must generate the multipart
    // boundary, otherwise the server rejects the body (HTTP 400/422).
    const { data } = await api.post('/api/v1/upload/', fd);
    if (showToast) toast.success(tStandalone('upload.success'));
    return data.url || null;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status?: number; data?: { detail?: string; error?: string } }; message?: string };
    const status = axiosErr?.response?.status;
    const detail = axiosErr?.response?.data?.detail || axiosErr?.response?.data?.error || axiosErr?.message;
    console.error('[uploadFile] Upload failed:', status, detail);
    if (showToast) toast.error(`${tStandalone('upload.error')}: ${detail || status || tStandalone('common.unknown')}`);
    return null;
  }
}
