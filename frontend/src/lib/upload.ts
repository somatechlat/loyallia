/**
 * Shared file upload utility.
 * Uploads a file using the centralized api instance (handles auth automatically).
 * Used by programs/[id], programs/new, campaigns, and settings pages.
 */
import api from './api';
import toast from 'react-hot-toast';

export async function uploadFile(file: File, showToast = true): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  try {
    // Do NOT set Content-Type manually: axios must generate the multipart
    // boundary, otherwise the server rejects the body (HTTP 400/422).
    const { data } = await api.post('/api/v1/upload/', fd);
    if (showToast) toast.success('Archivo subido');
    return data.url || null;
  } catch {
    if (showToast) toast.error('Error al subir archivo');
    return null;
  }
}

export async function uploadFileWithError(file: File): Promise<{ url: string | null; error: string | null }> {
  const fd = new FormData();
  fd.append('file', file);
  try {
    // No manual Content-Type -> let axios set multipart boundary.
    const { data } = await api.post('/api/v1/upload/', fd);
    return { url: data.url || null, error: null };
  } catch (err: any) {
    const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Error al subir archivo';
    return { url: null, error: msg };
  }
}
