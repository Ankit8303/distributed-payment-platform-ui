import { describe, expect, it } from "vitest";
import { GET as getHealth } from "@/app/api/healthz/route";
import { GET as getReady } from "@/app/api/readyz/route";

describe("runtime health endpoints", () => {
  it("returns a non-cacheable liveness response", async () => {
    const response = getHealth();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "distributed-payment-platform-ui",
    });
  });

  it("returns a non-cacheable readiness response", async () => {
    const response = getReady();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      service: "distributed-payment-platform-ui",
    });
  });
});
