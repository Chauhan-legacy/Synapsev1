import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
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
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('SYNAPSE Caught View Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '#/overview';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-6 bg-[#FFFDF9] border border-[#E6DFC6] rounded-xl font-mono text-xs text-[#1F2430] space-y-4 shadow-sm m-4">
          <div className="w-12 h-12 rounded-full bg-[#FEF3C7] border border-[#F59E0B]/30 flex items-center justify-center text-[#B45309]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1 max-w-md">
            <h3 className="font-bold text-sm text-[#1F2430]">
              {this.props.fallbackTitle || 'Analytical Module Recovered'}
            </h3>
            <p className="text-[11px] text-[#6B6F7B]">
              The current dataset or view encountered a formatting exception during rendering.
            </p>
            {this.state.error && (
              <pre className="p-2.5 rounded bg-[#F7F0D6] border border-[#DDD6C7] text-left text-[10px] text-red-700 overflow-x-auto max-h-32">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0F766E] hover:bg-[#0B5E58] text-white font-bold transition shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset View &amp; Baseline</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
