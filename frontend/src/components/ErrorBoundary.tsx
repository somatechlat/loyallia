'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { I18nContext } from '@/lib/i18n';

/**
 * Props for the ErrorBoundary component.
 */
interface Props {
  /** React children to render inside the boundary */
  children: ReactNode;
  /** Optional fallback UI to show when an error is caught */
  fallback?: ReactNode;
}

/**
 * State for the ErrorBoundary component.
 */
interface State {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The captured error object */
  error: Error | null;
}

/**
 * @description Catches JavaScript errors anywhere in its child component tree and displays a fallback UI.
 * @param {Props} props - Component props
 * @returns JSX.Element
 */
export class ErrorBoundary extends Component<Props, State> {
  static contextType = I18nContext;
  declare context: React.ContextType<typeof I18nContext>;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    /* Error reporting should go to a monitoring service (e.g., Sentry) in production */
  }

  render() {
    if (this.state.hasError) {
      const { t } = this.context || { t: (k: string) => k };
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('errorBoundary.title')}</h2>
            <p className="text-gray-600 mb-6">{t('errorBoundary.description')}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('errorBoundary.refreshButton')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
