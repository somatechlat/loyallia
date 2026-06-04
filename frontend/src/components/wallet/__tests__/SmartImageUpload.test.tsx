/**
 * Unit tests for SmartImageUpload component.
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { SmartImageUpload } from '@/components/wallet/studio/SmartImageUpload';
import type { ImageAsset } from '@/components/wallet/types/unified-state';

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

describe('SmartImageUpload', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders upload zone when no image', () => {
    render(
      <I18nProvider>
        <SmartImageUpload
          label="Test Image"
          recommendedSize={{ width: 100, height: 100 }}
          applePreviewShape="circle"
          googlePreviewShape="rect"
          onChange={() => {}}
        />
      </I18nProvider>
    );
    expect(screen.getByText('Test Image')).toBeDefined();
    expect(screen.getByText('wallet.studio.upload.clickOrDrag')).toBeDefined();
  });

  it('shows description when provided', () => {
    render(
      <I18nProvider>
        <SmartImageUpload
          label="Test Image"
          description="A helpful description"
          recommendedSize={{ width: 100, height: 100 }}
          applePreviewShape="circle"
          googlePreviewShape="rect"
          onChange={() => {}}
        />
      </I18nProvider>
    );
    expect(screen.getByText('A helpful description')).toBeDefined();
  });

  it('shows preview when image provided', () => {
    render(
      <I18nProvider>
        <SmartImageUpload
          label="Test Image"
          recommendedSize={{ width: 100, height: 100 }}
          applePreviewShape="circle"
          googlePreviewShape="rect"
          value={{ url: 'https://example.com/image.png', width: 100, height: 100 }}
          onChange={() => {}}
        />
      </I18nProvider>
    );
    const img = screen.getByAltText('Test Image') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toBe('https://example.com/image.png');
  });

  it('validates file type and rejects .exe', async () => {
    let errorMessage: string | undefined;
    render(
      <I18nProvider>
        <SmartImageUpload
          label="Test Image"
          recommendedSize={{ width: 100, height: 100 }}
          applePreviewShape="circle"
          googlePreviewShape="rect"
          onChange={() => {}}
          onError={(msg) => { errorMessage = msg; }}
        />
      </I18nProvider>
    );

    const file = createMockFile('malware.exe', 'application/x-msdownload', 1024);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    setFilesOnInput(input, [file]);

    await waitFor(() => {
      expect(screen.getByText('wallet.studio.upload.invalidFormat')).toBeDefined();
    });
    expect(errorMessage).toBe('wallet.studio.upload.invalidFormat');
  });

  it('validates file size and shows error for oversized file', async () => {
    let errorMessage: string | undefined;
    render(
      <I18nProvider>
        <SmartImageUpload
          label="Test Image"
          recommendedSize={{ width: 100, height: 100 }}
          applePreviewShape="circle"
          googlePreviewShape="rect"
          maxSizeMB={1}
          onChange={() => {}}
          onError={(msg) => { errorMessage = msg; }}
        />
      </I18nProvider>
    );

    const file = createMockFile('big.png', 'image/png', 2 * 1024 * 1024); // 2MB
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    setFilesOnInput(input, [file]);

    await waitFor(() => {
      expect(screen.getByText('wallet.studio.upload.fileTooBig')).toBeDefined();
    });
    expect(errorMessage).toBe('wallet.studio.upload.fileTooBig');
  });

  it('calls onChange with undefined on remove', () => {
    let lastChange: ImageAsset | undefined = { url: 'x', width: 1, height: 1 };
    render(
      <I18nProvider>
        <SmartImageUpload
          label="Test Image"
          recommendedSize={{ width: 100, height: 100 }}
          applePreviewShape="circle"
          googlePreviewShape="rect"
          value={{ url: 'https://example.com/image.png', width: 100, height: 100 }}
          onChange={(asset) => { lastChange = asset; }}
        />
      </I18nProvider>
    );

    const removeBtn = screen.getByTitle('wallet.studio.upload.delete');
    fireEvent.click(removeBtn);

    expect(lastChange).toBeUndefined();
  });

  it('shows Apple and Google previews when image is loaded', () => {
    render(
      <I18nProvider>
        <SmartImageUpload
          label="Test Image"
          recommendedSize={{ width: 100, height: 100 }}
          applePreviewShape="circle"
          googlePreviewShape="rect"
          value={{ url: 'https://example.com/image.png', width: 100, height: 100 }}
          onChange={() => {}}
        />
      </I18nProvider>
    );

    expect(screen.getByText('Apple')).toBeDefined();
    expect(screen.getByText('Google')).toBeDefined();

    const applePreview = screen.getByAltText('Test Image - Apple preview') as HTMLImageElement;
    const googlePreview = screen.getByAltText('Test Image - Google preview') as HTMLImageElement;

    expect(applePreview).toBeDefined();
    expect(googlePreview).toBeDefined();
  });
});
