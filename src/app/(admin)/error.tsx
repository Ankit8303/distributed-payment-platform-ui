"use client";

import React, { useEffect } from "react";
import { ErrorBoundaryView, type BoundaryError } from "@/components/feedback/error-boundary-view";
import { reportTelemetry } from "@/lib/telemetry/report";

export interface AdminErrorProps {
  error: BoundaryError;
  reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    reportTelemetry({
      type: "client_error",
      message: error.message || "Administrative application error",
      errorName: error.name,
      correlationId: error.correlationId,
      status: error.status,
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
    });

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
