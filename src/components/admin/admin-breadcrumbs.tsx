'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
  isCurrent: boolean;
}

const ROUTE_NAME_MAP: Record<string, string> = {
  admin: 'Operations',
  dashboard: 'Dashboard',
  payments: 'Payments',
  investigations: 'Investigations',
  refunds: 'Refunds',
  payouts: 'Payouts',
  reconciliation: 'Reconciliation',
  ledger: 'Ledger',
  transactions: 'Transactions',
  accounts: 'Accounts',
  adjustments: 'Adjustments',
  audit: 'Audit Logs',
  notifications: 'Notifications',
  users: 'Users',
  new: 'New',
};

export const AdminBreadcrumbs: React.FC = () => {
  const pathname = usePathname();

  if (!pathname || pathname === '/admin' || pathname === '/admin/dashboard') {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  let accumulatedPath = '';
  segments.forEach((segment, index) => {
    accumulatedPath += `/${segment}`;
    const isCurrent = index === segments.length - 1;
    const label = ROUTE_NAME_MAP[segment.toLowerCase()] || (
      // If segment is a UUID or identifier, truncate for presentation
      segment.length > 12 ? `${segment.slice(0, 8)}...` : segment
    );

    items.push({
      label,
      href: accumulatedPath,
      isCurrent,
    });
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
        <li>
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1 py-0.5"
            aria-label="Operations Dashboard"
          >
            <Home className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sr-only">Operations</span>
          </Link>
        </li>

        {items.map((item) => (
          <li key={item.href} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 text-zinc-400 dark:text-zinc-600 shrink-0" aria-hidden="true" />
            {item.isCurrent ? (
              <span
                aria-current="page"
                className="font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]"
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1 py-0.5 truncate max-w-[150px]"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
