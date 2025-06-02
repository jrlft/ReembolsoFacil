import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode; // Componente de fallback opcional
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: undefined,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Atualiza o estado para que a próxima renderização mostre a UI de fallback.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Você também pode registrar o erro em um serviço de logging de erros
    console.error("Uncaught error:", error, errorInfo);
    // Exemplo: logErrorToMyService(error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // Você pode renderizar qualquer UI de fallback customizada
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 text-red-700 p-4">
          <h1 className="text-2xl font-bold mb-4">Oops! Algo deu errado.</h1>
          <p className="mb-2">Nossa equipe foi notificada e estamos trabalhando para corrigir.</p>
          <p className="mb-4">Por favor, tente atualizar a página ou volte mais tarde.</p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 p-4 bg-red-100 border border-red-300 rounded w-full max-w-2xl text-left">
              <summary className="font-semibold cursor-pointer">Detalhes do Erro (Desenvolvimento)</summary>
              <pre className="mt-2 text-sm whitespace-pre-wrap">
                {this.state.error.toString()}
                {this.state.error.stack && `\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Atualizar Página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;