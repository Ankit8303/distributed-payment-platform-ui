'use client';

import React, { useState } from 'react';
import { ProtectedRoute } from '@/components/layout/protected-route';
import { AdminHeader } from '@/components/admin/admin-header';
import { AdminSidebar } from '@/components/admin/admin-sidebar';
import { AdminBreadcrumbs } from '@/components/admin/admin-breadcrumbs';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <ProtectedRoute allowedRoles={['ADMIN', 'SYSTEM']}>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased">
        <AdminHeader
          isMobileMenuOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />

        <div className="flex-1 flex max-w-7xl w-full mx-auto">
          <AdminSidebar
            isOpen={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />

          <main
            id="admin-main-content"
            className="flex-1 p-4 sm:p-6 lg:p-8 focus:outline-none overflow-x-hidden min-h-[calc(100vh-4rem)]"
            tabIndex={-1}
          >
            <AdminBreadcrumbs />
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
