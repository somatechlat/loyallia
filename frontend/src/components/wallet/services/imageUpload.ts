/**
 * Wallet-specific image upload service.
 *
 * Wraps the generic uploadFile utility with wallet-specific metadata
 * and ImageAsset typing.
 */

import { uploadFile } from '@/lib/upload';
import type { ImageAsset } from '@/components/wallet/types/unified-state';

/**
 * Upload a wallet image to the backend.
 *
 * @param file - The image file to upload
 * @param type - The type of wallet image (logo, hero, icon)
 * @returns ImageAsset with url, width, height (dimensions estimated from file)
 */
export async function uploadWalletImage(
  file: File,
  _type: 'logo' | 'hero' | 'icon'
): Promise<ImageAsset> {
  const url = await uploadFile(file, false);
  if (!url) {
    throw new Error('Error al subir la imagen');
  }

  // Attempt to read actual dimensions from the image
  const dimensions = await getImageDimensions(file);

  return {
    url,
    width: dimensions.width,
    height: dimensions.height,
  };
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (file.type === 'image/svg+xml') {
      // SVGs don't have intrinsic dimensions in a reliable way without parsing
      resolve({ width: 0, height: 0 });
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 0, height: 0 });
    };

    img.src = objectUrl;
  });
}
