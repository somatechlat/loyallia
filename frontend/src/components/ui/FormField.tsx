import React from 'react';

/**
 * Props for the FormField wrapper component.
 */
interface FormFieldProps {
  /** Label text or element for the field */
  label: React.ReactNode;
  /** HTML id to associate with the label */
  htmlFor?: string;
  /** Error message to display below the field */
  error?: string;
  /** Hint text displayed below the field when there is no error */
  hint?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Form control element(s) to wrap */
  children: React.ReactNode;
}

/**
 * @description Wraps a form input with a label, error message, and hint text.
 * @param {FormFieldProps} props - Component props
 * @returns JSX.Element
 */
export default function FormField({ label, htmlFor, error, hint, required, children }: FormFieldProps) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      {hint && !error && <p className="text-surface-400 text-xs mt-1">{hint}</p>}
    </div>
  );
}
