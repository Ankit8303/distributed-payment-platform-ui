'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/auth-context';
import { Menu, X, Shield, Terminal, LogOut } from 'lucide-react';

interface AdminHeaderProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-zinc-900/95 text-zinc-100 backdrop-blur border-b border-zinc-800">
      <a
        href="#admin-main-content"
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
              aria-controls="admin-sidebar-nav"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="lg:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" aria-hidden="true" />
              ) : (
                <Menu className="w-6 h-6" aria-hidden="true" />
              )}
            </button>
          )}

          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2.5 font-bold text-lg text-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm" aria-hidden="true">
              PL
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-white">Payment Platform</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono uppercase font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                <Shield className="w-3 h-3" aria-hidden="true" />
                Ops
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden sm:flex flex-col items-end text-right">
              <span className="text-xs font-semibold text-zinc-200">
                {user.email}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {user.role === 'SYSTEM' ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono tracking-wider uppercase font-semibold bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
                    <Terminal className="w-2.5 h-2.5" aria-hidden="true" />
                    ROLE_SYSTEM
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-mono tracking-wider uppercase font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                    <Shield className="w-2.5 h-2.5" aria-hidden="true" />
                    ROLE_ADMIN
                  </span>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={logout}
            aria-label="Sign out of administrative session"
            className="min-h-[44px] px-3.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/90 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
