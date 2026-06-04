/**
 * Unit tests for campaign wizard components.
 * Tests: CustomerPicker, ProgramSelector, PlatformSelector
 * NO mocks — all tests use real components and real code paths.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { I18nProvider } from '@/lib/i18n';
import CustomerPicker from '@/components/campaigns/CustomerPicker';
import ProgramSelector from '@/components/campaigns/ProgramSelector';
import PlatformSelector from '@/components/campaigns/PlatformSelector';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

afterEach(() => {
  cleanup();
});

describe('CustomerPicker', () => {
  const customers = [
    { id: '1', first_name: 'Juan', last_name: 'Perez', email: 'juan@test.com', phone: '0999999999' },
    { id: '2', first_name: 'Maria', last_name: 'Gomez', email: 'maria@test.com', phone: '' },
  ];

  const baseProps = {
    customers,
    selectedIds: [] as string[],
    total: 2,
    offset: 0,
    loading: false,
    search: '',
    mode: 'select' as const,
    onSearchChange: () => {},
    onOffsetChange: () => {},
    onToggle: () => {},
    onToggleAll: () => {},
  };

  it('renders customer list', () => {
    render(<Wrapper><CustomerPicker {...baseProps} /></Wrapper>);
    expect(screen.getByText('Juan Perez')).toBeDefined();
    expect(screen.getByText('Maria Gomez')).toBeDefined();
  });

  it('checks all rows when toggle all is clicked', () => {
    let toggleAllCalled = false;
    const onToggleAll = () => { toggleAllCalled = true; };
    render(<Wrapper><CustomerPicker {...baseProps} onToggleAll={onToggleAll} /></Wrapper>);
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(toggleAllCalled).toBe(true);
  });

  it('shows loading state', () => {
    render(<Wrapper><CustomerPicker {...baseProps} loading={true} customers={[]} /></Wrapper>);
    expect(screen.getByText('Loading...')).toBeDefined();
  });

  it('shows empty state when no customers', () => {
    render(<Wrapper><CustomerPicker {...baseProps} customers={[]} total={0} /></Wrapper>);
    expect(screen.getByText('No customers found')).toBeDefined();
  });

  it('calls onToggle when individual row is clicked', () => {
    let toggledId = '';
    const onToggle = (id: string) => { toggledId = id; };
    render(<Wrapper><CustomerPicker {...baseProps} onToggle={onToggle} /></Wrapper>);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(toggledId).toBe('1');
  });
});

describe('ProgramSelector', () => {
  const programs = [
    { id: 'p1', name: 'Programa A' },
    { id: 'p2', name: 'Programa B' },
  ];

  const counts = {
    p1: { total: 100, apple: 40, google: 60 },
    p2: { total: 50, apple: 20, google: 30 },
  };

  const baseProps = {
    programs,
    programCounts: counts,
    selectedId: '',
    isWallet: true,
    onSelect: () => {},
  };

  it('renders program cards', () => {
    render(<Wrapper><ProgramSelector {...baseProps} /></Wrapper>);
    const cards = screen.getAllByText('Programa A');
    expect(cards.length).toBeGreaterThan(0);
    expect(screen.getAllByText('Programa B').length).toBeGreaterThan(0);
  });

  it('has search input', () => {
    render(<Wrapper><ProgramSelector {...baseProps} /></Wrapper>);
    const inputs = screen.getAllByPlaceholderText('Search program...');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('calls onSelect when program card clicked', () => {
    let selectedId = '';
    const onSelect = (id: string) => { selectedId = id; };
    render(<Wrapper><ProgramSelector {...baseProps} onSelect={onSelect} /></Wrapper>);
    const cards = screen.getAllByText('Programa A');
    fireEvent.click(cards[0]);
    expect(selectedId).toBe('p1');
  });

  it('shows wallet platform breakdown when isWallet=true', () => {
    render(<Wrapper><ProgramSelector {...baseProps} /></Wrapper>);
    const texts = screen.getAllByText(/40/);
    expect(texts.length).toBeGreaterThan(0);
  });

  it('shows all programs option', () => {
    render(<Wrapper><ProgramSelector {...baseProps} /></Wrapper>);
    const options = screen.getAllByText('All programs');
    expect(options.length).toBeGreaterThan(0);
  });
});

describe('PlatformSelector', () => {
  const programs = [{ id: 'p1', name: 'Prog A' }];
  const counts = { p1: { total: 100, apple: 40, google: 60 } };

  const baseProps = {
    programs,
    programCounts: counts,
    selectedPlatform: 'both' as const,
    selectedProgramId: 'p1',
    onSelect: () => {},
  };

  it('renders three platform options', () => {
    render(<Wrapper><PlatformSelector {...baseProps} /></Wrapper>);
    expect(screen.getAllByText('Both').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Apple Wallet').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Google Wallet').length).toBeGreaterThan(0);
  });

  it('calls onSelect with platform key', () => {
    let selectedPlatform = '';
    const onSelect = (platform: string) => { selectedPlatform = platform; };
    render(<Wrapper><PlatformSelector {...baseProps} onSelect={onSelect} /></Wrapper>);
    const apple = screen.getAllByText('Apple Wallet');
    fireEvent.click(apple[0]);
    expect(selectedPlatform).toBe('apple');
  });

  it('shows counts for selected program', () => {
    render(<Wrapper><PlatformSelector {...baseProps} /></Wrapper>);
    expect(screen.getAllByText(/40/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/60/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
  });

  it('hides counts when program is all', () => {
    render(<Wrapper><PlatformSelector {...baseProps} selectedProgramId="all" /></Wrapper>);
    const bothCount = screen.queryAllByText(/👥 100/);
    expect(bothCount.length).toBe(0);
  });
});
