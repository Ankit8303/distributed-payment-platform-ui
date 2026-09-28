"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import {
  extractSafeDetails,
  type BoundaryError,
} from "@/components/feedback/error-boundary-view";
import { reportTelemetry } from "@/lib/telemetry/report";

export interface GlobalErrorProps {
  error: BoundaryError;
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    reportTelemetry({
      type: "client_error",
      message: error.message || "Global application error",
      errorName: error.name,
      correlationId: error.correlationId,
      status: error.status,
    });

    if (process.env.NODE_ENV === "development") {
      console.error("[GlobalError Boundary Captured]:", error.name, error.message);
    }
  }, [error]);

  const { title, detail, status, correlationId } = extractSafeDetails(
    error,
    "Critical Application Error"
  );

  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#090d16] text-slate-100 min-h-screen flex items-center justify-center p-4">
        <main
          role="alert"
          aria-live="assertive"
          data-testid="global-error-container"
          className="max-w-lg w-full rounded-2xl border border-rose-900/60 bg-rose-950/40 p-6 sm:p-8 text-rose-200 shadow-xl backdrop-blur-sm"
        >
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl bg-rose-900/50 border border-rose-800/80 flex items-center justify-center flex-shrink-0 text-rose-400"
              aria-hidden="true"
            >
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  data-testid="global-error-heading"
                  className="text-xl font-bold tracking-tight text-rose-100"
                >
                  {title}
                </h1>
                {status && (
                  <span
                    data-testid="global-error-status-badge"
                    className="text-xs px-2 py-0.5 rounded bg-rose-900/60 border border-rose-800 text-rose-300 font-mono"
                  >
                    HTTP {status}
                  </span>
                )}
              </div>

              <p
                data-testid="global-error-message"
                className="text-sm text-rose-300 leading-relaxed"
              >
                {detail}
              </p>

              {correlationId && (
                <div
                  data-testid="error-reference-id"
                  className="pt-1 text-xs text-rose-400 font-mono"
                >
                  Reference ID: {correlationId}
                </div>
              )}

              <div className="pt-4 flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={reset}
                  data-testid="global-error-reset-button"
                  aria-label="Try again to reload application"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-rose-800 hover:bg-rose-700 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Try Again</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.location.href = "/";
                    }
                  }}
                  data-testid="global-error-home-button"
                  aria-label="Return to application home"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
                >
                  <span>Return Home</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
