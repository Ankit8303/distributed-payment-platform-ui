'use client';

import React from 'react';
import { AdminHeader } from './admin-header';
import { AdminSidebar } from './admin-sidebar';
import { AdminBreadcrumbs } from './admin-breadcrumbs';

export { AdminHeader, AdminSidebar, AdminBreadcrumbs };

interface AdminNavProps {
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

/**
 * Top-level AdminNav coordinating header navigation for administrative views.
 */
export const AdminNav: React.FC<AdminNavProps> = ({
  onToggleMobileMenu,
  isMobileMenuOpen = false,
}) => {
  return (
    <AdminHeader
      onToggleMobileMenu={onToggleMobileMenu}
      isMobileMenuOpen={isMobileMenuOpen}
    />
  );
};
