import React from 'react';
import { AccountResponse } from '@/types/account';
import { AccountStatusBadge } from './account-status-badge';

interface AccountCardProps {
  account: AccountResponse;
  className?: string;
}

export const AccountCard: React.FC<AccountCardProps> = ({ account, className = '' }) => {
  const formattedDate = new Date(account.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <section
      aria-labelledby={`account-heading-${account.accountId}`}
      className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
            Account Number
          </span>
          <h2
            id={`account-heading-${account.accountId}`}
            className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5"
          >
            {account.accountNumber}
          </h2>
        </div>
        <div>
          <AccountStatusBadge status={account.status} />
        </div>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-5">
        <div>
          <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Currency
          </dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {account.currency}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Account Type
          </dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {account.accountType}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Created Date
          </dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {formattedDate}
          </dd>
        </div>
      </dl>

      <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-mono">
        <span>Account ID:</span>
        <span className="select-all truncate max-w-[240px] sm:max-w-none">{account.accountId}</span>
      </div>
    </section>
  );
};
