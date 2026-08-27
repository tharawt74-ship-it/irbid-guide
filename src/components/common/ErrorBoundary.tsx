import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#fdfcfb] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
          <div className="w-16 h-16 rounded-3xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 mb-4 shadow-sm">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-black text-[#2d2a26]">حدث خطأ أثناء تحميل الصفحة</h1>
          <p className="text-sm text-stone-500 max-w-md my-2 leading-relaxed">
            حدث خطأ غير متوقع في متصفحك أثناء معالجة البيانات. يمكنك إعادة تحديث الصفحة أو العودة للرئيسية.
          </p>
          {this.state.error && (
            <div className="bg-stone-100 text-stone-700 text-xs p-3 rounded-xl font-mono max-w-lg overflow-auto my-3 text-left dir-ltr">
              {this.state.error.toString()}
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-md hover:bg-[#143d24] transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>إعادة تحميل الصفحة</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
