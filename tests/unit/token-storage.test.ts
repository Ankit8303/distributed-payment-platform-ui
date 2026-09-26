import { describe, it, expect, beforeEach } from "vitest";
import { tokenStorage } from "@/lib/auth/token-storage";

describe("tokenStorage", () => {
  beforeEach(() => {
    tokenStorage.clear();
  });

  it("stores and retrieves access token strictly in memory", () => {
    expect(tokenStorage.getAccessToken()).toBeNull();

    tokenStorage.setAccessToken("test-access-token-jwt");
    expect(tokenStorage.getAccessToken()).toBe("test-access-token-jwt");

    // Ensure access token is never written to sessionStorage or localStorage
    expect(window.sessionStorage.getItem("accessToken")).toBeNull();
    expect(window.localStorage.getItem("accessToken")).toBeNull();
  });

  it("stores and clears refresh token in sessionStorage", () => {
    expect(tokenStorage.getRefreshToken()).toBeNull();

    tokenStorage.setRefreshToken("test-refresh-uuid-1234");
    expect(tokenStorage.getRefreshToken()).toBe("test-refresh-uuid-1234");

    tokenStorage.clear();
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it("manages active refresh promise for single-flight deduplication", async () => {
    expect(tokenStorage.getActiveRefreshPromise()).toBeNull();

    const mockPromise = Promise.resolve("new-token");
    tokenStorage.setActiveRefreshPromise(mockPromise);

    expect(tokenStorage.getActiveRefreshPromise()).toBe(mockPromise);
    const result = await tokenStorage.getActiveRefreshPromise();
    expect(result).toBe("new-token");

    tokenStorage.setActiveRefreshPromise(null);
    expect(tokenStorage.getActiveRefreshPromise()).toBeNull();
  });
});
