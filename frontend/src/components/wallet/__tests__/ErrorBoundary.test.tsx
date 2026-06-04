/**
 * Unit tests for ErrorBoundary component.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('no-error')).toBeDefined();
  });

  it('shows fallback when error is thrown', () => {
    const { rerender } = render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Fallback</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    shouldThrow = true;
    rerender(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Fallback</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeDefined();
  });

  it('shows default error UI when no fallback is provided', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    shouldThrow = true;
    rerender(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText('Test render error')).toBeDefined();
    expect(screen.getByTestId('error-boundary-reset')).toBeDefined();
  });

  it('reset button re-renders children', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    shouldThrow = true;
    rerender(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('error-boundary-reset')).toBeDefined();

    shouldThrow = false;
    fireEvent.click(screen.getByTestId('error-boundary-reset'));

    expect(screen.getByTestId('no-error')).toBeDefined();
  });

  it('logs error to console', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    shouldThrow = true;
    rerender(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
