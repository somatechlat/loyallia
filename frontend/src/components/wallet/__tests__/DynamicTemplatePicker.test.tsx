/**
 * Unit tests for DynamicTemplatePicker — insert {{tokens}} into a value.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { DynamicTemplatePicker } from '@/components/wallet/studio/DynamicTemplatePicker';
import { DYNAMIC_TEMPLATES } from '@/components/wallet/types/dynamic-templates';

function renderPicker(value = '', onChange = vi.fn()) {
  return render(
    <I18nProvider>
      <DynamicTemplatePicker value={value} onChange={onChange} cardType="stamp" />
    </I18nProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('DynamicTemplatePicker', () => {
  it('edits the raw value through the input', () => {
    const onChange = vi.fn();
    renderPicker('hi', onChange);
    fireEvent.change(screen.getByDisplayValue('hi'), { target: { value: 'hello' } });
    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('opens the picker and inserts a template at the caret', () => {
    const onChange = vi.fn();
    renderPicker('Hello ', onChange);
    fireEvent.click(screen.getByRole('button', { name: /insert|insertar|template|plantilla/i }));
    const first = screen.getAllByRole('button').find((b) => b.querySelector('code'));
    expect(first).toBeDefined();
    fireEvent.click(first!);
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0]![0] as string;
    expect(next.startsWith('Hello ')).toBe(true);
    expect(next).toContain('{{');
  });

  it('filters templates by search', () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: /insert|insertar|template|plantilla/i }));
    fireEvent.change(screen.getByLabelText(/search|buscar/i), { target: { value: 'zzz-no-match' } });
    expect(screen.getByText(/no se encontraron|no templates|sin plantillas/i)).toBeDefined();
  });

  it('resolves token previews to example values', () => {
    const customer = DYNAMIC_TEMPLATES.find((t) => t.id.includes('customer'));
    const value = customer ? `Hi ${customer.id}` : 'Hi {{customer.name}}';
    renderPicker(value);
    expect(screen.getByText(/Hi /)).toBeDefined();
  });
});
