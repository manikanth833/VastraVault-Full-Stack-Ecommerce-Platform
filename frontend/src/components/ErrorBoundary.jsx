import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Unhandled React error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const showDebug = import.meta.env.DEV;

    return (
      <div className="min-h-screen flex items-center justify-center bg-charcoal-50 px-6 py-16">
        <div className="w-full max-w-2xl rounded-3xl border border-rose-200 bg-white shadow-2xl p-8 sm:p-10 space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-rose-700">Application Error</p>
            <h1 className="font-serif text-3xl font-bold text-charcoal-900">
              Something went wrong while loading this page.
            </h1>
            <p className="text-sm text-charcoal-600">
              Reload the page and try again. If the problem continues, the app hit an unexpected runtime error.
            </p>
          </div>

          <button
            onClick={this.handleReload}
            className="inline-flex items-center justify-center rounded-full bg-royal-red-900 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-royal-red-800"
          >
            Reload Page
          </button>

          {showDebug && this.state.error && (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{this.state.error.message}</p>
              <pre className="overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-700">
                {this.state.error.stack}
                {this.state.errorInfo?.componentStack}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }
}
