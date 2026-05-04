// FRESCO — ErrorBoundary
// Catches render errors in the subtree. Without this, a thrown error during
// a state transition (e.g. deleting a workspace while in a session) unmounts
// the whole app and shows a blank screen — the error only surfaces in the
// console. With this, we show a recoverable fallback.

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
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

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console so we can see what actually happened
    // eslint-disable-next-line no-console
    console.error('[Fresco ErrorBoundary] caught render error:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-fresco-white px-6">
          <div className="max-w-md text-center">
            <p className="text-[10px] font-medium uppercase tracking-wider text-fresco-graphite-light mb-3">
              Something went wrong
            </p>
            <h1 className="text-fresco-2xl font-medium text-fresco-black mb-4 tracking-tight">
              The page hit an unexpected error.
            </h1>
            <p className="text-fresco-sm text-fresco-graphite-mid mb-6 leading-relaxed">
              This is a bug — your work is saved. Click below to return to the home screen.
              If this keeps happening, press the thumbs-down below Claude&apos;s response to report it.
            </p>
            {this.state.error?.message && (
              <details className="text-left mb-6 border border-fresco-border-light p-3">
                <summary className="cursor-pointer text-fresco-xs text-fresco-graphite-light">Technical detail</summary>
                <pre className="mt-2 text-[10px] text-fresco-graphite-mid whitespace-pre-wrap break-words">{this.state.error.message}</pre>
              </details>
            )}
            <button
              onClick={this.reset}
              className="fresco-btn"
            >
              Reload the home screen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
