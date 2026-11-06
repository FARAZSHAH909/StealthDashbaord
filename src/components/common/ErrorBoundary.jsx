"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0c1317] flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#111b21] border border-rose-900/40 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Application Interface Notice</h2>
            <p className="text-xs text-[#8696a0] mb-4">
              A client component encountered an error during initialization:
            </p>
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono text-left mb-5 overflow-auto max-h-32">
              {this.state.error?.message || String(this.state.error)}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

