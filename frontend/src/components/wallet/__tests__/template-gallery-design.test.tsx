/**
 * Template gallery design-system + i18n quality gates and filter behaviour.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { I18nProvider } from '@/lib/i18n';
import { TemplateGallery } from '@/components/wallet/studio/TemplateGallery';
import { TemplateCard } from '@/components/wallet/studio/TemplateCard';
import { TemplatePreviewModal } from '@/components/wallet/studio/TemplatePreviewModal';
import { SYSTEM_TEMPLATES, CARD_TYPE_ORDER } from '@/components/wallet/templates/registry';
import { getCardPalette } from '@/components/wallet/design-system';

const UI_SOURCES = [
  'src/components/wallet/studio/TemplateGallery.tsx',
  'src/components/wallet/studio/TemplateCard.tsx',
  'src/components/wallet/studio/TemplatePreviewModal.tsx',
  'src/components/wallet/studio/SaveTemplateModal.tsx',
].map((p) => resolve(process.cwd(), p));

function renderGallery() {
  return render(
    <I18nProvider>
      <TemplateGallery
        isOpen
        onClose={vi.fn()}
        onSelectTemplate={vi.fn()}
        onCreateBlank={vi.fn()}
      />
    </I18nProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('template UI style bans', () => {
  it('has no sub-11px type utilities in template UI', () => {
    for (const path of UI_SOURCES) {
      const src = readFileSync(path, 'utf-8');
      const hits = src.match(/text-\[(?:8|9|10)px\]/g) ?? [];
      expect(hits, path).toEqual([]);
    }
  });

  it('has no low-opacity text dimming', () => {
    for (const path of UI_SOURCES) {
      const src = readFileSync(path, 'utf-8');
      expect(src, path).not.toMatch(/opacity-(?:30|40|50)/);
    }
  });

  it('TemplateCard and TemplatePreviewModal pull design-system tokens', () => {
    for (const path of UI_SOURCES.slice(1, 3)) {
      const src = readFileSync(path, 'utf-8');
      expect(src, path).toContain('getCardPalette');
      expect(src, path).toContain('CARD_TYPE_SCALE');
      expect(src, path).toContain('CARD_RADIUS');
      expect(src, path).toContain('CARD_SHADOW');
      expect(src, path).toContain('CARD_CHROME');
    }
  });

  it('TemplateCard has no raw hex colours', () => {
    const src = readFileSync(UI_SOURCES[1]!, 'utf-8');
    const hits = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hits).toEqual([]);
  });

  it('WysiwygCard uses CARD_RADIUS.apple and progressSlots', () => {
    const src = readFileSync(UI_SOURCES[2]!, 'utf-8');
    expect(src).toContain('CARD_RADIUS.apple');
    expect(src).toContain('progressSlots');
    expect(src).toContain('preview-card-');
    expect(src).toContain('preview-hero-value');
  });
});

describe('TemplateGallery filters', () => {
  it('renders one category chip per card type plus Todos', () => {
    renderGallery();
    const categories = screen.getByTestId('gallery-categories');
    // Todos + 10 card types
    expect(categories.children.length).toBe(CARD_TYPE_ORDER.length + 1);
    expect(screen.getByTestId('gallery-category-all')).toBeDefined();
    for (const cardType of CARD_TYPE_ORDER) {
      expect(screen.getByTestId(`gallery-category-${cardType}`)).toBeDefined();
    }
  });

  it('renders the full system grid by default', () => {
    renderGallery();
    const grid = screen.getByTestId('gallery-grid');
    expect(grid.children.length).toBe(SYSTEM_TEMPLATES.length);
    expect(grid.className).toContain('grid-cols-2');
    expect(grid.className).toContain('sm:grid-cols-3');
    expect(grid.className).toContain('lg:grid-cols-4');
  });

  it('filters by card-type category chip', () => {
    renderGallery();
    fireEvent.click(screen.getByTestId('gallery-category-stamp'));
    const grid = screen.getByTestId('gallery-grid');
    const stampCount = SYSTEM_TEMPLATES.filter((t) => t.cardType === 'stamp').length;
    expect(grid.children.length).toBe(stampCount);
    expect(stampCount).toBeGreaterThanOrEqual(3);
  });

  it('filters multipass via category chip', () => {
    renderGallery();
    fireEvent.click(screen.getByTestId('gallery-category-multipass'));
    const grid = screen.getByTestId('gallery-grid');
    expect(grid.children.length).toBe(
      SYSTEM_TEMPLATES.filter((t) => t.cardType === 'multipass').length
    );
  });

  it('search narrows results and empty state appears', () => {
    renderGallery();
    const search = screen.getByTestId('gallery-search-input');
    fireEvent.change(search, { target: { value: 'Café Artesanal' } });
    const grid = screen.getByTestId('gallery-grid');
    expect(grid.children.length).toBe(1);
    fireEvent.change(search, { target: { value: 'zzz-no-match-zzz' } });
    expect(screen.getByTestId('gallery-empty')).toBeDefined();
  });

  it('opens the WYSIWYG preview modal with platform toggle and actions', () => {
    renderGallery();
    const card = screen.getByTestId('template-card-stamp-cafe-artesanal');
    const btn = card.querySelector('button[data-template-card-btn]');
    fireEvent.click(btn!);
    expect(screen.getByTestId('preview-large')).toBeDefined();
    expect(screen.getByTestId('preview-wysiwyg-stage')).toBeDefined();
    expect(screen.getByTestId('preview-platform-toggle')).toBeDefined();
    expect(screen.getByTestId('preview-use-btn')).toBeDefined();
    expect(screen.getByTestId('preview-mode-btn')).toBeDefined();
    expect(screen.getByTestId('preview-card-apple')).toBeDefined();
  });

  it('switches to the Google variant', () => {
    renderGallery();
    const card = screen.getByTestId('template-card-stamp-cafe-artesanal');
    fireEvent.click(card.querySelector('button[data-template-card-btn]')!);
    fireEvent.click(screen.getByTestId('preview-platform-google'));
    expect(screen.getByTestId('preview-card-google')).toBeDefined();
    expect(screen.queryByTestId('preview-card-apple')).toBeNull();
  });

  it('marks selected template with palette accent', () => {
    renderGallery();
    const card = screen.getByTestId('template-card-stamp-cafe-artesanal');
    fireEvent.click(card.querySelector('button[data-template-card-btn]')!);
    fireEvent.click(screen.getByTestId('preview-use-btn'));
    const selected = screen.getByTestId('template-card-stamp-cafe-artesanal') as HTMLElement;
    expect(selected.getAttribute('data-selected')).toBe('true');
    const palette = getCardPalette('stamp');
    expect(selected.style.boxShadow).toContain(palette.accent);
  });
});

describe('TemplateCard live preview', () => {
  const template = SYSTEM_TEMPLATES.find((t) => t.id === 'stamp-cafe-artesanal')!;

  it('renders a live mini pass preview with palette gradient', () => {
    render(
      <I18nProvider>
        <TemplateCard template={template} isUserTemplate={false} onClick={vi.fn()} />
      </I18nProvider>
    );
    const preview = screen.getByTestId(`template-preview-${template.id}`) as HTMLElement;
    const palette = getCardPalette(template.paletteKey);
    // jsdom normalises hex to rgb() in cssText
    expect(preview.style.backgroundColor.replace(/\s/g, '')).toBe('rgb(180,83,9)');
    expect(preview.style.backgroundImage).toContain('linear-gradient');
    expect(preview.className).toContain('rounded-[18px]');
    // Stamp slots present
    expect(screen.getByTestId(`template-stamps-${template.id}`)).toBeDefined();
  });

  it('renders hero value from curated fields', () => {
    render(
      <I18nProvider>
        <TemplateCard template={template} isUserTemplate={false} onClick={vi.fn()} />
      </I18nProvider>
    );
    expect(screen.getAllByText('3 / 10').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('SELLOS').length).toBeGreaterThanOrEqual(1);
  });
});
