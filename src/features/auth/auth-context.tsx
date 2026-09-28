"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type {
  AuthUser, AuthStatus, AuthContextValue, LoginRequest, LoginResponse,
  RegisterRequest, RegisterResponse,
} from "@/types/auth";
import { loginApi, registerApi, refreshTokenApi } from "@/lib/auth/auth-api";
import { tokenStorage } from "@/lib/auth/token-storage";
import { decodeJwtPayload } from "@/lib/auth/jwt";
import { registerAuthRefreshHandler } from "@/lib/api/client";
import { logger } from "@/lib/telemetry/logger";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [accessToken, setAccessTokenState] = useState<string | null>(null);

  const applyAuthTokens = useCallback((tokens: LoginResponse, emailFallback?: string) => {
    tokenStorage.setAccessToken(tokens.accessToken);
    tokenStorage.setRefreshToken(tokens.refreshToken);
    setAccessTokenState(tokens.accessToken);
    const decoded = decodeJwtPayload(tokens.accessToken);
    if (decoded) {
      setUser({ id: decoded.sub, email: emailFallback || "user@platform.local", role: decoded.role });
      setStatus("authenticated");
    } else {
      logger.error("Failed to decode claims from backend access token");
      setStatus("unauthenticated");
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const rawRefreshToken = tokenStorage.getRefreshToken();
    if (!rawRefreshToken) {
      tokenStorage.clear();
      setAccessTokenState(null);
      setUser(null);
      setStatus("unauthenticated");
      return false;
    }

    const existingPromise = tokenStorage.getActiveRefreshPromise();
    if (existingPromise) return (await existingPromise) !== null;

    const refreshPromise = (async () => {
      try {
        const response = await refreshTokenApi({ refreshToken: rawRefreshToken });
        applyAuthTokens(response, user?.email);
        return response.accessToken;
      } catch (err) {
        logger.warn("Token refresh failed or token expired", {
          error: err instanceof Error ? err.message : "Unknown authentication error",
        });
        tokenStorage.clear();
        setAccessTokenState(null);
        setUser(null);
        setStatus("unauthenticated");
        return null;
      } finally {
        tokenStorage.setActiveRefreshPromise(null);
      }
    })();

    tokenStorage.setActiveRefreshPromise(refreshPromise);
    return (await refreshPromise) !== null;
  }, [applyAuthTokens, user?.email]);

  useEffect(() => {
    registerAuthRefreshHandler(refreshSession);
    return () => registerAuthRefreshHandler(null);
  }, [refreshSession]);

  useEffect(() => {
    let mounted = true;
    async function initSession() {
      const rt = tokenStorage.getRefreshToken();
      if (!rt) {
        if (mounted) setStatus("unauthenticated");
        return;
      }
      try {
        const success = await refreshSession();
        if (!success && mounted) setStatus("unauthenticated");
      } catch {
        if (mounted) setStatus("unauthenticated");
      }
    }
    initSession();
    return () => { mounted = false; };
  }, [refreshSession]);

  const login = useCallback(async (credentials: LoginRequest): Promise<LoginResponse> => {
    setStatus("loading");
    try {
      const response = await loginApi(credentials);
      applyAuthTokens(response, credentials.email);
      return response;
    } catch (err) {
      setStatus("unauthenticated");
      throw err;
    }
  }, [applyAuthTokens]);

  const register = useCallback(
    async (payload: RegisterRequest): Promise<RegisterResponse> => registerApi(payload),
    []
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setAccessTokenState(null);
    setUser(null);
    setStatus("unauthenticated");
    logger.info("User logged out; client session terminated");
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, accessToken, login, register, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
