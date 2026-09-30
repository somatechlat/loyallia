/**
 * Studio modal stack — Escape closes ONE surface (LIFO), never all at once.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  registerStudioModal,
  closeTopStudioModal,
  hasOpenStudioModal,
  resetStudioModalStack,
  bindStudioEscapeFallback,
} from '@/hooks/useModalStack';

describe('useModalStack', () => {
  beforeEach(() => {
    resetStudioModalStack();
  });

  afterEach(() => {
    resetStudioModalStack();
  });

  it('reports empty when nothing is registered', () => {
    expect(hasOpenStudioModal()).toBe(false);
    expect(closeTopStudioModal()).toBe(false);
  });

  it('closes exactly one modal per Escape, in LIFO priority order', () => {
    const closeExport = vi.fn();
    const closeGallery = vi.fn();
    const closeIcon = vi.fn();
    registerStudioModal('ide-export-modal', closeExport);
    registerStudioModal('gallery', closeGallery);
    registerStudioModal('icon-picker', closeIcon);

    // ide-export-modal is topmost in the contract order
    expect(closeTopStudioModal()).toBe(true);
    expect(closeExport).toHaveBeenCalledTimes(1);
    expect(closeGallery).not.toHaveBeenCalled();
    expect(closeIcon).not.toHaveBeenCalled();

    expect(closeTopStudioModal()).toBe(true);
    expect(closeGallery).toHaveBeenCalledTimes(1);
    expect(closeIcon).not.toHaveBeenCalled();

    expect(closeTopStudioModal()).toBe(true);
    expect(closeIcon).toHaveBeenCalledTimes(1);

    expect(closeTopStudioModal()).toBe(false);
    expect(hasOpenStudioModal()).toBe(false);
  });

  it('includes design-score in the stack so Escape can close it', () => {
    const closeScore = vi.fn();
    registerStudioModal('design-score', closeScore);
    expect(closeTopStudioModal()).toBe(true);
    expect(closeScore).toHaveBeenCalledTimes(1);
  });

  it('unregister stops the modal from closing', () => {
    const close = vi.fn();
    const unregister = registerStudioModal('gallery', close);
    unregister();
    expect(hasOpenStudioModal()).toBe(false);
    expect(closeTopStudioModal()).toBe(false);
    expect(close).not.toHaveBeenCalled();
  });

  it('multiple instances of one id close LIFO', () => {
    const first = vi.fn();
    const second = vi.fn();
    registerStudioModal('icon-picker', first);
    registerStudioModal('icon-picker', second);
    expect(closeTopStudioModal()).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it('bindStudioEscapeFallback closes a modal first, then falls back', () => {
    const fallback = vi.fn();
    const closeGallery = vi.fn();
    registerStudioModal('gallery', closeGallery);
    const unbind = bindStudioEscapeFallback(fallback);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(closeGallery).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fallback).toHaveBeenCalledTimes(1);

    unbind();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fallback).toHaveBeenCalledTimes(1);
  });
});
