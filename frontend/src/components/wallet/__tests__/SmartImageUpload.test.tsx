/**
 * Unit tests for SmartImageUpload component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { SmartImageUpload } from '@/components/wallet/studio/SmartImageUpload';

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

function createMockFile(
  name: string,
  type: string,
  sizeBytes: number
): File {
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

describe('SmartImageUpload', () => {
  const baseProps = {
    label: 'Test Image',
    recommendedSize: { width: 100, height: 100 },
    applePreviewShape: 'circle' as const,
    googlePreviewShape: 'rect' as const,
    onChange: vi.fn(),
  };

  it('renders upload zone when no image', () => {
    render(<SmartImageUpload {...baseProps} />);
    expect(screen.getByText('Test Image')).toBeDefined();
    expect(screen.getByText('Haz click o arrastra una imagen')).toBeDefined();
  });

  it('shows description when provided', () => {
    render(<SmartImageUpload {...baseProps} description="A helpful description" />);
    expect(screen.getByText('A helpful description')).toBeDefined();
  });

  it('shows preview when image provided', () => {
    render(
      <SmartImageUpload
        {...baseProps}
        value={{ url: 'https://example.com/image.png', width: 100, height: 100 }}
      />
    );
    const img = screen.getByAltText('Test Image') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toBe('https://example.com/image.png');
  });

  it('validates file type and rejects .exe', async () => {
    const onError = vi.fn();
    render(<SmartImageUpload {...baseProps} onError={onError} />);

    const file = createMockFile('malware.exe', 'application/x-msdownload', 1024);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    setFilesOnInput(input, [file]);

    await waitFor(() => {
      expect(screen.getByText(/Formato no válido/)).toBeDefined();
    });
    expect(onError).toHaveBeenCalled();
  });

  it('validates file size and shows error for oversized file', async () => {
    const onError = vi.fn();
    render(<SmartImageUpload {...baseProps} maxSizeMB={1} onError={onError} />);

    const file = createMockFile('big.png', 'image/png', 2 * 1024 * 1024); // 2MB
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    setFilesOnInput(input, [file]);

    await waitFor(() => {
      expect(screen.getByText(/excede 1MB/)).toBeDefined();
    });
    expect(onError).toHaveBeenCalled();
  });

  it('calls onChange with ImageAsset after upload', async () => {
    const onChange = vi.fn();
    mockedUploadWalletImage.mockResolvedValueOnce({
      url: 'https://cdn.example.com/uploaded.png',
      width: 200,
      height: 200,
    });

    render(<SmartImageUpload {...baseProps} onChange={onChange} />);

    const file = createMockFile('photo.png', 'image/png', 1024);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    setFilesOnInput(input, [file]);

    await waitFor(() => {
      expect(mockedUploadWalletImage).toHaveBeenCalledWith(file, 'logo');
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        url: 'https://cdn.example.com/uploaded.png',
        width: 200,
        height: 200,
      });
    });
  });

  it('calls onChange with undefined on remove', () => {
    const onChange = vi.fn();
    render(
      <SmartImageUpload
        {...baseProps}
        value={{ url: 'https://example.com/image.png', width: 100, height: 100 }}
        onChange={onChange}
      />
    );

    const removeBtn = screen.getByTitle('Eliminar imagen');
    fireEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('shows Apple and Google previews when image is loaded', () => {
    render(
      <SmartImageUpload
        {...baseProps}
        value={{ url: 'https://example.com/image.png', width: 100, height: 100 }}
      />
    );

    expect(screen.getByText('Apple')).toBeDefined();
    expect(screen.getByText('Google')).toBeDefined();

    const applePreview = screen.getByAltText('Test Image - Apple preview') as HTMLImageElement;
    const googlePreview = screen.getByAltText('Test Image - Google preview') as HTMLImageElement;

    expect(applePreview).toBeDefined();
    expect(googlePreview).toBeDefined();
  });

  it('shows loading state during upload', async () => {
    mockedUploadWalletImage.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ url: 'https://example.com/x.png', width: 10, height: 10 }), 100))
    );

    render(<SmartImageUpload {...baseProps} />);

    const file = createMockFile('photo.png', 'image/png', 1024);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    setFilesOnInput(input, [file]);

    await waitFor(() => {
      expect(screen.getByText('Subiendo...')).toBeDefined();
    });
  });
});
