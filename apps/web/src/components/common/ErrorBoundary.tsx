import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  resetKey?: any;
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

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '#/overview';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Parse stack to extract top file & line
      const stackLines = (this.state.error?.stack || '').split('\n').map((l) => l.trim());
      const firstSrcLine = stackLines.find((l) => l.includes('src/') || l.includes('.tsx') || l.includes('.ts'));
      const isDev = Boolean((import.meta as any).env?.DEV ?? (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production'));

      return (
        <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center p-6 bg-[#F7F5EF] border border-[#252925]/20 rounded-xl font-georgia text-xs text-[#252925] space-y-4 shadow-sm m-4 max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#E8412C]/10 border border-[#E8412C]/30 flex items-center justify-center text-[#E8412C]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="text-center space-y-1.5 w-full">
            <h3 className="font-bold text-base text-[#252925]">
              {this.props.fallbackTitle || 'Analytical Module Recovered'}
            </h3>
            <p className="text-xs text-[#252925]/70">
              The current dataset or view encountered a formatting exception during rendering.
            </p>
            {this.state.error && (
              <pre className="p-3 rounded-lg bg-[#FFFFFF] border border-[#252925]/20 text-left font-mono text-[11px] text-[#E8412C] font-semibold overflow-x-auto max-h-24 shadow-2xs">
                {this.state.error.message}
              </pre>
            )}

            {/* Dev Mode Source Location and Component Stack */}
            {isDev && (
              <details className="text-left bg-[#FFFFFF] border border-[#252925]/20 rounded-lg p-2.5 space-y-2 mt-2 shadow-2xs">
                <summary className="font-mono text-[10px] text-[#252925]/80 cursor-pointer flex items-center justify-between font-bold">
                  <span>Diagnostic Context (Dev Mode)</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#252925]/50" />
                </summary>
                {firstSrcLine && (
                  <div className="text-[10px] font-mono text-[#252925]/70 border-b border-[#252925]/10 pb-1.5">
                    <span className="font-bold text-[#252925]">Source Location: </span>
                    <span className="text-[#0F766E] font-semibold break-all">{firstSrcLine}</span>
                  </div>
                )}
                {this.state.errorInfo?.componentStack && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-[#252925]/70 font-mono">Component Stack:</div>
                    <pre className="p-2 rounded bg-[#F7F5EF] border border-[#252925]/10 text-[9px] font-mono text-[#252925]/80 overflow-x-auto max-h-36 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack.trim()}
                    </pre>
                  </div>
                )}
              </details>
            )}
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9CAF88] hover:bg-[#8A9C76] text-[#252925] border border-[#252925]/20 font-bold transition shadow-xs cursor-pointer font-georgia"
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
