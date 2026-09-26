'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/auth-context';

interface CustomerNavProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const CustomerNav: React.FC<CustomerNavProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border-b border-zinc-200 dark:border-zinc-800">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-md focus:shadow-md"
      >
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-customer-sidebar"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="lg:hidden p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
                aria-hidden="true"
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                )}
              </svg>
            </button>
          )}

          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-bold text-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">
              PL
            </div>
            <span>Payment Platform</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                {user.email}
              </span>
              <span className="text-[10px] font-mono tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
                {user.role}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={logout}
            aria-label="Sign out of your account"
            className="min-h-[44px] px-3.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
};
