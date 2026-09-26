"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Global App Providers
 * Architectural Invariant: TanStack Query serves strictly as a client-side server-state cache.
 * The backend is the authority for financial state, and PostgreSQL is the financial source of truth.
 * The browser, React state, and TanStack Query cache are NEVER authoritative for financial state.
 */

export interface AppProvidersProps {
  children: React.ReactNode;
}

import { AuthProvider } from "@/features/auth/auth-context";

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            // CRITICAL: Financial mutations must never silently retry to prevent duplicate charges or operations
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
