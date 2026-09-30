/**
 * Non-destructive crop/transform styles for ImageAsset previews.
 *
 * Mirrors the semantics of ImageCropEditor: CSS transform + transform-origin
 * on the image (or its wrapper), never baked into pixels.
 */

import type { CSSProperties } from 'react';
import type { ImageAsset } from '@/components/wallet/types/unified-state';

export type ImageCrop = NonNullable<ImageAsset['crop']>;

const DEFAULT_CROP: ImageCrop = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  rotate: 0,
  flipH: false,
  flipV: false,
};

/**
 * Map an ImageAsset crop to CSS transform styles.
 * Empty object when there is no crop (render stays plain object-cover).
 */
export function applyCropStyle(asset?: ImageAsset | { crop?: ImageCrop }): CSSProperties {
  const crop = asset?.crop;
  if (!crop) return {};

  const {
    zoom = DEFAULT_CROP.zoom,
    offsetX = DEFAULT_CROP.offsetX,
    offsetY = DEFAULT_CROP.offsetY,
    rotate = DEFAULT_CROP.rotate,
    flipH = DEFAULT_CROP.flipH,
    flipV = DEFAULT_CROP.flipV,
  } = crop;

  const scaleX = zoom * (flipH ? -1 : 1);
  const scaleY = zoom * (flipV ? -1 : 1);

  return {
    transform: `translate(${offsetX}px, ${offsetY}px) scale(${scaleX}, ${scaleY}) rotate(${rotate}deg)`,
    transformOrigin: 'center center',
  };
}

/**
 * Same as applyCropStyle but takes the crop object directly.
 */
export function cropToStyle(crop?: ImageCrop): CSSProperties {
  return applyCropStyle(crop ? { crop } : undefined);
}
