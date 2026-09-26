import React from 'react';
import { ApiError } from '@/lib/api/client';

interface AccountErrorStateProps {
  error: ApiError | Error | unknown;
  onRetry?: () => void;
  className?: string;
}

export const AccountErrorState: React.FC<AccountErrorStateProps> = ({
  error,
  onRetry,
  className = '',
}) => {
  let title = 'Error Loading Account';
  let message = 'An unexpected error occurred while loading account details.';
  let correlationId: string | undefined;

  if (error instanceof ApiError) {
    correlationId = error.correlationId;

    if (error.status === 404) {
      title = 'Account Not Found';
      message = 'The requested account could not be found or you do not have permission to view it.';
    } else if (error.status === 401) {
      title = 'Authentication Required';
      message = 'Your session may have expired. Please sign in again to access this account.';
    } else if (error.status === 403) {
      title = 'Access Denied';
      message = 'You do not have permission to access this resource.';
    } else if (error.status === 429) {
      title = 'Rate Limit Exceeded';
      message = 'Too many requests were sent in a short period. Please wait a moment before retrying.';
    } else if (error.status >= 500) {
      title = 'Service Unavailable';
      message = 'The account service is temporarily unavailable. Please try again later.';
    } else if (error.response?.detail) {
      message = error.response.detail;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-6 shadow-sm ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="text-base font-semibold text-red-900 dark:text-red-200">
            {title}
          </h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {message}
          </p>

          {correlationId && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400 font-mono">
              Correlation ID: <span className="select-all">{correlationId}</span>
            </p>
          )}

          {onRetry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center min-h-[44px] px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors"
              >
                Retry Request
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
