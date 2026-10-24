import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught Error in Component:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center border border-slate-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-800">
              অ্যাপ লোড করতে সাময়িক সমস্যা হয়েছে
            </h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              সিস্টেমের ডেটা পুনরুদ্ধার করতে নিচের বোতামে চাপ দিয়ে নতুন করে চালু করুন।
            </p>
            {this.state.errorMessage && (
              <p className="text-[10px] text-rose-500 bg-rose-50 p-2 rounded-lg mt-3 font-mono text-left break-all">
                {this.state.errorMessage}
              </p>
            )}
            <button
              onClick={this.handleReset}
              className="mt-4 w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>অ্যাপ পুনরায় লোড ও রিসেট করুন</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
