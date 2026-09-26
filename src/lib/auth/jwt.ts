import type { UserRole } from "@/types/auth";

export interface DecodedJwtPayload {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Safely decodes the payload of a JWT without verifying the signature
 * (signature verification is strictly authoritative on the backend).
 */
export function decodeJwtPayload(token: string): DecodedJwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const payloadPart = parts[1];
    if (!payloadPart) {
      return null;
    }

    // Base64URL decode
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    const parsed = JSON.parse(jsonPayload) as Record<string, unknown>;

    if (typeof parsed.sub !== "string" || typeof parsed.role !== "string") {
      return null;
    }

    return {
      sub: parsed.sub,
      role: parsed.role as UserRole,
      iat: typeof parsed.iat === "number" ? parsed.iat : 0,
      exp: typeof parsed.exp === "number" ? parsed.exp : 0,
    };
  } catch {
    return null;
  }
}
