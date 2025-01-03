import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Form error:', error);
    console.error('Error info:', errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-red-500 rounded bg-red-50">
          <h2 className="text-red-700 font-semibold mb-2">Something went wrong</h2>
          <p className="text-red-600">{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
