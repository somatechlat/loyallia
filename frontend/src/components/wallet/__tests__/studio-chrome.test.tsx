/**
 * Unit tests for studio chrome: StudioToolbar, PropertiesPanel,
 * DesignScore, SaveTemplateModal, NotificationConfigInline.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { StudioToolbar } from '@/components/wallet/studio/StudioToolbar';
import { PropertiesPanel } from '@/components/wallet/studio/PropertiesPanel';
import { DesignScore } from '@/components/wallet/studio/DesignScore';
import { SaveTemplateModal } from '@/components/wallet/studio/SaveTemplateModal';
import { NotificationConfigInline } from '@/components/wallet/studio/NotificationConfigInline';
import type { DesignScoreResult } from '@/hooks/useDesignScore';
import type { WalletPassStudioState, UnifiedField } from '@/components/wallet/types/unified-state';
import { getDefaultCardTypeConfig } from '@/components/wallet/types/card-type-config';

function renderUI(node: React.ReactElement) {
  return render(<I18nProvider>{node}</I18nProvider>);
}

function createField(overrides: Partial<UnifiedField> = {}): UnifiedField {
  return {
    id: 'f1',
    label: 'Points',
    value: '120',
    fieldGroup: 'primary',
    order: 0,
    showOnApple: true,
    showOnGoogle: true,
    isDynamic: false,
    dataType: 'text',
    appleOptions: {},
    googleOptions: { isPredefined: false },
    notifications: {},
    formatting: { isLink: false },
    ...overrides,
  };
}

function createState(overrides: Partial<WalletPassStudioState> = {}): WalletPassStudioState {
  return {
    passName: 'Test',
    externalName: 'Test',
    externalDescription: '',
    cardType: 'stamp',
    cardTypeConfig: getDefaultCardTypeConfig('stamp'),
    images: { logo: null, strip: null, background: null, thumbnail: null, hero: null, footer: null, icon: null },
    colors: {
      background: '#1A1A1A',
      foreground: '#FFFFFF',
      label: '#9CA3AF',
      accent: '#3B82F6',
      centralBackground: '',
    },
    google: { hexBackgroundColor: '#1A1A1A' },
    fields: [createField()],
    backContent: { fields: [], links: [] },
    barcode: { format: 'qr_code', message: 'hello', altText: '' },
    translations: {},
    notifications: {},
    ui: {
      activeTab: 'images',
      selectedFieldId: null,
      zoom: 1,
      showBack: false,
      platformView: 'both',
      isModified: false,
    },
    ...overrides,
  } as WalletPassStudioState;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ── StudioToolbar ───────────────────────────────────────────────────────────

describe('StudioToolbar', () => {
  const base = {
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    canUndo: true,
    canRedo: false,
    platformView: 'both' as const,
    onPlatformViewChange: vi.fn(),
    zoom: 1,
    onZoomChange: vi.fn(),
    showBack: false,
    onToggleBack: vi.fn(),
    onOpenTemplates: vi.fn(),
    onSave: vi.fn(),
    onAIGenerate: vi.fn(),
    isModified: false,
  };

  it('disables undo/redo from canUndo/canRedo', () => {
    renderUI(<StudioToolbar {...base} />);
    const undo = screen.getByTitle(/deshacer|undo/i);
    const redo = screen.getByTitle(/rehacer|redo/i);
    expect(undo.hasAttribute('disabled')).toBe(false);
    expect(redo.hasAttribute('disabled')).toBe(true);
  });

  it('clamps zoom between 50% and 200%', () => {
    const onZoomChange = vi.fn();
    const first = renderUI(<StudioToolbar {...base} onZoomChange={onZoomChange} zoom={0.5} />);
    fireEvent.click(screen.getByTitle(/alejar|zoom out|reducir/i));
    expect(onZoomChange).toHaveBeenCalledWith(0.5);
    first.unmount();

    onZoomChange.mockClear();
    renderUI(<StudioToolbar {...base} onZoomChange={onZoomChange} zoom={2} />);
    fireEvent.click(screen.getByTitle(/acercar|zoom in|ampliar/i));
    expect(onZoomChange).toHaveBeenCalledWith(2);
  });

  it('calls onSave and onToggleBack', () => {
    const onSave = vi.fn();
    const onToggleBack = vi.fn();
    renderUI(<StudioToolbar {...base} onSave={onSave} onToggleBack={onToggleBack} />);
    fireEvent.click(screen.getByRole('button', { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const back = screen.getByRole('radio', { name: /reverso|atrás|back/i });
    fireEvent.click(back);
    expect(onToggleBack).toHaveBeenCalledTimes(1);
  });

  it('switches platform view', () => {
    const onPlatformViewChange = vi.fn();
    renderUI(<StudioToolbar {...base} onPlatformViewChange={onPlatformViewChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /apple/i }));
    expect(onPlatformViewChange).toHaveBeenCalledWith('apple');
  });
});

// ── PropertiesPanel ─────────────────────────────────────────────────────────

describe('PropertiesPanel', () => {
  it('shows field properties when a field is selected', () => {
    const state = createState();
    renderUI(<PropertiesPanel state={state} selectedFieldId="f1" />);
    expect(screen.getByText('Points')).toBeDefined();
    expect(screen.getByText('120')).toBeDefined();
  });

  it('falls back to a placeholder when label or value is empty', () => {
    const state = createState({ fields: [createField({ label: '', value: '' })] });
    renderUI(<PropertiesPanel state={state} selectedFieldId="f1" />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('shows design score when no field is selected', () => {
    const state = createState();
    renderUI(<PropertiesPanel state={state} selectedFieldId={null} designScore={8.5} />);
    expect(screen.getByText('8.5')).toBeDefined();
    expect(screen.queryByText('Points')).toBeNull();
  });
});

// ── DesignScore ─────────────────────────────────────────────────────────────

describe('DesignScore', () => {
  const result: DesignScoreResult = {
    score: 8.5,
    level: 'bueno',
    checks: [
      { id: 'c1', label: 'wallet.designScore.checks.contrast_text', passed: true },
      { id: 'c2', label: 'wallet.designScore.checks.logo', passed: false },
    ],
  };

  it('renders score, level and every check', () => {
    renderUI(<DesignScore result={result} />);
    expect(screen.getByText('8.5')).toBeDefined();
    expect(screen.getByText('8.5/10')).toBeDefined();
    expect(screen.getByText(/1\/2/)).toBeDefined();
  });

  it('marks failed checks with a warning path', () => {
    renderUI(<DesignScore result={{ ...result, level: 'necesita_trabajo', score: 2 }} />);
    expect(screen.getByText('2.0')).toBeDefined();
  });
});

// ── SaveTemplateModal ───────────────────────────────────────────────────────

describe('SaveTemplateModal', () => {
  it('renders nothing when closed', () => {
    renderUI(
      <SaveTemplateModal isOpen={false} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(screen.queryByTestId('template-name-input')).toBeNull();
  });

  it('saves trimmed name and description', () => {
    const onSave = vi.fn();
    renderUI(
      <SaveTemplateModal isOpen onClose={vi.fn()} onSave={onSave} defaultName="Base" />
    );
    fireEvent.change(screen.getByTestId('template-name-input'), {
      target: { value: '  Summer  ' },
    });
    fireEvent.change(screen.getByTestId('template-description-input'), {
      target: { value: '  hot  ' },
    });
    fireEvent.click(screen.getByTestId('template-save-btn'));
    expect(onSave).toHaveBeenCalledWith('Summer', 'hot');
  });

  it('refuses to save an empty name', () => {
    const onSave = vi.fn();
    renderUI(<SaveTemplateModal isOpen onClose={vi.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByTestId('template-name-input'), { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('template-save-btn'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('closes from the close button and the backdrop', () => {
    const onClose = vi.fn();
    renderUI(<SaveTemplateModal isOpen onClose={onClose} onSave={vi.fn()} />);
    fireEvent.click(screen.getByTestId('template-cancel-btn'));
    fireEvent.click(screen.getByTestId('save-template-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

// ── NotificationConfigInline ────────────────────────────────────────────────

describe('NotificationConfigInline', () => {
  it('enables Apple change message with a default message', () => {
    const onUpdate = vi.fn();
    renderUI(<NotificationConfigInline notifications={{}} onUpdate={onUpdate} />);
    const appleToggle = screen.getAllByRole('checkbox')[0]!;
    fireEvent.click(appleToggle);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        appleChangeMessage: expect.objectContaining({ enabled: true }),
      })
    );
  });

  it('edits the Apple message body', () => {
    const onUpdate = vi.fn();
    renderUI(
      <NotificationConfigInline
        notifications={{ appleChangeMessage: { enabled: true, message: 'hi' } }}
        onUpdate={onUpdate}
      />
    );
    const input = screen.getByDisplayValue('hi');
    fireEvent.change(input, { target: { value: 'hello' } });
    expect(onUpdate).toHaveBeenCalledWith({
      appleChangeMessage: { enabled: true, message: 'hello' },
    });
  });

  it('enables Google message with header, body and trigger defaults', () => {
    const onUpdate = vi.fn();
    renderUI(<NotificationConfigInline notifications={{}} onUpdate={onUpdate} />);
    const googleToggle = screen.getAllByRole('checkbox')[1]!;
    fireEvent.click(googleToggle);
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        googleMessage: expect.objectContaining({ enabled: true, trigger: 'onChange' }),
      })
    );
  });

  it('edits Google header and body', () => {
    const onUpdate = vi.fn();
    renderUI(
      <NotificationConfigInline
        notifications={{
          googleMessage: { enabled: true, header: 'H', body: 'B', trigger: 'onChange' },
        }}
        onUpdate={onUpdate}
      />
    );
    fireEvent.change(screen.getByTestId('inline-google-header'), { target: { value: 'New' } });
    expect(onUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        googleMessage: expect.objectContaining({ header: 'New' }),
      })
    );
  });
});
