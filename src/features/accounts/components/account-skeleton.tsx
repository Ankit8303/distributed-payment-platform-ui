import React from 'react';

export const AccountSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm animate-pulse ${className}`}
    >
      <span className="sr-only">Loading account details...</span>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <div className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
          <div className="h-7 w-48 bg-zinc-300 dark:bg-zinc-700 rounded" />
        </div>
        <div className="h-6 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5">
        <div>
          <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
          <div className="h-5 w-12 bg-zinc-300 dark:bg-zinc-700 rounded" />
        </div>
        <div>
          <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
          <div className="h-5 w-28 bg-zinc-300 dark:bg-zinc-700 rounded" />
        </div>
        <div>
          <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
          <div className="h-5 w-32 bg-zinc-300 dark:bg-zinc-700 rounded" />
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between">
        <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded" />
        <div className="h-3 w-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
      </div>
    </div>
  );
};
