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
  const response = await api.post('/api/v1/wallet/preview/', payload);
  return response.data as StudioPreviewResult;
}

/**
 * Trigger a file download from a URL.
 * Uses fetch + blob URL for Safari compatibility with binary files.
 */
export async function triggerDownload(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

/**
 * Open a Google Wallet save URL in a new tab.
 */
export function openGoogleSaveUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
