"use client";

import { useState, useEffect, useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean") {
    return navigator.onLine;
  }
  return true;
}

function getServerSnapshot(): boolean {
  return true;
}

export interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  showRestored: boolean;
  dismissRestored: () => void;
}

/**
 * Hook providing browser network connectivity indication.
 * Strictly reflects browser client connectivity signals (`online` / `offline`).
 *
 * CRITICAL INVARIANTS:
 * - Does NOT trigger or retry financial mutations.
 * - Does NOT automatically replay payments, refunds, reversals, payouts, or adjustments.
 * - Does NOT regenerate idempotency keys.
 * - Cleans up event listeners and timers on unmount.
 */
export function useNetworkStatus(): NetworkStatus {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [showRestored, setShowRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestored(false);
      return undefined;
    }

    if (wasOffline) {
      setShowRestored(true);
      const timer = setTimeout(() => {
        setShowRestored(false);
      }, 4000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [isOnline, wasOffline]);

  const dismissRestored = () => setShowRestored(false);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    showRestored,
    dismissRestored,
  };
}
