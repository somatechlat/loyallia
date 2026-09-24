/**
 * Unit tests for ImageCropEditor — zoom, move, flip, rotate, reset.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { ImageCropEditor, type CropState } from '@/components/wallet/studio/ImageCropEditor';

function renderEditor(props: Partial<React.ComponentProps<typeof ImageCropEditor>> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <I18nProvider>
      <ImageCropEditor imageUrl="https://example.com/a.png" onChange={onChange} {...props} />
    </I18nProvider>
  );
  return { onChange, ...utils };
}

function lastCrop(onChange: ReturnType<typeof vi.fn>): CropState {
  return onChange.mock.calls[onChange.mock.calls.length - 1]![0] as CropState;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ImageCropEditor', () => {
  it('renders every crop control', () => {
    renderEditor();
    for (const id of [
      'crop-preview',
      'crop-zoom-in',
      'crop-zoom-out',
      'crop-move-left',
      'crop-move-right',
      'crop-move-up',
      'crop-move-down',
      'crop-flip-h',
      'crop-flip-v',
      'crop-rotate-cw',
      'crop-rotate-ccw',
      'crop-reset',
    ]) {
      expect(screen.getByTestId(id)).toBeDefined();
    }
  });

  it('zooms in and out by 10% steps', () => {
    const { onChange } = renderEditor();
    fireEvent.click(screen.getByTestId('crop-zoom-in'));
    expect(lastCrop(onChange).zoom).toBeCloseTo(1.1);
    fireEvent.click(screen.getByTestId('crop-zoom-out'));
    expect(lastCrop(onChange).zoom).toBeCloseTo(1);
  });

  it('does not zoom past 300%', () => {
    const { onChange } = renderEditor({ initialState: { zoom: 3 } });
    fireEvent.click(screen.getByTestId('crop-zoom-in'));
    expect(lastCrop(onChange).zoom).toBe(3);
  });

  it('does not zoom below 50%', () => {
    const { onChange } = renderEditor({ initialState: { zoom: 0.5 } });
    fireEvent.click(screen.getByTestId('crop-zoom-out'));
    expect(lastCrop(onChange).zoom).toBe(0.5);
  });

  it('moves the crop offset by 10px steps', () => {
    const { onChange } = renderEditor();
    fireEvent.click(screen.getByTestId('crop-move-right'));
    expect(lastCrop(onChange)).toMatchObject({ offsetX: 10, offsetY: 0 });
    fireEvent.click(screen.getByTestId('crop-move-down'));
    expect(lastCrop(onChange)).toMatchObject({ offsetX: 10, offsetY: 10 });
  });

  it('toggles flips and rotates by 90 degrees', () => {
    const { onChange } = renderEditor();
    fireEvent.click(screen.getByTestId('crop-flip-h'));
    expect(lastCrop(onChange).flipH).toBe(true);
    fireEvent.click(screen.getByTestId('crop-rotate-cw'));
    expect(lastCrop(onChange).rotate).toBe(90);
    fireEvent.click(screen.getByTestId('crop-rotate-ccw'));
    expect(lastCrop(onChange).rotate).toBe(0);
  });

  it('resets to defaults', () => {
    const onChange = vi.fn();
    renderEditor({ onChange, initialState: { zoom: 2, offsetX: 40, flipH: true, rotate: 90 } });
    fireEvent.click(screen.getByTestId('crop-reset'));
    expect(lastCrop(onChange)).toEqual({
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      rotate: 0,
      flipH: false,
      flipV: false,
    });
  });
});
