/**
 * Error boundary for the Wallet Pass Studio subtree.
 *
 * Catches render errors, displays a friendly message, and allows reset.
 */

'use client';

import React from 'react';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('WalletStudio ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-8 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
          <div className="w-12 h-12 mb-4 text-red-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 text-center max-w-xs">
            An unexpected error occurred in the studio. You can try resetting the view.
          </p>
          {this.state.error && (
            <pre className="text-xs bg-neutral-100 dark:bg-neutral-900 p-3 rounded-md mb-4 max-w-xs overflow-auto text-red-600 dark:text-red-400">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            data-testid="error-boundary-reset"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
