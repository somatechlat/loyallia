/**
 * Unit tests for campaign wizard components.
 * Tests: CustomerPicker, ProgramSelector, PlatformSelector
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Mock useI18n to return keys as-is
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      let result = key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          result += ` ${k}=${v}`;
        }
      }
      return result;
    },
    locale: 'es',
  }),
}));

import CustomerPicker from '@/components/campaigns/CustomerPicker';
import ProgramSelector from '@/components/campaigns/ProgramSelector';
import PlatformSelector from '@/components/campaigns/PlatformSelector';

afterEach(() => {
  cleanup();
});

describe('CustomerPicker', () => {
  const mockCustomers = [
    { id: '1', first_name: 'Juan', last_name: 'Perez', email: 'juan@test.com', phone: '0999999999' },
    { id: '2', first_name: 'Maria', last_name: 'Gomez', email: 'maria@test.com', phone: '' },
  ];

  const baseProps = {
    customers: mockCustomers,
    selectedIds: [] as string[],
    total: 2,
    offset: 0,
    loading: false,
    search: '',
    mode: 'select' as const,
    onSearchChange: vi.fn(),
    onOffsetChange: vi.fn(),
    onToggle: vi.fn(),
    onToggleAll: vi.fn(),
  };

  it('renders customer list', () => {
    render(<CustomerPicker {...baseProps} />);
    expect(screen.getByText('Juan Perez')).toBeDefined();
    expect(screen.getByText('Maria Gomez')).toBeDefined();
  });

  it('checks all rows when toggle all is clicked', () => {
    const onToggleAll = vi.fn();
    render(<CustomerPicker {...baseProps} onToggleAll={onToggleAll} />);
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);
    expect(onToggleAll).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<CustomerPicker {...baseProps} loading={true} customers={[]} />);
    expect(screen.getByText('common.loading')).toBeDefined();
  });

  it('shows empty state when no customers', () => {
    render(<CustomerPicker {...baseProps} customers={[]} total={0} />);
    expect(screen.getByText('campaigns.noCustomers')).toBeDefined();
  });

  it('calls onToggle when individual row is clicked', () => {
    const onToggle = vi.fn();
    render(<CustomerPicker {...baseProps} onToggle={onToggle} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(onToggle).toHaveBeenCalledWith('1');
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
    onSelect: vi.fn(),
  };

  it('renders program cards', () => {
    render(<ProgramSelector {...baseProps} />);
    const cards = screen.getAllByText('Programa A');
    expect(cards.length).toBeGreaterThan(0);
    expect(screen.getAllByText('Programa B').length).toBeGreaterThan(0);
  });

  it('has search input', () => {
    render(<ProgramSelector {...baseProps} />);
    const inputs = screen.getAllByPlaceholderText('campaigns.searchProgram');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('calls onSelect when program card clicked', () => {
    const onSelect = vi.fn();
    render(<ProgramSelector {...baseProps} onSelect={onSelect} />);
    const cards = screen.getAllByText('Programa A');
    fireEvent.click(cards[0]);
    expect(onSelect).toHaveBeenCalledWith('p1');
  });

  it('shows wallet platform breakdown when isWallet=true', () => {
    render(<ProgramSelector {...baseProps} />);
    const texts = screen.getAllByText(/40/);
    expect(texts.length).toBeGreaterThan(0);
  });

  it('shows all programs option', () => {
    render(<ProgramSelector {...baseProps} />);
    const options = screen.getAllByText('campaigns.allPrograms');
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
    onSelect: vi.fn(),
  };

  it('renders three platform options', () => {
    render(<PlatformSelector {...baseProps} />);
    expect(screen.getAllByText('wallet.both').length).toBeGreaterThan(0);
    expect(screen.getAllByText('wallet.appleWallet').length).toBeGreaterThan(0);
    expect(screen.getAllByText('wallet.googleWallet').length).toBeGreaterThan(0);
  });

  it('calls onSelect with platform key', () => {
    const onSelect = vi.fn();
    render(<PlatformSelector {...baseProps} onSelect={onSelect} />);
    const apple = screen.getAllByText('wallet.appleWallet');
    fireEvent.click(apple[0]);
    expect(onSelect).toHaveBeenCalledWith('apple');
  });

  it('shows counts for selected program', () => {
    render(<PlatformSelector {...baseProps} />);
    expect(screen.getAllByText(/40/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/60/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
  });

  it('hides counts when program is all', () => {
    render(<PlatformSelector {...baseProps} selectedProgramId="all" />);
    const bothCount = screen.queryAllByText(/👥 100/);
    expect(bothCount.length).toBe(0);
  });
});
