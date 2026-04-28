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
