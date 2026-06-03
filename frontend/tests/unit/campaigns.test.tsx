/**
 * Unit tests for campaign wizard components.
 * Tests: CustomerPicker, ProgramSelector, PlatformSelector
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
    expect(screen.getByText('Juan Perez')).toBeInTheDocument();
    expect(screen.getByText('Maria Gomez')).toBeInTheDocument();
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
    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('shows empty state when no customers', () => {
    render(<CustomerPicker {...baseProps} customers={[]} total={0} />);
    expect(screen.getByText('campaigns.noCustomers')).toBeInTheDocument();
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
    expect(screen.getByText('Programa A')).toBeInTheDocument();
    expect(screen.getByText('Programa B')).toBeInTheDocument();
  });

  it('filters programs by search', () => {
    render(<ProgramSelector {...baseProps} />);
    const input = screen.getByPlaceholderText('campaigns.searchProgram');
    fireEvent.change(input, { target: { value: 'A' } });
    expect(screen.getByText('Programa A')).toBeInTheDocument();
    expect(screen.queryByText('Programa B')).not.toBeInTheDocument();
  });

  it('calls onSelect when program card clicked', () => {
    const onSelect = vi.fn();
    render(<ProgramSelector {...baseProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Programa A'));
    expect(onSelect).toHaveBeenCalledWith('p1');
  });

  it('shows wallet platform breakdown when isWallet=true', () => {
    render(<ProgramSelector {...baseProps} />);
    expect(screen.getByText(/40/)).toBeInTheDocument();
    expect(screen.getByText(/60/)).toBeInTheDocument();
  });

  it('shows all programs option', () => {
    render(<ProgramSelector {...baseProps} />);
    expect(screen.getByText('campaigns.allPrograms')).toBeInTheDocument();
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
    expect(screen.getByText('wallet.both')).toBeInTheDocument();
    expect(screen.getByText('wallet.appleWallet')).toBeInTheDocument();
    expect(screen.getByText('wallet.googleWallet')).toBeInTheDocument();
  });

  it('calls onSelect with platform key', () => {
    const onSelect = vi.fn();
    render(<PlatformSelector {...baseProps} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('wallet.appleWallet'));
    expect(onSelect).toHaveBeenCalledWith('apple');
  });

  it('shows counts for selected program', () => {
    render(<PlatformSelector {...baseProps} />);
    expect(screen.getByText(/40/)).toBeInTheDocument();
    expect(screen.getByText(/60/)).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('hides counts when program is all', () => {
    render(<PlatformSelector {...baseProps} selectedProgramId="all" />);
    expect(screen.queryByText(/100/)).not.toBeInTheDocument();
  });
});
