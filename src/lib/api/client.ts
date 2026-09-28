import { env } from "@/config/env";
import type { ApiErrorResponse } from "@/types/api";
import { tokenStorage } from "@/lib/auth/token-storage";
import { reportTelemetry } from "@/lib/telemetry/report";

const DEFAULT_TIMEOUT_MS = 20_000;
const SAFE_RETRY_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

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

export class ApiTimeoutError extends Error {
  public readonly correlationId: string;
  constructor(correlationId: string, timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "ApiTimeoutError";
    this.correlationId = correlationId;
  }
}

export class ApiNetworkError extends Error {
  public readonly correlationId: string;
  constructor(correlationId: string, cause?: unknown) {
    super("Unable to reach the API. Please check your network connection and try again.");
    this.name = "ApiNetworkError";
    this.correlationId = correlationId;
    if (cause !== undefined) this.cause = cause;
  }
}

export interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  correlationId?: string;
  token?: string;
  timeoutMs?: number;
  skipAuthRefresh?: boolean;
}

type AuthRefreshHandler = () => Promise<boolean>;
let authRefreshHandler: AuthRefreshHandler | null = null;
let activeAuthRefreshPromise: Promise<boolean> | null = null;

export function registerAuthRefreshHandler(handler: AuthRefreshHandler | null): void {
  authRefreshHandler = handler;
  if (!handler) activeAuthRefreshPromise = null;
}

async function runAuthRefreshOnce(): Promise<boolean> {
  if (!authRefreshHandler) return false;
  if (activeAuthRefreshPromise) return activeAuthRefreshPromise;

  activeAuthRefreshPromise = authRefreshHandler().finally(() => {
    activeAuthRefreshPromise = null;
  });

  return activeAuthRefreshPromise;
}

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

function isSafeRetryMethod(method: string): boolean {
  return SAFE_RETRY_METHODS.has(method.toUpperCase());
}

function createRequestSignal(
  callerSignal: AbortSignal | null | undefined,
  timeoutMs: number
): { signal: AbortSignal; cleanup: () => void; timedOut: () => boolean } {
  const controller = new AbortController();
  let timedOut = false;

  const onCallerAbort = () => controller.abort(callerSignal?.reason);

  if (callerSignal) {
    if (callerSignal.aborted) controller.abort(callerSignal.reason);
    else callerSignal.addEventListener("abort", onCallerAbort, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    const reason =
      typeof DOMException !== "undefined"
        ? new DOMException("The request timed out", "TimeoutError")
        : Object.assign(new Error("The request timed out"), { name: "TimeoutError" });
    controller.abort(reason);
  }, timeoutMs);

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", onCallerAbort);
    },
  };
}

async function parseApiError(response: Response, correlationId: string): Promise<ApiError> {
  let errorData: ApiErrorResponse;
  try {
    errorData = await response.json();
  } catch {
    errorData = {
      type: "https://api.paymentledger.com/errors/HTTP_ERROR",
      title: response.statusText || "HTTP Error",
      status: response.status,
      detail: `Request failed with status code ${response.status}`,
      errorCode: "HTTP_ERROR",
      correlationId,
      timestamp: new Date().toISOString(),
    };
  }
  return new ApiError(errorData);
}

async function executeFetch(
  url: string,
  requestInit: RequestInit,
  correlationId: string,
  timeoutMs: number
): Promise<{ response: Response; retryable: boolean }> {
  const method = (requestInit.method || "GET").toUpperCase();
  const requestSignal = createRequestSignal(requestInit.signal, timeoutMs);

  try {
    const response = await fetch(url, {
      ...requestInit,
      signal: requestSignal.signal,
    });
    return { response, retryable: isSafeRetryMethod(method) };
  } catch (error) {
    if (requestSignal.timedOut()) throw new ApiTimeoutError(correlationId, timeoutMs);
    if (requestInit.signal?.aborted) throw error;
    throw new ApiNetworkError(correlationId, error);
  } finally {
    requestSignal.cleanup();
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const {
    idempotencyKey,
    correlationId,
    token,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    skipAuthRefresh = false,
    headers,
    signal,
    ...customConfig
  } = options;

  const resolvedCorrelationId = correlationId || generateCorrelationId();
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Accept", "application/json");
  requestHeaders.set("X-Correlation-ID", resolvedCorrelationId);

  if (idempotencyKey) requestHeaders.set("Idempotency-Key", idempotencyKey);

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

  try {
    const requestInit: RequestInit = { ...customConfig, headers: requestHeaders, signal };
    let result = await executeFetch(url, requestInit, resolvedCorrelationId, timeoutMs);

    if (
      result.response.status === 401 &&
      !skipAuthRefresh &&
      !token &&
      authRefreshHandler &&
      result.retryable
    ) {
      const refreshed = await runAuthRefreshOnce();
      if (refreshed) {
        const retryHeaders = new Headers(requestHeaders);
        const refreshedToken = tokenStorage.getAccessToken();
        if (refreshedToken) retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
        result = await executeFetch(
          url,
          { ...requestInit, headers: retryHeaders, signal },
          resolvedCorrelationId,
          timeoutMs
        );
      }
    }

    if (!result.response.ok) {
      throw await parseApiError(result.response, resolvedCorrelationId);
    }
    if (result.response.status === 204) return {} as T;
    return result.response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      reportTelemetry({
        type: "api_error",
        message: error.errorCode || error.message,
        errorName: error.name,
        correlationId: error.correlationId || resolvedCorrelationId,
        status: error.status,
        path: endpoint,
      });
    } else if (error instanceof ApiTimeoutError) {
      reportTelemetry({
        type: "api_timeout",
        message: error.message,
        errorName: error.name,
        correlationId: error.correlationId,
        path: endpoint,
      });
    } else if (error instanceof ApiNetworkError) {
      reportTelemetry({
        type: "api_network_error",
        message: error.message,
        errorName: error.name,
        correlationId: error.correlationId,
        path: endpoint,
      });
    } else if (
      !(error instanceof DOMException && error.name === "AbortError")
    ) {
      reportTelemetry({
        type: "client_error",
        message: error instanceof Error ? error.message : "Unexpected API client failure",
        errorName: error instanceof Error ? error.name : "UnknownError",
        correlationId: resolvedCorrelationId,
        path: endpoint,
      });
    }

    throw error;
  }
}
