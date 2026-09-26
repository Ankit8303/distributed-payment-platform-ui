"use client";

import React, { useEffect } from "react";
import { ErrorBoundaryView, type BoundaryError } from "@/components/feedback/error-boundary-view";

export interface AdminErrorProps {
  error: BoundaryError;
  reset: () => void;
}

/**
 * Admin Segment Error Boundary.
 *
 * Implements:
 * - Next.js error boundary for all administrative routes under `src/app/(admin)`.
 * - Safe admin error presentation with zero sensitive system or confidential ledger data leakage.
 * - Does NOT bypass authentication or ProtectedRoute role enforcement.
 * - Does NOT automatically redirect unauthorized users into protected admin routes.
 * - Accessible heading, visible focus rings, and safe manual recovery via reset().
 * - RFC 7807 problem details and diagnostic correlation ID support.
 */
export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[AdminError Boundary Captured]:", error.name, error.message);
    }
  }, [error]);

  return (
    <div className="py-6 sm:py-10">
      <ErrorBoundaryView
        error={error}
        reset={reset}
        scope="admin"
        fallbackTitle="Administrative Operation Failed"
        dashboardHref="/admin/dashboard"
      />
    </div>
  );
}
