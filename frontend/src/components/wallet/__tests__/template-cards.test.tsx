/**
 * Unit tests for TemplateCard and TemplatePreviewModal.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { TemplateCard } from '@/components/wallet/studio/TemplateCard';
import { TemplatePreviewModal } from '@/components/wallet/studio/TemplatePreviewModal';
import { SYSTEM_TEMPLATES } from '@/components/wallet/templates/registry';
import { createDefaultState } from '@/hooks/useWalletStudio';

const template = SYSTEM_TEMPLATES[0]!;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TemplateCard', () => {
  it('renders preview, name and card type badge', () => {
    render(
      <I18nProvider>
        <TemplateCard template={template} isUserTemplate={false} onClick={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByTestId(`template-card-${template.id}`)).toBeDefined();
    expect(screen.getByTestId(`template-preview-${template.id}`)).toBeDefined();
    expect(screen.getAllByText(template.name).length).toBeGreaterThanOrEqual(1);
  });

  it('calls onClick from the card body', () => {
    const onClick = vi.fn();
    render(
      <I18nProvider>
        <TemplateCard template={template} isUserTemplate={false} onClick={onClick} />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId(`template-card-${template.id}`).querySelector('button[data-template-card-btn]')!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('hides the context menu on system templates', () => {
    render(
      <I18nProvider>
        <TemplateCard template={template} isUserTemplate={false} onClick={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.queryByLabelText('Opciones')).toBeNull();
  });

  it('runs rename, duplicate and delete from the user menu', () => {
    const onRename = vi.fn();
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();
    render(
      <I18nProvider>
        <TemplateCard
          template={template}
          isUserTemplate
          onClick={vi.fn()}
          onRename={onRename}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </I18nProvider>
    );
    fireEvent.click(screen.getByLabelText('Opciones'));
    fireEvent.click(screen.getByText('Renombrar'));
    expect(onRename).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('Opciones'));
    fireEvent.click(screen.getByText('Duplicar'));
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('Opciones'));
    fireEvent.click(screen.getByText(/eliminar|delete/i));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('renders stamp slots for stamp presets', () => {
    render(
      <I18nProvider>
        <TemplateCard template={template} isUserTemplate={false} onClick={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getByTestId(`template-stamps-${template.id}`)).toBeDefined();
  });
});

describe('TemplatePreviewModal', () => {
  it('opens the preview and can be closed from the close button', () => {
    const onClose = vi.fn();
    render(
      <I18nProvider>
        <TemplatePreviewModal
          template={template}
          designState={createDefaultState()}
          onClose={onClose}
          onUse={vi.fn()}
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('preview-large')).toBeDefined();
    fireEvent.click(screen.getByTestId('preview-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onUse from the use button', () => {
    const onUse = vi.fn();
    render(
      <I18nProvider>
        <TemplatePreviewModal
          template={template}
          designState={createDefaultState()}
          onClose={vi.fn()}
          onUse={onUse}
        />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('preview-use-btn'));
    expect(onUse).toHaveBeenCalledTimes(1);
  });

  it('shows WYSIWYG card and toggles platform variant', () => {
    render(
      <I18nProvider>
        <TemplatePreviewModal
          template={template}
          onClose={vi.fn()}
          onUse={vi.fn()}
        />
      </I18nProvider>
    );
    expect(screen.getByTestId('preview-wysiwyg-stage')).toBeDefined();
    expect(screen.getByTestId('preview-card-apple')).toBeDefined();
    fireEvent.click(screen.getByTestId('preview-platform-google'));
    expect(screen.getByTestId('preview-card-google')).toBeDefined();
  });

  it('toggles device-frame mode via Vista previa', () => {
    render(
      <I18nProvider>
        <TemplatePreviewModal
          template={template}
          onClose={vi.fn()}
          onUse={vi.fn()}
        />
      </I18nProvider>
    );
    fireEvent.click(screen.getByTestId('preview-mode-btn'));
    expect(screen.queryByTestId('preview-wysiwyg-stage')).toBeNull();
    fireEvent.click(screen.getByTestId('preview-mode-btn'));
    expect(screen.getByTestId('preview-wysiwyg-stage')).toBeDefined();
  });
});
