/**
 * Authentication & Session Types
 * Compliant with frozen Spring Boot backend (`com.paymentledger.auth.*`).
 */

export type UserRole = "CUSTOMER" | "MERCHANT" | "ADMIN" | "SYSTEM";

export interface AuthUser {
  id: string; // UUID
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface RegisterRequest {
  email: string;
  password: string; // Must be at least 12 characters per backend @Size(min=12)
  role: "CUSTOMER" | "MERCHANT";
}

export interface RegisterResponse {
  userId: string;
  email: string;
  role: "CUSTOMER" | "MERCHANT";
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string; // "Bearer"
  expiresInSeconds: number; // typically 900
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  accessToken: string | null;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  register: (payload: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => void;
  refreshSession: () => Promise<boolean>;
}
