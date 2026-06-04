/**
 * Unit tests for FieldStudio component — inline expanded editing (SRS-003 Section 8.3).
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
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
    render(<FieldStudio {...baseProps} />);
    expect(screen.getByText('🏷️ CAMPOS DE CABECERA — Máximo 3')).toBeDefined();
    expect(screen.getByText('⭐ CAMPO PRINCIPAL — 1 campo grande y prominente')).toBeDefined();
    expect(screen.getByText('📋 CAMPOS SECUNDARIOS — Hasta 4 (2 en Apple si barcode rect.)')).toBeDefined();
    expect(screen.getByText('🔍 CAMPOS AUXILIARES — Hasta 4 (2 en Apple si barcode rect.)')).toBeDefined();
    expect(screen.getByText('📄 DETALLES / TRASERO — Sin límite')).toBeDefined();
  });

  it('shows subtitle for header group', () => {
    render(<FieldStudio {...baseProps} />);
    expect(screen.getByText('(Visibles incluso cuando el pase está en pila)')).toBeDefined();
  });

  it('shows add buttons with remaining count for groups under limit', () => {
    render(<FieldStudio {...baseProps} />);
    const addBtn = screen.getByLabelText('Añadir campo a 🏷️ CAMPOS DE CABECERA — Máximo 3');
    expect(addBtn).toBeDefined();
    expect(addBtn.textContent).toContain('Añadir campo de cabecera');
    expect(addBtn.textContent).toContain('restantes');
  });

  it('header fields are expanded inline', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'header', label: 'Header Field' }),
    ];
    render(<FieldStudio {...baseProps} fields={fields} />);
    expect(screen.getByText('Etiqueta:')).toBeDefined();
    expect(screen.getByText('Valor:')).toBeDefined();
    expect(screen.getByDisplayValue('Header Field')).toBeDefined();
  });

  it('primary field shows alignment selector', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'primary', label: 'Primary Field' }),
    ];
    render(<FieldStudio {...baseProps} fields={fields} />);
    expect(screen.getByText('Alineación:')).toBeDefined();
    expect(screen.getByText('Izquierda')).toBeDefined();
    expect(screen.getByText('Centro')).toBeDefined();
    expect(screen.getByText('Derecha')).toBeDefined();
  });

  it('secondary fields start compact', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'secondary', label: 'Sec Field', value: 'Sec Value' }),
    ];
    render(<FieldStudio {...baseProps} fields={fields} />);
    expect(screen.getByText('Sec Field')).toBeDefined();
    expect(screen.getByText('Sec Value')).toBeDefined();
    expect(screen.queryByText('Etiqueta:')).toBeNull();
  });

  it('clicking compact field expands it', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'secondary', label: 'Sec Field', value: 'Sec Value' }),
    ];
    render(<FieldStudio {...baseProps} fields={fields} />);
    const compactRow = screen.getByRole('button', { name: /Field Sec Field: Sec Value/ });
    fireEvent.click(compactRow);
    expect(screen.getByText('Etiqueta:')).toBeDefined();
    expect(screen.getByText('Valor:')).toBeDefined();
  });

  it('adding a field via group button works', () => {
    render(<FieldStudio {...baseProps} />);
    const addBtn = screen.getByLabelText('Añadir campo a 🏷️ CAMPOS DE CABECERA — Máximo 3');
    fireEvent.click(addBtn);
    expect(baseProps.onUpdateFields).toHaveBeenCalledTimes(1);
  });

  it('deleting a field removes it', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'header', label: 'Header Field' }),
    ];
    render(<FieldStudio {...baseProps} fields={fields} />);
    const deleteBtn = screen.getByLabelText('Delete field');
    fireEvent.click(deleteBtn);
    expect(baseProps.onUpdateFields).toHaveBeenCalledTimes(1);
    const updater = baseProps.onUpdateFields.mock.calls[0]![0] as (prev: UnifiedField[]) => UnifiedField[];
    const result = updater(fields);
    expect(result).toHaveLength(0);
  });

  it('platform toggles update field', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'header', label: 'Header Field', showOnApple: true }),
    ];
    render(<FieldStudio {...baseProps} fields={fields} />);
    const appleBtn = screen.getByLabelText('Visible on Apple Wallet');
    fireEvent.click(appleBtn);
    expect(baseProps.onUpdateFields).toHaveBeenCalledTimes(1);
    const updater = baseProps.onUpdateFields.mock.calls[0]![0] as (prev: UnifiedField[]) => UnifiedField[];
    const result = updater(fields);
    expect(result[0]!.showOnApple).toBe(false);
  });

  it('dynamic checkbox toggles isDynamic', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'header', label: 'Header Field', isDynamic: false }),
    ];
    render(<FieldStudio {...baseProps} fields={fields} />);
    const dynamicCheckbox = screen.getByLabelText('Dinámico');
    fireEvent.click(dynamicCheckbox);
    expect(baseProps.onUpdateFields).toHaveBeenCalledTimes(1);
    const updater = baseProps.onUpdateFields.mock.calls[0]![0] as (prev: UnifiedField[]) => UnifiedField[];
    const result = updater(fields);
    expect(result[0]!.isDynamic).toBe(true);
  });

  it('template picker inserts template into value', async () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'header', label: 'Header Field', value: '' }),
    ];
    render(<FieldStudio {...baseProps} fields={fields} />);
    const templateBtn = screen.getByLabelText('Insert dynamic template');
    fireEvent.click(templateBtn);
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Dynamic template picker' })).toBeDefined();
    });
    const templateOption = screen.getByText('Customer Name');
    fireEvent.click(templateOption);
    expect(baseProps.onUpdateFields).toHaveBeenCalled();
    const updater = baseProps.onUpdateFields.mock.calls[0]![0] as (prev: UnifiedField[]) => UnifiedField[];
    const result = updater(fields);
    expect(result[0]!.value).toContain('{customer_name}');
  });

  it('limit indicator prevents adding beyond max', () => {
    const fields: UnifiedField[] = Array.from({ length: 3 }, (_, i) =>
      createMockField({ id: `f${i}`, fieldGroup: 'header', order: i })
    );
    render(<FieldStudio {...baseProps} fields={fields} />);
    expect(screen.queryByLabelText('Añadir campo a 🏷️ CAMPOS DE CABECERA — Máximo 3')).toBeNull();
  });

  it('reorder buttons move fields', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'header', order: 0, label: 'First' }),
      createMockField({ id: 'f2', fieldGroup: 'header', order: 1, label: 'Second' }),
    ];
    render(<FieldStudio {...baseProps} fields={fields} />);
    const moveUpBtns = screen.getAllByLabelText('Move up');
    fireEvent.click(moveUpBtns[0]!);
    expect(baseProps.onUpdateFields).toHaveBeenCalledTimes(1);
  });

  it('shows empty state for groups without fields', () => {
    render(<FieldStudio {...baseProps} />);
    expect(screen.getAllByText('No hay campos en este grupo').length).toBeGreaterThan(0);
  });

  it('primary field shows notification toggle', () => {
    const fields: UnifiedField[] = [
      createMockField({ id: 'f1', fieldGroup: 'primary', label: 'Primary Field' }),
    ];
    render(<FieldStudio {...baseProps} fields={fields} />);
    expect(screen.getByText('Enviar notificación:')).toBeDefined();
  });
});
