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
          <div className="bg-card border border-border/60 p-6 rounded-lg shadow-xl max-w-md mx-4 text-center">
            <div className="flex items-center gap-3 justify-center mb-4">
              <XCircle className="h-6 w-6 text-red-500" />
              <h3 className="font-semibold text-foreground">
                {this.props.title || "Something went wrong"}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              An unexpected error occurred while rendering this section. You can refresh the page or try again.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
              >
                Refresh Page
              </button>
              {this.props.onRetry && (
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-muted text-foreground rounded hover:bg-muted/80 shadow-sm hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
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
