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
    const { data } = await api.post('/api/v1/upload/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
    const { data } = await api.post('/api/v1/upload/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { url: data.url || null, error: null };
  } catch (err: any) {
    const msg = err?.response?.data?.detail || err?.response?.data?.error || 'Error al subir archivo';
    return { url: null, error: msg };
  }
}
