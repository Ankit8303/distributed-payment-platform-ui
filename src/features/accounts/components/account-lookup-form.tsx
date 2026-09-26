'use client';

import React, { useState } from 'react';
import { isValidUuid } from '../api/accounts-api';

interface AccountLookupFormProps {
  onLookup: (accountId: string) => void;
  isLoading?: boolean;
  initialValue?: string;
  className?: string;
}

export const AccountLookupForm: React.FC<AccountLookupFormProps> = ({
  onLookup,
  isLoading = false,
  initialValue = '',
  className = '',
}) => {
  const [inputVal, setInputVal] = useState(initialValue);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputVal.trim();

    if (!trimmed) {
      setValidationError('Account ID is required.');
      return;
    }

    if (!isValidUuid(trimmed)) {
      setValidationError('Invalid format. Please enter a valid 36-character UUID (e.g. 123e4567-e89b-12d3-a456-426614174000).');
      return;
    }

    setValidationError(null);
    onLookup(trimmed);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm ${className}`}
      aria-label="Account Lookup Form"
    >
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="account-lookup-input"
          className="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
        >
          Query Account by ID
        </label>
        <p id="account-lookup-help" className="text-xs text-zinc-500 dark:text-zinc-400">
          Enter an authorized account UUID to view its details and current status.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <div className="relative flex-1">
            <input
              id="account-lookup-input"
              type="text"
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. a3b4c5d6-e7f8-4901-a234-56789abcdef0"
              aria-describedby={validationError ? 'account-lookup-error account-lookup-help' : 'account-lookup-help'}
              aria-invalid={validationError ? 'true' : 'false'}
              disabled={isLoading}
              className={`w-full font-mono text-sm px-4 py-2.5 rounded-lg border bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                validationError
                  ? 'border-red-500 dark:border-red-600 focus:ring-red-500'
                  : 'border-zinc-300 dark:border-zinc-700'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center min-h-[44px] min-w-[120px] px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                Loading...
              </span>
            ) : (
              'Inspect Account'
            )}
          </button>
        </div>

        {validationError && (
          <p
            id="account-lookup-error"
            role="alert"
            className="text-xs font-medium text-red-600 dark:text-red-400 mt-1"
          >
            {validationError}
          </p>
        )}
      </div>
    </form>
  );
};
