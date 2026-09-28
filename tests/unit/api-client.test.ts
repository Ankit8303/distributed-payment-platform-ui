import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError, ApiNetworkError, ApiTimeoutError, apiFetch, registerAuthRefreshHandler,
} from "@/lib/api/client";
import { tokenStorage } from "@/lib/auth/token-storage";

const fetchMock = vi.fn();

function response(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch Phase 3 reliability", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
    tokenStorage.clear();
    registerAuthRefreshHandler(null);
  });

  it("injects the current access token and correlation id", async () => {
    tokenStorage.setAccessToken("access-old");
    fetchMock.mockResolvedValueOnce(response(200, { ok: true }));
    await expect(apiFetch<{ ok: boolean }>("/api/v1/test")).resolves.toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0];
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer access-old");
    expect(new Headers(init.headers).get("X-Correlation-ID")).toBeTruthy();
  });

  it("refreshes once and retries a safe request after 401", async () => {
    tokenStorage.setAccessToken("access-old");
    fetchMock
      .mockResolvedValueOnce(response(401, {
        status: 401, title: "Unauthorized", detail: "expired", errorCode: "UNAUTHORIZED",
      }))
      .mockResolvedValueOnce(response(200, { ok: true }));

    const refresh = vi.fn(async () => {
      tokenStorage.setAccessToken("access-new");
      return true;
    });
    registerAuthRefreshHandler(refresh);

    await expect(apiFetch<{ ok: boolean }>("/api/v1/accounts/me")).resolves.toEqual({ ok: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, retryInit] = fetchMock.mock.calls[1];
    expect(new Headers(retryInit.headers).get("Authorization")).toBe("Bearer access-new");
  });

  it("deduplicates concurrent safe-request refresh callbacks", async () => {
    tokenStorage.setAccessToken("access-old");
    fetchMock
      .mockResolvedValueOnce(response(401, {
        status: 401, title: "Unauthorized", detail: "expired", errorCode: "UNAUTHORIZED",
      }))
      .mockResolvedValueOnce(response(401, {
        status: 401, title: "Unauthorized", detail: "expired", errorCode: "UNAUTHORIZED",
      }))
      .mockResolvedValueOnce(response(200, { id: 1 }))
      .mockResolvedValueOnce(response(200, { id: 2 }));

    let resolveRefresh: ((value: boolean) => void) | undefined;
    const refreshPromise = new Promise<boolean>((resolve) => {
      resolveRefresh = resolve;
    });
    const refresh = vi.fn(() => refreshPromise.then((ok) => {
      tokenStorage.setAccessToken("access-new");
      return ok;
    }));
    registerAuthRefreshHandler(refresh);

    const first = apiFetch<{ id: number }>("/api/v1/accounts/1");
    const second = apiFetch<{ id: number }>("/api/v1/accounts/2");

    resolveRefresh?.(true);

    await expect(Promise.all([first, second])).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("does not retry a financial mutation after 401", async () => {
    tokenStorage.setAccessToken("access-old");
    fetchMock.mockResolvedValueOnce(response(401, {
      status: 401, title: "Unauthorized", detail: "expired", errorCode: "UNAUTHORIZED",
    }));
    const refresh = vi.fn(async () => true);
    registerAuthRefreshHandler(refresh);

    await expect(apiFetch("/api/v1/payments", {
      method: "POST",
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
      body: JSON.stringify({ amountMinor: 100 }),
    })).rejects.toBeInstanceOf(ApiError);

    expect(refresh).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("preserves caller cancellation instead of translating it to a timeout", async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      })
    );
    const promise = apiFetch("/api/v1/slow", { signal: controller.signal, timeoutMs: 100 });
    controller.abort();
    await expect(promise).rejects.not.toBeInstanceOf(ApiTimeoutError);
  });

  it("raises ApiTimeoutError when the deadline expires", async () => {
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      })
    );
    await expect(apiFetch("/api/v1/slow", { timeoutMs: 5 })).rejects.toBeInstanceOf(ApiTimeoutError);
  });

  it("normalizes network failures with the request correlation id", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(apiFetch("/api/v1/unreachable")).rejects.toBeInstanceOf(ApiNetworkError);
  });

  it("does not refresh when the request explicitly opts out", async () => {
    fetchMock.mockResolvedValueOnce(response(401, {
      status: 401, title: "Unauthorized", detail: "expired", errorCode: "UNAUTHORIZED",
    }));
    const refresh = vi.fn(async () => true);
    registerAuthRefreshHandler(refresh);

    await expect(apiFetch("/api/v1/auth/refresh", {
      method: "POST", skipAuthRefresh: true,
    })).rejects.toBeInstanceOf(ApiError);
    expect(refresh).not.toHaveBeenCalled();
  });
});
