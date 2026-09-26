'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-context';
import { useAccount } from '@/features/accounts/hooks/use-account';
import { AccountCard } from '@/features/accounts/components/account-card';
import { AccountLookupForm } from '@/features/accounts/components/account-lookup-form';
import { AccountSkeleton } from '@/features/accounts/components/account-skeleton';
import { AccountEmptyState } from '@/features/accounts/components/account-empty-state';
import { AccountErrorState } from '@/features/accounts/components/account-error-state';

function DashboardContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const accountIdParam = searchParams.get('accountId') ?? '';
  const { data: account, isLoading, error, refetch } = useAccount(accountIdParam);

  const handleLookup = (id: string) => {
    router.push(`/accounts/${id}`);
  };

  return (
    <div className="space-y-8">
      {/* Header section with Single h1 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
          Customer Dashboard
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back, <span className="font-semibold text-zinc-800 dark:text-zinc-200">{user?.email}</span>. Manage your account settings and operational status.
        </p>
      </div>

      {/* Account Overview section */}
      <section aria-labelledby="active-account-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="active-account-heading" className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            Account Overview
          </h2>
          {accountIdParam && (
            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              Param: {accountIdParam.slice(0, 8)}...
            </span>
          )}
        </div>

        {accountIdParam ? (
          isLoading ? (
            <AccountSkeleton />
          ) : error ? (
            <AccountErrorState error={error} onRetry={() => refetch()} />
          ) : account ? (
            <AccountCard account={account} />
          ) : (
            <AccountEmptyState />
          )
        ) : (
          <AccountEmptyState
            onActionClick={() => {
              const input = document.getElementById('account-lookup-input');
              input?.focus();
            }}
          />
        )}
      </section>

      {/* Account Lookup Section */}
      <section aria-labelledby="account-lookup-heading" className="space-y-4">
        <h2 id="account-lookup-heading" className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Account Discovery & Inspection
        </h2>
        <AccountLookupForm onLookup={handleLookup} initialValue={accountIdParam} />
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 animate-pulse">
          <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded" />
          <AccountSkeleton />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
