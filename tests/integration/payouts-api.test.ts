import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPayout, getPayout } from "@/features/payouts/api/payouts-api";
import * as apiClient from "@/lib/api/client";
import type { PayoutResponse } from "@/types/payout";

describe("Payouts API Integration", () => {
  const validAccountId = "11111111-2222-3333-4444-555555555555";
  const validKey = "b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createPayout", () => {
    it("validates request schema before calling apiFetch", async () => {
      const apiFetchSpy = vi.spyOn(apiClient, "apiFetch");

      await expect(
        createPayout(
          { accountId: "not-a-uuid", amountMinor: 1000, currency: "USD" },
          validKey
        )
      ).rejects.toThrow("Invalid account ID format: must be UUID");

      expect(apiFetchSpy).not.toHaveBeenCalled();
    });

    it("validates UUID idempotency key before calling apiFetch", async () => {
      const apiFetchSpy = vi.spyOn(apiClient, "apiFetch");

      await expect(
        createPayout(
          { accountId: validAccountId, amountMinor: 1000, currency: "USD" },
          "not-a-uuid"
        )
      ).rejects.toThrow("Invalid idempotency key format: must be RFC 4122 v4 UUID");

      expect(apiFetchSpy).not.toHaveBeenCalled();
    });

    it("dispatches POST /api/v1/payouts with Idempotency-Key and payload without fee", async () => {
      const mockPayoutResponse: PayoutResponse = {
        payoutId: "payout-1234",
        accountId: validAccountId,
        amountMinor: 25000,
        currency: "USD",
        status: "SETTLED",
        providerReference: "disb_789",
        failureReason: null,
        createdAt: "2026-09-26T12:00:00Z",
      };

      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce(mockPayoutResponse);

      const requestPayload = {
        accountId: validAccountId,
        amountMinor: 25000,
        currency: "USD",
      };

      const result = await createPayout(requestPayload, validKey);

      expect(result).toEqual(mockPayoutResponse);
      expect(apiFetchSpy).toHaveBeenCalledWith("/api/v1/payouts", {
        method: "POST",
        idempotencyKey: validKey,
        correlationId: expect.any(String),
        body: JSON.stringify(requestPayload),
      });
    });
  });

  describe("getPayout", () => {
    it("dispatches GET /api/v1/payouts/{payoutId}", async () => {
      const mockPayout: PayoutResponse = {
        payoutId: "payout-1234",
        accountId: validAccountId,
        amountMinor: 25000,
        currency: "USD",
        status: "SETTLED",
        createdAt: "2026-09-26T12:00:00Z",
      };

      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce(mockPayout);

      const result = await getPayout("payout-1234");
      expect(result).toEqual(mockPayout);
      expect(apiFetchSpy).toHaveBeenCalledWith("/api/v1/payouts/payout-1234", {
        method: "GET",
        signal: undefined,
      });
    });
  });
});
