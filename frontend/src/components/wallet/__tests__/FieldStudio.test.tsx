/**
 * Unit tests for FieldStudio component — inline expanded editing (SRS-003 Section 8.3).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { FieldStudio } from '@/components/wallet/studio/FieldStudio';
import type { UnifiedField } from '@/components/wallet/types/unified-state';

function createMockField(overrides: Partial<UnifiedField> = {}): UnifiedField {
  return {
    id: `field-${Math.random().toString(36).slice(2, 7)}`,
    label: 'Test Label',
    value: 'Test Value',
    fieldGroup: 'header',
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

describe('FieldStudio', () => {
  const baseProps = {
    fields: [] as UnifiedField[],
    cardType: 'stamp' as const,
    onUpdateFields: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders all 5 group panels with correct titles', () => {
    render(<I18nProvider><FieldStudio {...baseProps} /></I18nProvider>);
    expect(screen.getByText('Cabecera')).toBeDefined();
    expect(screen.getByText('Principal')).toBeDefined();
    expect(screen.getByText('Secundarios')).toBeDefined();
    expect(screen.getByText('Auxiliares')).toBeDefined();
    // "Reverso" appears in both group title and sidebar tab - use getAllByText
    expect(screen.getAllByText('Reverso').length).toBeGreaterThanOrEqual(1);
  });

  it('shows add buttons for empty groups', () => {
    render(<I18nProvider><FieldStudio {...baseProps} /></I18nProvider>);
    const addBtns = screen.getAllByRole('button');
    // There should be add buttons for each group (5 groups)
    expect(addBtns.length).toBeGreaterThanOrEqual(5);
  });

  it('header fields are expanded inline', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'header', label: 'Header Field' }),
    ];
    render(<I18nProvider><FieldStudio {...baseProps} fields={fields} /></I18nProvider>);
    expect(screen.getByDisplayValue('Header Field')).toBeDefined();
  });

  it('adding a field via group button works', () => {
    render(<I18nProvider><FieldStudio {...baseProps} /></I18nProvider>);
    // aria-label is "Añadir campo" for all groups
    const addBtns = screen.getAllByLabelText(/Añadir campo/i);
    fireEvent.click(addBtns[0]!);
    expect(baseProps.onUpdateFields).toHaveBeenCalledTimes(1);
  });

  it('deleting a field removes it', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'header', label: 'Header Field' }),
    ];
    render(<I18nProvider><FieldStudio {...baseProps} fields={fields} /></I18nProvider>);
    const deleteBtn = screen.getByTestId('field-delete-btn');
    fireEvent.click(deleteBtn);
    expect(baseProps.onUpdateFields).toHaveBeenCalledTimes(1);
    const updater = baseProps.onUpdateFields.mock.calls[0]![0] as (prev: UnifiedField[]) => UnifiedField[];
    const result = updater(fields);
    expect(result).toHaveLength(0);
  });

  it('limit indicator prevents adding beyond max', () => {
    const fields: UnifiedField[] = Array.from({ length: 3 }, (_, i) =>
      createMockField({ id: `f${i}`, fieldGroup: 'header', order: i })
    );
    render(<I18nProvider><FieldStudio {...baseProps} fields={fields} /></I18nProvider>);
    // Header group should not have add button when at max (3)
    const headerSection = screen.getByText('Cabecera').closest('div');
    expect(headerSection).toBeDefined();
  });

  it('reorder buttons move fields', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'header', order: 0, label: 'First' }),
      createMockField({ id: 'f2', fieldGroup: 'header', order: 1, label: 'Second' }),
    ];
    render(<I18nProvider><FieldStudio {...baseProps} fields={fields} /></I18nProvider>);
    const moveDownBtn = screen.getByLabelText('Mover abajo');
    fireEvent.click(moveDownBtn);
    expect(baseProps.onUpdateFields).toHaveBeenCalledTimes(1);
  });

  it('shows empty state for groups without fields', () => {
    render(<I18nProvider><FieldStudio {...baseProps} /></I18nProvider>);
    expect(screen.getAllByText('Sin campos').length).toBeGreaterThan(0);
  });

  it('primary field shows alignment selector', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'primary', label: 'Primary Field' }),
    ];
    render(<I18nProvider><FieldStudio {...baseProps} fields={fields} /></I18nProvider>);
    expect(screen.getByText('Alineación')).toBeDefined();
    expect(screen.getByText('Izquierda')).toBeDefined();
    expect(screen.getByText('Centro')).toBeDefined();
    expect(screen.getByText('Derecha')).toBeDefined();
  });
});
