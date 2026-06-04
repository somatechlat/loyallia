/**
 * Unit tests for ImagesTab component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ImagesTab } from '@/components/wallet/studio/ImagesTab';

// Mock the upload service
vi.mock('@/components/wallet/services/imageUpload', () => ({
  uploadWalletImage: vi.fn(),
}));

import { uploadWalletImage } from '@/components/wallet/services/imageUpload';

const mockedUploadWalletImage = vi.mocked(uploadWalletImage);

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal('Image', class MockImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 200;
    naturalHeight = 200;
    set src(value: string) {
      this._src = value;
      setTimeout(() => this.onload?.(), 0);
    }
    get src() { return this._src; }
    private _src = '';
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function createMockFile(name: string, type: string, sizeBytes: number): File {
  const blob = new Blob(['x'.repeat(sizeBytes)], { type });
  return new File([blob], name, { type });
}

function createFileList(files: File[]): FileList {
  return {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: function* () {
      for (let i = 0; i < files.length; i++) {
        yield files[i];
      }
    },
    ...files,
  } as unknown as FileList;
}

function setFilesOnInput(input: HTMLInputElement, files: File[]) {
  const fileList = createFileList(files);
  Object.defineProperty(input, 'files', {
    value: fileList,
    writable: false,
  });
  fireEvent.change(input);
}

describe('ImagesTab', () => {
  const baseProps = {
    images: {},
    onUpdateImages: vi.fn(),
  };

  it('renders all 3 upload sections', () => {
    render(<ImagesTab {...baseProps} />);
    expect(screen.getByText('Logo del programa')).toBeDefined();
    expect(screen.getByText('Imagen principal')).toBeDefined();
    expect(screen.getByText('Icono')).toBeDefined();
  });

  it('shows image count starting at 0', () => {
    render(<ImagesTab {...baseProps} />);
    expect(screen.getByText('0/5')).toBeDefined();
  });

  it('shows correct image count when images are present', () => {
    render(
      <ImagesTab
        images={{
          logo: { url: 'https://example.com/logo.png', width: 160, height: 160 },
          strip: { url: 'https://example.com/strip.png', width: 1125, height: 432 },
        }}
        onUpdateImages={baseProps.onUpdateImages}
      />
    );
    expect(screen.getByText('2/5')).toBeDefined();
  });

  it('calls onUpdateImages when logo uploaded', async () => {
    const onUpdateImages = vi.fn();
    mockedUploadWalletImage.mockResolvedValueOnce({
      url: 'https://cdn.example.com/logo.png',
      width: 160,
      height: 160,
    });

    render(<ImagesTab images={{}} onUpdateImages={onUpdateImages} />);

    const file = createMockFile('logo.png', 'image/png', 1024);
    // There are 3 file inputs; the first is for Logo
    const inputs = document.querySelectorAll('input[type="file"]');
    setFilesOnInput(inputs[0] as HTMLInputElement, [file]);

    await waitFor(() => {
      expect(mockedUploadWalletImage).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onUpdateImages).toHaveBeenCalledWith({
        logo: { url: 'https://cdn.example.com/logo.png', width: 160, height: 160 },
      });
    });
  });

  it('calls onUpdateImages when hero uploaded', async () => {
    const onUpdateImages = vi.fn();
    mockedUploadWalletImage.mockResolvedValueOnce({
      url: 'https://cdn.example.com/hero.png',
      width: 1125,
      height: 432,
    });

    render(<ImagesTab images={{}} onUpdateImages={onUpdateImages} />);

    const file = createMockFile('hero.png', 'image/png', 1024);
    const inputs = document.querySelectorAll('input[type="file"]');
    setFilesOnInput(inputs[1] as HTMLInputElement, [file]);

    await waitFor(() => {
      expect(mockedUploadWalletImage).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onUpdateImages).toHaveBeenCalledWith({
        strip: { url: 'https://cdn.example.com/hero.png', width: 1125, height: 432 },
        heroImage: { url: 'https://cdn.example.com/hero.png', width: 1125, height: 432 },
      });
    });
  });

  it('calls onUpdateImages when icon uploaded', async () => {
    const onUpdateImages = vi.fn();
    mockedUploadWalletImage.mockResolvedValueOnce({
      url: 'https://cdn.example.com/icon.png',
      width: 90,
      height: 90,
    });

    render(<ImagesTab images={{}} onUpdateImages={onUpdateImages} />);

    const file = createMockFile('icon.png', 'image/png', 1024);
    const inputs = document.querySelectorAll('input[type="file"]');
    setFilesOnInput(inputs[2] as HTMLInputElement, [file]);

    await waitFor(() => {
      expect(mockedUploadWalletImage).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onUpdateImages).toHaveBeenCalledWith({
        icon: { url: 'https://cdn.example.com/icon.png', width: 90, height: 90 },
      });
    });
  });

  it('renders platform tips section', () => {
    render(<ImagesTab {...baseProps} />);
    expect(screen.getByText('Recomendaciones por plataforma')).toBeDefined();
    expect(screen.getByText('Apple Wallet')).toBeDefined();
    expect(screen.getByText('Google Wallet')).toBeDefined();
  });
});
