import { env } from "@/config/env";
import type { ApiErrorResponse } from "@/types/api";
import { tokenStorage } from "@/lib/auth/token-storage";

export class ApiError extends Error {
  public readonly status: number;
  public readonly errorCode: string;
  public readonly correlationId?: string;
  public readonly response: ApiErrorResponse;

  constructor(response: ApiErrorResponse) {
    super(response.detail || response.title || "An API error occurred");
    this.name = "ApiError";
    this.status = response.status;
    this.errorCode = response.errorCode;
    this.correlationId = response.correlationId;
    this.response = response;
  }
}

export interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  correlationId?: string;
  token?: string;
}

/**
 * Generate a random RFC 4122 v4 UUID.
 */
export function generateCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Foundation HTTP client wrapping fetch with RFC 7807 problem details parsing,
 * correlation tracking, and idempotency key injection.
 */
export async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { idempotencyKey, correlationId, token, headers, ...customConfig } = options;

  const resolvedCorrelationId = correlationId || generateCorrelationId();
  const requestHeaders = new Headers(headers);

  requestHeaders.set("Accept", "application/json");
  requestHeaders.set("X-Correlation-ID", resolvedCorrelationId);

  if (idempotencyKey) {
    requestHeaders.set("Idempotency-Key", idempotencyKey);
  }

  const resolvedToken = token || tokenStorage.getAccessToken();
  if (resolvedToken && !requestHeaders.has("Authorization")) {
    requestHeaders.set("Authorization", `Bearer ${resolvedToken}`);
  }

  if (customConfig.body && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${env.NEXT_PUBLIC_API_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const response = await fetch(url, {
    ...customConfig,
    headers: requestHeaders,
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        type: "https://api.paymentledger.com/errors/INTERNAL_SERVER_ERROR",
        title: response.statusText || "HTTP Error",
        status: response.status,
        detail: `Request failed with status code ${response.status}`,
        errorCode: "INTERNAL_SERVER_ERROR",
        correlationId: resolvedCorrelationId,
        timestamp: new Date().toISOString(),
      };
    }
    throw new ApiError(errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
