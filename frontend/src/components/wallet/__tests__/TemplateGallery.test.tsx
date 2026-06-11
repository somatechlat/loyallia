/**
 * Unit tests for TemplateGallery component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TemplateGallery } from '@/components/wallet/studio/TemplateGallery';
import { SYSTEM_TEMPLATES } from '@/components/wallet/templates/registry';

describe('TemplateGallery', () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectTemplate: vi.fn(),
    onCreateBlank: vi.fn(),
    onAIGenerate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<TemplateGallery {...baseProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders header with Wallet Pass Studio title', () => {
    render(<TemplateGallery {...baseProps} />);
    expect(screen.getByText('Wallet Pass Studio')).toBeDefined();
  });

  it('renders back button that calls onClose', () => {
    render(<TemplateGallery {...baseProps} />);
    const backBtn = screen.getByTestId('gallery-back-btn');
    fireEvent.click(backBtn);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('renders search input', () => {
    render(<TemplateGallery {...baseProps} />);
    expect(screen.getByTestId('gallery-search-input')).toBeDefined();
  });

  it('renders industry and card type dropdowns', () => {
    render(<TemplateGallery {...baseProps} />);
    expect(screen.getByTestId('gallery-industry-select')).toBeDefined();
    expect(screen.getByTestId('gallery-cardtype-select')).toBeDefined();
  });

  it('renders AI generate button', () => {
    render(<TemplateGallery {...baseProps} />);
    const aiBtn = screen.getByTestId('gallery-ai-btn');
    expect(aiBtn).toBeDefined();
    fireEvent.click(aiBtn);
    expect(baseProps.onAIGenerate).toHaveBeenCalledTimes(1);
  });

  it('renders all category pills', () => {
    render(<TemplateGallery {...baseProps} />);
    const categories = screen.getByTestId('gallery-categories');
    expect(categories.children.length).toBe(6);
    expect(screen.getByTestId('gallery-category-all')).toBeDefined();
    expect(screen.getByTestId('gallery-category-cafe')).toBeDefined();
    expect(screen.getByTestId('gallery-category-retail')).toBeDefined();
    expect(screen.getByTestId('gallery-category-gym')).toBeDefined();
    expect(screen.getByTestId('gallery-category-salon')).toBeDefined();
    expect(screen.getByTestId('gallery-category-hotel')).toBeDefined();
  });

  it('renders all 20 system template cards by default', () => {
    render(<TemplateGallery {...baseProps} />);
    const grid = screen.getByTestId('gallery-grid');
    expect(grid.children.length).toBe(20);
  });

  it('filters templates by search query', () => {
    render(<TemplateGallery {...baseProps} />);
    const searchInput = screen.getByTestId('gallery-search-input');
    fireEvent.change(searchInput, { target: { value: 'Café Clásico' } });
    const grid = screen.getByTestId('gallery-grid');
    expect(grid.children.length).toBeLessThan(20);
    expect(screen.getByTestId('template-card-cafe-classico-sellos')).toBeDefined();
  });

  it('shows empty state when search has no results', () => {
    render(<TemplateGallery {...baseProps} />);
    const searchInput = screen.getByTestId('gallery-search-input');
    fireEvent.change(searchInput, { target: { value: 'xyznonexistent' } });
    expect(screen.getByTestId('gallery-empty')).toBeDefined();
  });

  it('filters templates by category pill', () => {
    render(<TemplateGallery {...baseProps} />);
    const hotelBtn = screen.getByTestId('gallery-category-hotel');
    fireEvent.click(hotelBtn);
    const grid = screen.getByTestId('gallery-grid');
    expect(grid.children.length).toBe(1);
    expect(screen.getByTestId('template-card-hotel-lujo')).toBeDefined();
  });

  it('filters templates by industry dropdown', () => {
    render(<TemplateGallery {...baseProps} />);
    const industrySelect = screen.getByTestId('gallery-industry-select');
    fireEvent.change(industrySelect, { target: { value: 'food' } });
    const grid = screen.getByTestId('gallery-grid');
    expect(grid.children.length).toBeGreaterThan(0);
    expect(grid.children.length).toBeLessThan(20);
  });

  it('filters templates by card type dropdown', () => {
    render(<TemplateGallery {...baseProps} />);
    const cardTypeSelect = screen.getByTestId('gallery-cardtype-select');
    fireEvent.change(cardTypeSelect, { target: { value: 'multipass' } });
    const grid = screen.getByTestId('gallery-grid');
    expect(grid.children.length).toBeGreaterThan(0);
    expect(grid.children.length).toBeLessThan(20);
  });

  it('opens preview modal when clicking a template card', () => {
    render(<TemplateGallery {...baseProps} />);
    const card = screen.getByTestId('template-card-cafe-classico-sellos');
    const btn = card.querySelector('button');
    fireEvent.click(btn!);
    expect(screen.getByTestId('preview-large')).toBeDefined();
    expect(screen.getByTestId('preview-use-btn')).toBeDefined();
  });

  it('calls onSelectTemplate when clicking preview use button', () => {
    render(<TemplateGallery {...baseProps} />);
    const card = screen.getByTestId('template-card-cafe-classico-sellos');
    const btn = card.querySelector('button');
    fireEvent.click(btn!);
    const useBtn = screen.getByTestId('preview-use-btn');
    fireEvent.click(useBtn);
    expect(baseProps.onSelectTemplate).toHaveBeenCalledTimes(1);
    expect(baseProps.onSelectTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cafe-classico-sellos' })
    );
  });

  it('closes preview modal when clicking close button', () => {
    render(<TemplateGallery {...baseProps} />);
    const card = screen.getByTestId('template-card-cafe-classico-sellos');
    const btn = card.querySelector('button');
    fireEvent.click(btn!);
    expect(screen.getByTestId('preview-large')).toBeDefined();
    const closeBtn = screen.getByTestId('preview-close-btn');
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId('preview-large')).toBeNull();
  });

  it('calls onCreateBlank when clicking blank start button', () => {
    render(<TemplateGallery {...baseProps} />);
    const blankBtn = screen.getByTestId('gallery-blank-btn');
    fireEvent.click(blankBtn);
    expect(baseProps.onCreateBlank).toHaveBeenCalledTimes(1);
  });

  it('renders template preview with correct background color', () => {
    render(<TemplateGallery {...baseProps} />);
    const preview = screen.getByTestId('template-preview-cafe-classico-sellos');
    expect(preview.style.backgroundColor).toBe('rgb(107, 66, 38)');
  });

  it('renders correct template name and description on card', () => {
    render(<TemplateGallery {...baseProps} />);
    const names = screen.getAllByText('Café Clásico');
    expect(names.length).toBeGreaterThanOrEqual(1);
    const descriptions = screen.getAllByText('Sellos: ☕×10');
    expect(descriptions.length).toBeGreaterThanOrEqual(1);
  });

  it('each template card has hover transition class', () => {
    render(<TemplateGallery {...baseProps} />);
    const card = screen.getByTestId('template-card-cafe-classico-sellos');
    expect(card.className).toContain('hover:scale-[1.03]');
    expect(card.className).toContain('hover:shadow-lg');
  });
});
