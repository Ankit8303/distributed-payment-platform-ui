'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useAccount } from '@/features/accounts/hooks/use-account';
import { AccountCard } from '@/features/accounts/components/account-card';
import { AccountSkeleton } from '@/features/accounts/components/account-skeleton';
import { AccountErrorState } from '@/features/accounts/components/account-error-state';

interface AccountPageProps {
  params: Promise<{ id: string }>;
}

export default function AccountDetailPage({ params }: AccountPageProps) {
  const { id } = use(params);
  const { data: account, isLoading, error, refetch } = useAccount(id);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb / Back Link */}
      <nav aria-label="Breadcrumb">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded min-h-[44px]"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to Dashboard
        </Link>
      </nav>

      {/* Main heading: single h1 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Account Details
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 font-mono">
          ID: {id}
        </p>
      </div>

      {/* Detail Presentation */}
      <div className="mt-6">
        {isLoading ? (
          <AccountSkeleton />
        ) : error ? (
          <AccountErrorState error={error} onRetry={() => refetch()} />
        ) : account ? (
          <AccountCard account={account} />
        ) : null}
      </div>
    </div>
  );
}
