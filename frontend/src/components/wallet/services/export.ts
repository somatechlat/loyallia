/**
 * Wallet Studio export service.
 *
 * Handles preview pass generation for Apple (.pkpass) and Google (JWT save URL).
 */

import api from '@/lib/api';

export interface StudioPreviewPayload {
  platform: 'apple' | 'google';
  program_id?: string;
  studio_state?: Record<string, unknown>;
}

export interface StudioPreviewResult {
  download_url: string;
  save_url: string;
  pass_id: string;
  message: string;
}

/**
 * Generate a preview wallet pass from the current studio design.
 */
export async function generatePreviewPass(
  payload: StudioPreviewPayload
): Promise<StudioPreviewResult> {
  const response = await api.post('/wallet/preview/', payload);
  return response.data as StudioPreviewResult;
}

/**
 * Trigger a file download from a URL.
 */
export function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Open a Google Wallet save URL in a new tab.
 */
export function openGoogleSaveUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
