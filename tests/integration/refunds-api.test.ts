import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createRefund,
  getRefund,
  createReversal,
  getReversal,
} from "@/features/refunds/api/refunds-api";
import * as apiClient from "@/lib/api/client";
import type { RefundResponse } from "@/types/refund";
import type { ReversalResponse } from "@/types/reversal";

describe("Refunds & Reversals API Integration", () => {
  const validPaymentId = "11111111-2222-3333-4444-555555555555";
  const validKey = "a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("createRefund", () => {
    it("validates request schema before calling apiFetch", async () => {
      const apiFetchSpy = vi.spyOn(apiClient, "apiFetch");

      await expect(
        createRefund(validPaymentId, { amountMinor: 0 }, validKey)
      ).rejects.toThrow("Refund amount must be strictly positive");

      expect(apiFetchSpy).not.toHaveBeenCalled();
    });

    it("validates UUID idempotency key format", async () => {
      const apiFetchSpy = vi.spyOn(apiClient, "apiFetch");

      await expect(
        createRefund(validPaymentId, { amountMinor: 1000 }, "invalid-key")
      ).rejects.toThrow("Invalid idempotency key format: must be RFC 4122 v4 UUID");

      expect(apiFetchSpy).not.toHaveBeenCalled();
    });

    it("dispatches POST /api/v1/payments/{paymentId}/refunds with Idempotency-Key header", async () => {
      const mockRefundResponse: RefundResponse = {
        refundId: "ref-9999",
        paymentId: validPaymentId,
        amountMinor: 1500,
        currency: "USD",
        status: "SETTLED",
        reason: "Customer return",
        providerReference: "prov-123",
        compensatingLedgerTransactionId: "comp-456",
        failureReason: null,
        createdAt: "2026-09-26T12:00:00Z",
      };

      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce(mockRefundResponse);

      const result = await createRefund(
        validPaymentId,
        { amountMinor: 1500, reason: "Customer return" },
        validKey
      );

      expect(result).toEqual(mockRefundResponse);
      expect(apiFetchSpy).toHaveBeenCalledWith(
        `/api/v1/payments/${validPaymentId}/refunds`,
        expect.objectContaining({
          method: "POST",
          idempotencyKey: validKey,
          body: JSON.stringify({ amountMinor: 1500, reason: "Customer return" }),
        })
      );
    });
  });

  describe("getRefund", () => {
    it("dispatches GET /api/v1/refunds/{refundId}", async () => {
      const mockRefund: RefundResponse = {
        refundId: "ref-9999",
        paymentId: validPaymentId,
        amountMinor: 1500,
        currency: "USD",
        status: "SETTLED",
        createdAt: "2026-09-26T12:00:00Z",
      };

      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce(mockRefund);

      const result = await getRefund("ref-9999");
      expect(result).toEqual(mockRefund);
      expect(apiFetchSpy).toHaveBeenCalledWith("/api/v1/refunds/ref-9999", {
        method: "GET",
        signal: undefined,
      });
    });
  });

  describe("createReversal", () => {
    it("validates mandatory reason before calling apiFetch", async () => {
      const apiFetchSpy = vi.spyOn(apiClient, "apiFetch");

      await expect(
        createReversal(validPaymentId, { reason: "" }, validKey)
      ).rejects.toThrow("A reason must be provided to reverse this payment");

      expect(apiFetchSpy).not.toHaveBeenCalled();
    });

    it("dispatches POST /api/v1/payments/{paymentId}/reversal", async () => {
      const mockReversal: ReversalResponse = {
        reversalId: "rev-8888",
        paymentId: validPaymentId,
        amountMinor: 5000,
        currency: "USD",
        status: "COMPLETED",
        reason: "Duplicate charge",
        createdAt: "2026-09-26T12:00:00Z",
      };

      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce(mockReversal);

      const result = await createReversal(
        validPaymentId,
        { reason: "Duplicate charge" },
        validKey
      );

      expect(result).toEqual(mockReversal);
      expect(apiFetchSpy).toHaveBeenCalledWith(
        `/api/v1/payments/${validPaymentId}/reversal`,
        expect.objectContaining({
          method: "POST",
          idempotencyKey: validKey,
          body: JSON.stringify({ reason: "Duplicate charge" }),
        })
      );
    });
  });

  describe("getReversal", () => {
    it("dispatches GET /api/v1/reversals/{reversalId}", async () => {
      const mockReversal: ReversalResponse = {
        reversalId: "rev-8888",
        paymentId: validPaymentId,
        amountMinor: 5000,
        currency: "USD",
        status: "COMPLETED",
        reason: "Duplicate charge",
        createdAt: "2026-09-26T12:00:00Z",
      };

      const apiFetchSpy = vi
        .spyOn(apiClient, "apiFetch")
        .mockResolvedValueOnce(mockReversal);

      const result = await getReversal("rev-8888");
      expect(result).toEqual(mockReversal);
      expect(apiFetchSpy).toHaveBeenCalledWith("/api/v1/reversals/rev-8888", {
        method: "GET",
        signal: undefined,
      });
    });
  });
});
