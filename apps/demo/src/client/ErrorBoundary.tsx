import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#1f2937', 
          color: 'white',
          height: '100vh',
          overflow: 'auto'
        }}>
          <h1 style={{ color: '#ef4444' }}>Something went wrong</h1>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
            <summary>Error details</summary>
            <p style={{ color: '#f87171' }}>
              {this.state.error && this.state.error.toString()}
            </p>
            <pre style={{ color: '#fbbf24', fontSize: '12px' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}