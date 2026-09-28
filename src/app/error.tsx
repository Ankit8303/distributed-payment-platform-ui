"use client";

import React, { useEffect } from "react";
import { ErrorBoundaryView, type BoundaryError } from "@/components/feedback/error-boundary-view";
import { reportTelemetry } from "@/lib/telemetry/report";

export interface RootErrorProps {
  error: BoundaryError;
  reset: () => void;
}

export default function RootError({ error, reset }: RootErrorProps) {
  useEffect(() => {
    reportTelemetry({
      type: "client_error",
      message: error.message || "Root application error",
      errorName: error.name,
      correlationId: error.correlationId,
      status: error.status,
      path: typeof window !== "undefined" ? window.location.pathname : undefined,
    });

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
