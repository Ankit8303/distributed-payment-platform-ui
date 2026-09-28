import { apiFetch } from "@/lib/api/client";
import type {
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
} from "@/types/auth";

/**
 * Register a new customer or merchant.
 * Note: ADMIN and SYSTEM roles are forbidden per frozen security rules.
 */
export async function registerApi(data: RegisterRequest): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: data.email.trim(),
      password: data.password,
      role: data.role.toUpperCase(),
    }),
  });
}

/**
 * Authenticate user credentials and retrieve access/refresh token pair.
 */
export async function loginApi(data: LoginRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: data.email.trim(),
      password: data.password,
    }),
  });
}

/**
 * Atomically rotate refresh token and issue new token pair.
 */
export async function refreshTokenApi(data: RefreshTokenRequest): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify(data),
    skipAuthRefresh: true,
  });
}
