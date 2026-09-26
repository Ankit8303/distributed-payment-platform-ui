'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { CustomerNav } from '@/components/navigation/customer-nav';
import { CustomerSidebar } from '@/components/navigation/customer-sidebar';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
        <CustomerNav
          isMobileMenuOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />

        <div className="flex-1 flex max-w-7xl w-full mx-auto">
          <CustomerSidebar
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />

          <main id="main-content" className="flex-1 p-4 sm:p-6 lg:p-8 focus:outline-none" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
