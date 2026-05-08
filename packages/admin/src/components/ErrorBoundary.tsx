import React, { Component, ReactNode } from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundaryBase extends Component<Props & WithTranslation, State> {
  constructor(props: Props & WithTranslation) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    const { t } = this.props;

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-xl font-semibold">{t('error.somethingWentWrong')}</h2>
          </div>
          <p className="text-gray-600 mb-6 text-center max-w-md">
            {this.state.error?.message || t('error.unexpectedError')}
          </p>
          <Button onClick={this.handleReload} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            {t('error.reloadPage')}
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryBase);
