/**
 * NumberInput — controlled numeric input contract.
 *
 * Regression coverage for the dead-Backspace bug: clearing or partially typing
 * a numeric input must never snap back, and blur must validate/clamp without
 * ever emitting NaN.
 */
import React, { useState } from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { NumberInput, parseNumberInputRaw } from '@/components/ui/NumberInput';

interface HarnessProps {
  initial?: number | null;
  min?: number;
  max?: number;
  integer?: boolean;
  /** When true the parent refuses null (like the migrated config tabs do). */
  ignoreNull?: boolean;
  onValueChange?: (value: number | null, raw: string) => void;
}

/** Controlled wrapper: mirrors how the studio/config tabs own numeric state. */
function Harness({ initial = 5, min, max, integer, ignoreNull, onValueChange }: HarnessProps) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <NumberInput
      value={value}
      min={min}
      max={max}
      integer={integer}
      onValueChange={(v, raw) => {
        if (!ignoreNull || v !== null) setValue(v);
        onValueChange?.(v, raw);
      }}
      data-testid="num"
    />
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('parseNumberInputRaw', () => {
  it('parses plain and partial decimals', () => {
    expect(parseNumberInputRaw('42')).toBe(42);
    expect(parseNumberInputRaw('1.')).toBe(1);
    expect(parseNumberInputRaw('1.5')).toBe(1.5);
    expect(parseNumberInputRaw('-3.25')).toBe(-3.25);
  });

  it('returns null for empty and unparseable text', () => {
    expect(parseNumberInputRaw('')).toBeNull();
    expect(parseNumberInputRaw('   ')).toBeNull();
    expect(parseNumberInputRaw('-')).toBeNull();
    expect(parseNumberInputRaw('abc')).toBeNull();
    expect(parseNumberInputRaw('1.2.3')).toBeNull();
  });

  it('rounds to integers when integer mode is on', () => {
    expect(parseNumberInputRaw('2.6', true)).toBe(3);
    expect(parseNumberInputRaw('7', true)).toBe(7);
  });
});

describe('NumberInput', () => {
  it('clears the field on Backspace without snapping back', () => {
    render(<Harness initial={12} />);
    const input = screen.getByTestId('num') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    // A re-render with the parent's state must not resurrect the old value.
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
  });

  it('keeps intermediate text states while typing', () => {
    const onValueChange = vi.fn();
    render(<Harness initial={null} onValueChange={onValueChange} />);
    const input = screen.getByTestId('num') as HTMLInputElement;
    fireEvent.focus(input);

    fireEvent.change(input, { target: { value: '-' } });
    expect(input.value).toBe('-');
    expect(onValueChange).toHaveBeenLastCalledWith(null, '-');

    fireEvent.change(input, { target: { value: '1.' } });
    expect(input.value).toBe('1.');
    expect(onValueChange).toHaveBeenLastCalledWith(1, '1.');

    fireEvent.change(input, { target: { value: '1.5' } });
    expect(input.value).toBe('1.5');
    expect(onValueChange).toHaveBeenLastCalledWith(1.5, '1.5');
  });

  it('validates and clamps to max on blur', () => {
    const onValueChange = vi.fn();
    render(<Harness initial={10} min={0} max={100} onValueChange={onValueChange} />);
    const input = screen.getByTestId('num') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '500' } });
    expect(input.value).toBe('500');
    fireEvent.blur(input);
    expect(input.value).toBe('100');
    expect(onValueChange).toHaveBeenLastCalledWith(100, '100');
  });

  it('clamps to min on blur', () => {
    const onValueChange = vi.fn();
    render(<Harness initial={5} min={10} max={20} onValueChange={onValueChange} />);
    const input = screen.getByTestId('num') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.blur(input);
    expect(input.value).toBe('10');
    expect(onValueChange).toHaveBeenLastCalledWith(10, '10');
  });

  it('does not emit out-of-range values while typing (blur clamps instead)', () => {
    const onValueChange = vi.fn();
    render(<Harness initial={5} min={10} max={20} onValueChange={onValueChange} />);
    const input = screen.getByTestId('num') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '0' } });
    expect(input.value).toBe('0');
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '05' } });
    expect(onValueChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenLastCalledWith(10, '10');
  });

  it('restores the previous value when left empty on blur (never NaN)', () => {
    const onValueChange = vi.fn();
    render(<Harness initial={7} ignoreNull onValueChange={onValueChange} />);
    const input = screen.getByTestId('num') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(input.value).toBe('7');
    for (const call of onValueChange.mock.calls) {
      expect(Number.isNaN(call[0])).toBe(false);
    }
  });

  it('rounds integer fields on blur', () => {
    const onValueChange = vi.fn();
    render(<Harness initial={2} integer onValueChange={onValueChange} />);
    const input = screen.getByTestId('num') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2.6' } });
    fireEvent.blur(input);
    expect(input.value).toBe('3');
    expect(onValueChange).toHaveBeenLastCalledWith(3, '3');
  });

  it('emits null for unparseable text and restores the value on blur', () => {
    const onValueChange = vi.fn();
    render(<Harness initial={4} ignoreNull onValueChange={onValueChange} />);
    const input = screen.getByTestId('num') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(onValueChange).toHaveBeenLastCalledWith(null, 'abc');
    fireEvent.blur(input);
    expect(input.value).toBe('4');
    // Unparseable blur must not emit any number.
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('respects min/max as DOM attributes', () => {
    render(<Harness initial={5} min={1} max={99} integer />);
    const input = screen.getByTestId('num') as HTMLInputElement;
    expect(input.getAttribute('min')).toBe('1');
    expect(input.getAttribute('max')).toBe('99');
  });
});
