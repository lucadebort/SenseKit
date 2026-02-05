import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center shadow-sm mb-6 border border-red-100">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h1>
          <p className="text-slate-500 text-sm max-w-sm mx-auto leading-relaxed mb-6">
            An unexpected error occurred. Please try refreshing the page.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-xs font-mono mb-6 max-w-lg mx-auto border border-red-100 text-left overflow-auto max-h-48">
              <strong>Error:</strong> {this.state.error.message}
              {this.state.errorInfo && (
                <>
                  <br /><br />
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap text-[10px] mt-2">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </>
              )}
            </div>
          )}

          <button
            onClick={this.handleReset}
            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Return to Home
          </button>

          <div className="h-px w-12 bg-slate-200 mx-auto mt-8"></div>
          <p className="text-[10px] text-slate-400 mt-4">StakeMap &bull; 2026</p>
        </div>
      );
    }

    return this.props.children;
  }
}
