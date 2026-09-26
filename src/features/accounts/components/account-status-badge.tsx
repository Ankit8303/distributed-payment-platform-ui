import React from 'react';
import { AccountStatus } from '@/types/account';

interface AccountStatusBadgeProps {
  status: AccountStatus;
  className?: string;
}

const statusConfig: Record<
  AccountStatus,
  { label: string; bg: string; text: string; border: string; description: string }
> = {
  ACTIVE: {
    label: 'Active',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    description: 'Account is operational and active.',
  },
  FROZEN: {
    label: 'Frozen',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    description: 'Account is temporarily frozen by the platform.',
  },
  CLOSED: {
    label: 'Closed',
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    text: 'text-zinc-700 dark:text-zinc-300',
    border: 'border-zinc-300 dark:border-zinc-700',
    description: 'Account has been closed.',
  },
  PENDING_VERIFICATION: {
    label: 'Pending Verification',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    description: 'Account is undergoing standard verification.',
  },
};

export const AccountStatusBadge: React.FC<AccountStatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status] ?? {
    label: status,
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    text: 'text-zinc-700 dark:text-zinc-300',
    border: 'border-zinc-300 dark:border-zinc-700',
    description: `Account status: ${status}`,
  };

  return (
    <span
      role="status"
      aria-label={`Account status: ${config.label}. ${config.description}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />
      {config.label}
    </span>
  );
};
