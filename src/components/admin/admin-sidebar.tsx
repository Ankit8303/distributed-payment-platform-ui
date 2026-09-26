'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CreditCard,
  SearchCode,
  RotateCcw,
  ArrowUpRight,
  GitCompare,
  BookOpen,
  Wallet,
  Scale,
  FileText,
  Bell,
  Users,
  X,
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: (props: { className?: string }) => React.ReactNode;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'OVERVIEW',
    items: [
      {
        name: 'Dashboard',
        href: '/admin/dashboard',
        icon: ({ className }) => <LayoutDashboard className={className} aria-hidden="true" />,
      },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      {
        name: 'Payments',
        href: '/admin/payments',
        icon: ({ className }) => <CreditCard className={className} aria-hidden="true" />,
      },
      {
        name: 'Investigations',
        href: '/admin/investigations',
        icon: ({ className }) => <SearchCode className={className} aria-hidden="true" />,
      },
      {
        name: 'Refunds',
        href: '/admin/refunds',
        icon: ({ className }) => <RotateCcw className={className} aria-hidden="true" />,
      },
      {
        name: 'Payouts',
        href: '/admin/payouts',
        icon: ({ className }) => <ArrowUpRight className={className} aria-hidden="true" />,
      },
      {
        name: 'Reconciliation',
        href: '/admin/reconciliation',
        icon: ({ className }) => <GitCompare className={className} aria-hidden="true" />,
      },
    ],
  },
  {
    title: 'ACCOUNTING',
    items: [
      {
        name: 'Ledger Journal',
        href: '/admin/ledger/transactions',
        icon: ({ className }) => <BookOpen className={className} aria-hidden="true" />,
      },
      {
        name: 'Accounts',
        href: '/admin/accounts',
        icon: ({ className }) => <Wallet className={className} aria-hidden="true" />,
      },
      {
        name: 'Financial Adjustments',
        href: '/admin/adjustments',
        icon: ({ className }) => <Scale className={className} aria-hidden="true" />,
      },
    ],
  },
  {
    title: 'PLATFORM GOVERNANCE',
    items: [
      {
        name: 'Audit Logs',
        href: '/admin/audit',
        icon: ({ className }) => <FileText className={className} aria-hidden="true" />,
      },
      {
        name: 'Notifications',
        href: '/admin/notifications',
        icon: ({ className }) => <Bell className={className} aria-hidden="true" />,
      },
      {
        name: 'User Directory',
        href: '/admin/users',
        icon: ({ className }) => <Users className={className} aria-hidden="true" />,
      },
    ],
  },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isOpen = false,
  onClose,
}) => {
  const pathname = usePathname();

  const renderNavContent = () => (
    <nav
      id="admin-sidebar-nav"
      aria-label="Admin Operations Navigation"
      className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-4rem)]"
    >
      {navGroups.map((group) => (
        <div key={group.title} className="space-y-1.5">
          <h2 className="px-3 text-[11px] font-mono tracking-wider text-zinc-400 dark:text-zinc-500 uppercase font-semibold">
            {group.title}
          </h2>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (pathname?.startsWith(item.href + '/') ?? false);

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[40px] ${
                      isActive
                        ? 'bg-emerald-950/40 text-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold border-l-2 border-emerald-500 pl-2.5'
                        : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                    }`}
                  >
                    {item.icon({
                      className: `w-4 h-4 shrink-0 ${
                        isActive ? 'text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'
                      }`,
                    })}
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        aria-label="Admin Navigation Sidebar"
        className="hidden lg:block w-64 border-r border-zinc-800 bg-zinc-900/95 dark:bg-zinc-900 shrink-0 min-h-[calc(100vh-4rem)] shadow-sm"
      >
        {renderNavContent()}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div
          id="mobile-admin-sidebar"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Admin Navigation Drawer"
          className="lg:hidden fixed inset-0 z-40 flex"
        >
          <div
            className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />

          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-zinc-900 border-r border-zinc-800 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <span className="font-semibold text-sm text-zinc-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Operations Console
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>
            {renderNavContent()}
          </div>
        </div>
      )}
    </>
  );
};
