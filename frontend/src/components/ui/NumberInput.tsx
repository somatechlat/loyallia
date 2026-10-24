/**
 * NumberInput — controlled numeric input that accepts intermediate text states.
 *
 * Controlled numeric inputs that reject `NaN` on every keystroke make Backspace
 * dead: clearing the field emits `''` → `parseFloat('')` is `NaN` → `onChange`
 * never fires → the input snaps back to the previous value. This component
 * keeps the raw text as the source of truth while the user is typing (so "",
 * "-", "1." all render exactly as typed) and validates/clamps to [min, max] on
 * blur, so `NaN` is never written to parent state.
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface NumberInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'defaultValue' | 'onChange' | 'type' | 'min' | 'max'
  > {
  /** Current numeric value. `null`/`undefined` renders an empty field. */
  value: number | null | undefined;
  /**
   * Called on every edit with the parsed number (`null` while the text is
   * empty or not parseable yet), plus the raw text. Also called on blur with
   * the validated/clamped value.
   */
  onValueChange: (value: number | null, raw: string) => void;
  /** Minimum accepted value (clamped on blur). */
  min?: number;
  /** Maximum accepted value (clamped on blur). */
  max?: number;
  /** Round to whole numbers (parseInt semantics). */
  integer?: boolean;
}

/** Normalize a numeric value to the text shown in the input. */
function toRaw(value: number | null | undefined): string {
  return value == null || Number.isNaN(value) ? '' : String(value);
}

/**
 * @description Parse raw input text into a number (no clamping).
 * @param {string} raw - Raw text
 * @param {boolean} integer - Round to whole numbers
 * @returns {number | null} Parsed number, or null when empty/unparseable
 */
export function parseNumberInputRaw(raw: string, integer = false): number | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return integer ? Math.round(parsed) : parsed;
}

/**
 * @description Controlled numeric input with intermediate text states and
 * blur-time validation/clamping.
 * @param {NumberInputProps} props - Component props
 * @returns JSX.Element
 */
export function NumberInput({
  value,
  onValueChange,
  min,
  max,
  integer = false,
  onFocus,
  onBlur,
  ...rest
}: NumberInputProps) {
  const focusedRef = useRef(false);
  const [raw, setRaw] = useState(() => toRaw(value));

  // Sync from the parent value only while the user is NOT editing; otherwise
  // intermediate text ("", "-", "1.") would be clobbered on every keystroke.
  useEffect(() => {
    if (!focusedRef.current) {
      setRaw(toRaw(value));
    }
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setRaw(next);
      const parsed = parseNumberInputRaw(next, integer);
      if (parsed === null) {
        // Empty or not parseable yet ("", "-", "1.2.3") — parent may apply its
        // own fallback semantics. The raw text is kept either way.
        onValueChange(null, next);
        return;
      }
      // Out-of-range values are kept as text but NOT emitted (the established
      // contract: onChange only fires for in-range numbers); they are
      // validated and clamped on blur.
      if (min !== undefined && parsed < min) return;
      if (max !== undefined && parsed > max) return;
      onValueChange(parsed, next);
    },
    [onValueChange, integer, min, max]
  );

  const handleBlurInternal = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      focusedRef.current = false;
      const parsed = parseNumberInputRaw(raw, integer);
      if (parsed === null) {
        // Empty or unparseable → restore the last valid value. Never write NaN.
        setRaw(toRaw(value));
      } else {
        let clamped = parsed;
        if (min !== undefined) clamped = Math.max(min, clamped);
        if (max !== undefined) clamped = Math.min(max, clamped);
        setRaw(String(clamped));
        onValueChange(clamped, String(clamped));
      }
      onBlur?.(e);
    },
    [raw, integer, min, max, value, onValueChange, onBlur]
  );

  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      value={raw}
      min={min}
      max={max}
      onChange={handleChange}
      onFocus={(e) => {
        focusedRef.current = true;
        onFocus?.(e);
      }}
      onBlur={handleBlurInternal}
    />
  );
}

export default NumberInput;
