/**
 * Unit tests for TemplateGallery component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { TemplateGallery } from '@/components/wallet/studio/TemplateGallery';
import { SYSTEM_TEMPLATES, CARD_TYPE_ORDER } from '@/components/wallet/templates/registry';

function renderGallery(overrides: Partial<React.ComponentProps<typeof TemplateGallery>> = {}) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectTemplate: vi.fn(),
    onCreateBlank: vi.fn(),
    ...overrides,
  };
  return { ...render(<I18nProvider><TemplateGallery {...props} /></I18nProvider>), props };
}

describe('TemplateGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = renderGallery({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('renders header with localized title', () => {
    renderGallery();
    expect(screen.getByText('Galería de plantillas')).toBeDefined();
  });

  it('renders back button that calls onClose', () => {
    const { props } = renderGallery();
    const backBtn = screen.getByTestId('gallery-back-btn');
    fireEvent.click(backBtn);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders search input', () => {
    renderGallery();
    expect(screen.getByTestId('gallery-search-input')).toBeDefined();
  });

  it('renders industry and card type dropdowns', () => {
    renderGallery();
    expect(screen.getByTestId('gallery-industry-select')).toBeDefined();
    expect(screen.getByTestId('gallery-cardtype-select')).toBeDefined();
  });

  it('does not render a Design with AI button', () => {
    renderGallery();
    expect(screen.queryByTestId('gallery-ai-btn')).toBeNull();
  });

  it('renders category pills for every card type plus Todos', () => {
    renderGallery();
    const categories = screen.getByTestId('gallery-categories');
    expect(categories.children.length).toBe(CARD_TYPE_ORDER.length + 1);
    expect(screen.getByTestId('gallery-category-all')).toBeDefined();
    for (const cardType of CARD_TYPE_ORDER) {
      expect(screen.getByTestId(`gallery-category-${cardType}`)).toBeDefined();
    }
  });

  it('renders all system template cards by default', () => {
    renderGallery();
    const grid = screen.getByTestId('gallery-grid');
    expect(grid.children.length).toBe(SYSTEM_TEMPLATES.length);
  });

  it('filters templates by search query', () => {
    renderGallery();
    const searchInput = screen.getByTestId('gallery-search-input');
    fireEvent.change(searchInput, { target: { value: 'Café Artesanal' } });
    const grid = screen.getByTestId('gallery-grid');
    expect(grid.children.length).toBeLessThan(SYSTEM_TEMPLATES.length);
    expect(screen.getByTestId('template-card-stamp-cafe-artesanal')).toBeDefined();
  });

  it('shows empty state when search has no results', () => {
    renderGallery();
    const searchInput = screen.getByTestId('gallery-search-input');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });
    expect(screen.getByTestId('gallery-empty')).toBeDefined();
  });

  it('filters templates by category pill', () => {
    renderGallery();
    fireEvent.click(screen.getByTestId('gallery-category-coupon'));
    const grid = screen.getByTestId('gallery-grid');
    const couponCount = SYSTEM_TEMPLATES.filter((t) => t.cardType === 'coupon').length;
    expect(grid.children.length).toBe(couponCount);
    expect(couponCount).toBeGreaterThanOrEqual(3);
  });

  it('filters templates by industry dropdown', () => {
    renderGallery();
    const industrySelect = screen.getByTestId('gallery-industry-select');
    fireEvent.change(industrySelect, { target: { value: 'food' } });
    const grid = screen.getByTestId('gallery-grid');
    expect(grid.children.length).toBeGreaterThan(0);
    expect(grid.children.length).toBeLessThan(SYSTEM_TEMPLATES.length);
  });

  it('filters templates by card type dropdown', () => {
    renderGallery();
    const cardTypeSelect = screen.getByTestId('gallery-cardtype-select');
    fireEvent.change(cardTypeSelect, { target: { value: 'multipass' } });
    const grid = screen.getByTestId('gallery-grid');
    expect(grid.children.length).toBeGreaterThan(0);
    expect(grid.children.length).toBeLessThan(SYSTEM_TEMPLATES.length);
  });

  it('opens preview modal when clicking a template card', () => {
    renderGallery();
    const card = screen.getByTestId('template-card-stamp-cafe-artesanal');
    const btn = card.querySelector('button[data-template-card-btn]');
    fireEvent.click(btn!);
    expect(screen.getByTestId('preview-large')).toBeDefined();
    expect(screen.getByTestId('preview-use-btn')).toBeDefined();
  });

  it('calls onSelectTemplate when clicking preview use button', () => {
    const { props } = renderGallery();
    const card = screen.getByTestId('template-card-stamp-cafe-artesanal');
    fireEvent.click(card.querySelector('button[data-template-card-btn]')!);
    fireEvent.click(screen.getByTestId('preview-use-btn'));
    expect(props.onSelectTemplate).toHaveBeenCalledTimes(1);
    expect(props.onSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'stamp-cafe-artesanal' })
    );
  });

  it('closes preview modal when clicking close button', () => {
    renderGallery();
    const card = screen.getByTestId('template-card-stamp-cafe-artesanal');
    fireEvent.click(card.querySelector('button[data-template-card-btn]')!);
    expect(screen.getByTestId('preview-large')).toBeDefined();
    fireEvent.click(screen.getByTestId('preview-close-btn'));
    expect(screen.queryByTestId('preview-large')).toBeNull();
  });

  it('calls onCreateBlank when clicking blank start button', () => {
    const { props } = renderGallery();
    fireEvent.click(screen.getByTestId('gallery-blank-btn'));
    expect(props.onCreateBlank).toHaveBeenCalledTimes(1);
  });

  it('renders live mini preview with design-system palette base', () => {
    renderGallery();
    const preview = screen.getByTestId('template-preview-stamp-cafe-artesanal') as HTMLElement;
    // Café Artesanal uses the stamp palette (#B45309 base), jsdom-normalised
    expect(preview.style.backgroundColor.replace(/\s/g, '')).toBe('rgb(180,83,9)');
  });

  it('renders correct template name and description on card', () => {
    renderGallery();
    expect(screen.getAllByText('Café Artesanal').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Sellos de visita con recompensa de café de especialidad.').length
    ).toBeGreaterThanOrEqual(1);
  });

  it('each template card has hover lift styling', () => {
    renderGallery();
    const card = screen.getByTestId('template-card-stamp-cafe-artesanal');
    expect(card.className).toContain('hover:shadow-xl');
    expect(card.className).toContain('hover:-translate-y-0.5');
  });
});
