"use client";

import React, { useEffect } from "react";
import { ErrorBoundaryView, type BoundaryError } from "@/components/feedback/error-boundary-view";

export interface RootErrorProps {
  error: BoundaryError;
  reset: () => void;
}

/**
 * Root Application Segment Error Boundary.
 *
 * Implements:
 * - Client component conforming to Next.js segment error boundary contract.
 * - Safe user-facing error presentation without leaking internal stack traces or secrets.
 * - Accessible heading and focusable controls.
 * - Safe manual recovery via reset() without automatic financial mutation replay.
 * - RFC 7807 problem detail and diagnostic correlation ID support.
 */
export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    // In production, avoid logging sensitive exception details or credentials
    if (process.env.NODE_ENV === "development") {
      console.error("[RootError Boundary Captured]:", error.name, error.message);
    }
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <ErrorBoundaryView
        error={error}
        reset={reset}
        scope="root"
        fallbackTitle="Something went wrong"
        dashboardHref="/dashboard"
      />
    </div>
  );
}
