import React from 'react';

interface AccountEmptyStateProps {
  onActionClick?: () => void;
  className?: string;
}

export const AccountEmptyState: React.FC<AccountEmptyStateProps> = ({
  onActionClick,
  className = '',
}) => {
  return (
    <div
      role="region"
      aria-label="No Account Selected"
      className={`bg-zinc-50 dark:bg-zinc-900/50 border border-dashed border-zinc-300 dark:border-zinc-800 rounded-xl p-8 sm:p-12 text-center ${className}`}
    >
      <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 dark:text-zinc-400 mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
          />
        </svg>
      </div>

      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        No Account Selected
      </h3>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
        Please enter an authorized Account ID above or follow an authorized account link to view account details and operational status.
      </p>

      {onActionClick && (
        <button
          type="button"
          onClick={onActionClick}
          className="mt-5 inline-flex items-center min-h-[44px] px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded-lg"
        >
          Focus Account Lookup
        </button>
      )}
    </div>
  );
};
