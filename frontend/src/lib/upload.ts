/**
 * Shared file upload utility.
 * Uploads a file to /api/v1/upload/ with JWT auth.
 * Used by programs/[id], programs/new, campaigns, and settings pages.
 */
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';

export async function uploadFile(file: File, showToast = true): Promise<string | null> {
  const token = Cookies.get('access_token');
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch('/api/v1/upload/', {
      method: 'POST',
      body: fd,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      if (showToast) toast.success('Archivo subido');
      return data.url || null;
    }
    if (showToast) toast.error('Error al subir archivo');
    return null;
  } catch {
    if (showToast) toast.error('Error de conexión al subir archivo');
    return null;
  }
}
