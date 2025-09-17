import React from "react";
import { XCircle } from "lucide-react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: any;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error } as ErrorBoundaryState;
  }

  componentDidCatch(error: any, info: any) {
    console.error("[ErrorBoundary]", error, info);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md mx-4 text-center">
            <div className="flex items-center gap-3 justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-500" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {this.props.title || "Something went wrong"}
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              An unexpected error occurred while rendering this section. You can refresh the page or try again.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 shadow-sm hover:shadow"
              >
                Refresh Page
              </button>
              {this.props.onRetry && (
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 shadow-sm hover:shadow"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children as any;
  }
}
