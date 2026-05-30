import { Component, ErrorInfo, ReactNode } from 'react';

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
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8 text-white">
          <div className="max-w-2xl w-full bg-slate-800 rounded-2xl p-8 border border-red-500/30">
            <h1 className="text-2xl font-bold text-red-400 mb-4">¡Oops! Algo salió mal.</h1>
            <p className="text-slate-300 mb-6">
              El sistema encontró un error inesperado al renderizar la pantalla.
            </p>
            
            <div className="bg-slate-950 p-4 rounded-xl overflow-auto text-xs text-red-300 font-mono">
              <p className="font-bold mb-2">{this.state.error?.toString()}</p>
              <pre className="opacity-70 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
            </div>
            
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-red-600 hover:bg-red-500 rounded-xl font-semibold transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
