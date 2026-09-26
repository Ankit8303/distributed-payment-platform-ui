"use client";

import React from "react";
import { WifiOff, CheckCircle2 } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";

/**
 * Browser Connectivity Indicator.
 *
 * Requirements:
 * - Represents CLIENT connectivity only (never claims backend or server status).
 * - Non-blocking (pointer-events-none container).
 * - Screen-reader accessible (role="status", aria-live="polite").
 * - Does NOT steal focus or trap focus.
 * - Does NOT trigger or replay financial mutations on reconnect.
 */
export function NetworkStatusIndicator() {
  const { isOffline, showRestored, dismissRestored } = useNetworkStatus();

  if (!isOffline && !showRestored) {
    return null;
  }

  if (isOffline) {
    return (
      <aside
        role="status"
        aria-live="polite"
        data-testid="network-offline-indicator"
        aria-label="Network offline indicator"
        className="pointer-events-none fixed top-4 left-0 right-0 z-50 flex justify-center px-4"
      >
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-amber-600/50 bg-amber-950/90 px-4 py-2.5 text-xs sm:text-sm font-medium text-amber-200 shadow-xl backdrop-blur-md">
          <WifiOff className="h-4 w-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
          <span>You appear to be offline. Some actions may be unavailable.</span>
        </div>
      </aside>
    );
  }

  if (showRestored) {
    return (
      <aside
        role="status"
        aria-live="polite"
        data-testid="network-restored-indicator"
        aria-label="Network connection restored indicator"
        className="pointer-events-none fixed top-4 left-0 right-0 z-50 flex justify-center px-4"
      >
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-emerald-600/50 bg-emerald-950/90 px-4 py-2.5 text-xs sm:text-sm font-medium text-emerald-200 shadow-xl backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" aria-hidden="true" />
          <span>Connection restored.</span>
          <button
            type="button"
            onClick={dismissRestored}
            aria-label="Dismiss connection notification"
            data-testid="network-restored-dismiss"
            className="ml-2 text-xs text-emerald-400 hover:text-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1 focus:ring-offset-zinc-950 rounded px-1.5 py-0.5 transition-colors"
          >
            ×
          </button>
        </div>
      </aside>
    );
  }

  return null;
}
