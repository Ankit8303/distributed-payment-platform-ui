/**
 * Secure Token Storage & Lifecycle Manager
 * Invariant:
 * 1. Access tokens are kept strictly IN-MEMORY.
 * 2. Refresh tokens are kept in sessionStorage (per-tab isolation, destroyed on tab close).
 * 3. Atomic single-flight refresh mutex prevents duplicate token consumption on concurrent 401s.
 */

let inMemoryAccessToken: string | null = null;
let activeRefreshPromise: Promise<string | null> | null = null;

const REFRESH_TOKEN_KEY = "dpp_rt";

export const tokenStorage = {
  getAccessToken(): string | null {
    return inMemoryAccessToken;
  },

  setAccessToken(token: string | null): void {
    inMemoryAccessToken = token;
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") {
      return null;
    }
    try {
      return window.sessionStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setRefreshToken(token: string | null): void {
    if (typeof window === "undefined") {
      return;
    }
    try {
      if (token) {
        window.sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
      } else {
        window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      }
    } catch {
      // Storage access blocked or restricted
    }
  },

  clear(): void {
    inMemoryAccessToken = null;
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(REFRESH_TOKEN_KEY);
      } catch {
        // Ignored
      }
    }
  },

  getActiveRefreshPromise(): Promise<string | null> | null {
    return activeRefreshPromise;
  },

  setActiveRefreshPromise(promise: Promise<string | null> | null): void {
    activeRefreshPromise = promise;
  },
};
