/**
 * Unit tests for ErrorBoundary component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { ErrorBoundary } from '@/components/wallet/studio/ErrorBoundary';

let shouldThrow = false;

function ThrowError() {
  if (shouldThrow) {
    throw new Error('Test render error');
  }
  return <div data-testid="no-error">Normal content</div>;
}

describe('ErrorBoundary', () => {
  const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    shouldThrow = false;
    vi.clearAllMocks();
  });

  afterEach(() => {
    shouldThrow = false;
    cleanup();
  });

  it('renders children when no error', () => {
    render(
      <I18nProvider>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </I18nProvider>
    );
    expect(screen.getByTestId('no-error')).toBeDefined();
  });

  it('shows fallback when error is thrown', () => {
    const { rerender } = render(
      <I18nProvider>
        <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Fallback</div>}>
          <ThrowError />
        </ErrorBoundary>
      </I18nProvider>
    );

    shouldThrow = true;
    rerender(
      <I18nProvider>
        <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Fallback</div>}>
          <ThrowError />
        </ErrorBoundary>
      </I18nProvider>
    );

    expect(screen.getByTestId('custom-fallback')).toBeDefined();
  });

  it('shows default error UI when no fallback is provided', () => {
    const { rerender } = render(
      <I18nProvider>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </I18nProvider>
    );

    shouldThrow = true;
    rerender(
      <I18nProvider>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </I18nProvider>
    );

    expect(screen.getByText('Algo salió mal')).toBeDefined();
    expect(screen.getByText('Test render error')).toBeDefined();
    expect(screen.getByTestId('error-boundary-reset')).toBeDefined();
  });

  it('reset button re-renders children', () => {
    const { rerender } = render(
      <I18nProvider>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </I18nProvider>
    );

    shouldThrow = true;
    rerender(
      <I18nProvider>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </I18nProvider>
    );

    expect(screen.getByTestId('error-boundary-reset')).toBeDefined();

    shouldThrow = false;
    fireEvent.click(screen.getByTestId('error-boundary-reset'));

    expect(screen.getByTestId('no-error')).toBeDefined();
  });

  it('logs error to console', () => {
    const { rerender } = render(
      <I18nProvider>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </I18nProvider>
    );

    shouldThrow = true;
    rerender(
      <I18nProvider>
        <ErrorBoundary>
          <ThrowError />
        </ErrorBoundary>
      </I18nProvider>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
