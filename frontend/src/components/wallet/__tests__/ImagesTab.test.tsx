/**
 * Unit tests for ImagesTab component (SRS-003 Section 8.1).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ImagesTab } from '@/components/wallet/studio/ImagesTab';

// Mock the upload utility
vi.mock('@/lib/upload', () => ({
  uploadFile: vi.fn(),
}));

import { uploadFile } from '@/lib/upload';

const mockedUploadFile = vi.mocked(uploadFile);

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

  it('renders all 3 sections', () => {
    render(<ImagesTab {...baseProps} />);
    expect(screen.getByText('LOGO DEL NEGOCIO')).toBeDefined();
    expect(screen.getByText('IMAGEN PRINCIPAL (Strip / Hero)')).toBeDefined();
    expect(screen.getByText('IMÁGENES ADICIONALES')).toBeDefined();
  });

  it('renders logo upload zone with correct labels', () => {
    render(<ImagesTab {...baseProps} />);
    expect(screen.getByText('Arrastra una imagen o haz click')).toBeDefined();
    const formatTexts = screen.getAllByText(/Formatos: PNG, JPG, WebP/);
    expect(formatTexts.length).toBeGreaterThanOrEqual(2); // logo + strip zones
    expect(screen.getAllByText(/Tamaño máximo: 5 MB/).length).toBeGreaterThanOrEqual(2);
  });

  it('renders strip upload zone with correct label', () => {
    render(<ImagesTab {...baseProps} />);
    expect(screen.getByText('Arrastra una imagen panorámica')).toBeDefined();
  });

  it('renders additional image rows', () => {
    render(<ImagesTab {...baseProps} />);
    expect(screen.getByText('Icono Apple')).toBeDefined();
    expect(screen.getByText('Lock screen y notificaciones')).toBeDefined();
    expect(screen.getByText('Miniatura')).toBeDefined();
    expect(screen.getByText('Fondo')).toBeDefined();
    expect(screen.getByText('Wide Logo')).toBeDefined();
  });

  it('calls onUpdateImages when logo uploaded with auto-generate enabled', async () => {
    const onUpdateImages = vi.fn();
    mockedUploadFile.mockResolvedValueOnce('https://cdn.example.com/logo.png');

    render(<ImagesTab images={{}} onUpdateImages={onUpdateImages} />);

    const file = createMockFile('logo.png', 'image/png', 1024);
    const inputs = document.querySelectorAll('input[type="file"]');
    setFilesOnInput(inputs[0] as HTMLInputElement, [file]);

    await waitFor(() => {
      expect(mockedUploadFile).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onUpdateImages).toHaveBeenCalledWith({
        logo: { url: 'https://cdn.example.com/logo.png', width: 200, height: 200 },
        logo2x: { url: 'https://cdn.example.com/logo.png', width: 200, height: 200 },
        logo3x: { url: 'https://cdn.example.com/logo.png', width: 200, height: 200 },
      });
    });
  });

  it('calls onUpdateImages when strip uploaded with auto-generate enabled', async () => {
    const onUpdateImages = vi.fn();
    mockedUploadFile.mockResolvedValueOnce('https://cdn.example.com/strip.png');

    render(<ImagesTab images={{}} onUpdateImages={onUpdateImages} />);

    const file = createMockFile('strip.png', 'image/png', 1024);
    const inputs = document.querySelectorAll('input[type="file"]');
    setFilesOnInput(inputs[1] as HTMLInputElement, [file]);

    await waitFor(() => {
      expect(mockedUploadFile).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onUpdateImages).toHaveBeenCalledWith({
        strip: { url: 'https://cdn.example.com/strip.png', width: 200, height: 200 },
        strip2x: { url: 'https://cdn.example.com/strip.png', width: 200, height: 200 },
        strip3x: { url: 'https://cdn.example.com/strip.png', width: 200, height: 200 },
        heroImage: { url: 'https://cdn.example.com/strip.png', width: 200, height: 200 },
      });
    });
  });

  it('calls onUpdateImages when icon uploaded', async () => {
    const onUpdateImages = vi.fn();
    mockedUploadFile.mockResolvedValueOnce('https://cdn.example.com/icon.png');

    render(<ImagesTab images={{}} onUpdateImages={onUpdateImages} />);

    const file = createMockFile('icon.png', 'image/png', 1024);
    const inputs = document.querySelectorAll('input[type="file"]');
    // Icon upload is the 3rd input (index 2)
    setFilesOnInput(inputs[2] as HTMLInputElement, [file]);

    await waitFor(() => {
      expect(mockedUploadFile).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(onUpdateImages).toHaveBeenCalledWith({
        icon: { url: 'https://cdn.example.com/icon.png', width: 200, height: 200 },
        icon2x: { url: 'https://cdn.example.com/icon.png', width: 200, height: 200 },
      });
    });
  });

  it('shows logo previews and action buttons after logo upload', () => {
    render(
      <ImagesTab
        images={{
          logo: { url: 'https://example.com/logo.png', width: 160, height: 50 },
        }}
        onUpdateImages={baseProps.onUpdateImages}
      />
    );
    expect(screen.getByText('Apple Rect')).toBeDefined();
    expect(screen.getByText('Google Circle')).toBeDefined();
    expect(screen.getByText('Original')).toBeDefined();
    expect(screen.getByText('160×50pt')).toBeDefined();
    expect(screen.getByText('660×660px')).toBeDefined();
    expect(screen.getByText('Full size')).toBeDefined();
    expect(screen.getByText('Eliminar')).toBeDefined();
    expect(screen.getByText('Reemplazar')).toBeDefined();
    expect(screen.getByText('Mejorar con IA')).toBeDefined();
  });

  it('calls onUpdateImages with undefined when logo deleted', () => {
    const onUpdateImages = vi.fn();
    render(
      <ImagesTab
        images={{
          logo: { url: 'https://example.com/logo.png', width: 160, height: 50 },
        }}
        onUpdateImages={onUpdateImages}
      />
    );

    const deleteBtn = screen.getByText('Eliminar');
    fireEvent.click(deleteBtn);

    expect(onUpdateImages).toHaveBeenCalledWith({
      logo: undefined,
      logo2x: undefined,
      logo3x: undefined,
    });
  });

  it('renders platform helper text for strip section', () => {
    render(<ImagesTab {...baseProps} />);
    expect(screen.getByText(/Apple: Banner detrás de campos \(375×123pt\)/)).toBeDefined();
    expect(screen.getByText(/Google: Banner superior \(1032×336px\)/)).toBeDefined();
  });

  it('renders auto-generate checkbox when logo exists', () => {
    render(
      <ImagesTab
        images={{
          logo: { url: 'https://example.com/logo.png', width: 160, height: 50 },
        }}
        onUpdateImages={baseProps.onUpdateImages}
      />
    );
    expect(screen.getByLabelText('Auto-generar @2x y @3x para Apple')).toBeDefined();
  });
});
