import React from 'react';
import { AlertCircle, X, HelpCircle } from 'lucide-react';

export interface FriendlyError {
  error: string;
  what_to_try?: string;
  module?: string;
}

interface ErrorToastProps {
  error: FriendlyError | string | null;
  onDismiss: () => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ error, onDismiss }) => {
  if (!error) return null;

  const errorMsg = typeof error === 'string' ? error : error.error;
  const whatToTry = typeof error === 'object' && error?.what_to_try ? error.what_to_try : null;
  const moduleName = typeof error === 'object' && error?.module ? error.module : null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-surface-base border border-red-500/30 rounded-lg shadow-xl shadow-red-500/10 p-4 transition-all animate-in fade-in slide-in-from-bottom-4"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded bg-red-500/10 text-red-500 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-mono uppercase tracking-wider text-red-500 font-semibold">
              Validation Notice {moduleName ? `• ${moduleName}` : ''}
            </h4>
            <button
              onClick={onDismiss}
              className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-surface-elevated transition-colors"
              aria-label="Dismiss error notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-1 text-sm text-text-primary font-medium break-words">
            {errorMsg}
          </p>

          {whatToTry && (
            <div className="mt-2.5 p-2 rounded bg-surface-elevated border border-border-subtle flex items-start gap-2">
              <HelpCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs text-text-secondary">
                <span className="font-semibold text-text-primary">What to try: </span>
                {whatToTry}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
