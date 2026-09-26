import { describe, it, expect } from "vitest";
import { payoutCreateSchema, mapPayoutStatus } from "@/types/payout";

describe("Payout Types & Schemas", () => {
  describe("payoutCreateSchema", () => {
    it("validates a correct payout payload", () => {
      const validPayload = {
        accountId: "123e4567-e89b-12d3-a456-426614174000",
        amountMinor: 50000,
        currency: "USD",
      };

      const result = payoutCreateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amountMinor).toBe(50000);
        expect(result.data.currency).toBe("USD");
      }
    });

    it("rejects non-UUID accountId", () => {
      const invalid = {
        accountId: "not-a-uuid",
        amountMinor: 50000,
        currency: "USD",
      };
      expect(payoutCreateSchema.safeParse(invalid).success).toBe(false);
    });

    it("rejects non-positive amountMinor", () => {
      const zero = {
        accountId: "123e4567-e89b-12d3-a456-426614174000",
        amountMinor: 0,
        currency: "USD",
      };
      expect(payoutCreateSchema.safeParse(zero).success).toBe(false);

      const negative = {
        accountId: "123e4567-e89b-12d3-a456-426614174000",
        amountMinor: -100,
        currency: "USD",
      };
      expect(payoutCreateSchema.safeParse(negative).success).toBe(false);
    });

    it("rejects non-integer minor units", () => {
      const floatVal = {
        accountId: "123e4567-e89b-12d3-a456-426614174000",
        amountMinor: 100.5,
        currency: "USD",
      };
      expect(payoutCreateSchema.safeParse(floatVal).success).toBe(false);
    });

    it("rejects invalid currency codes", () => {
      const badCurrency = {
        accountId: "123e4567-e89b-12d3-a456-426614174000",
        amountMinor: 1000,
        currency: "US",
      };
      expect(payoutCreateSchema.safeParse(badCurrency).success).toBe(false);
    });
  });

  describe("mapPayoutStatus", () => {
    it("maps SETTLED to terminal success", () => {
      const info = mapPayoutStatus("SETTLED");
      expect(info.uiStatus).toBe("SETTLED");
      expect(info.variant).toBe("success");
      expect(info.isTerminal).toBe(true);
    });

    it("maps PENDING_RECONCILIATION to non-terminal warning", () => {
      const info = mapPayoutStatus("PENDING_RECONCILIATION");
      expect(info.uiStatus).toBe("PENDING_RECONCILIATION");
      expect(info.variant).toBe("warning");
      expect(info.isTerminal).toBe(false);
    });

    it("maps REQUESTED and PROCESSING to non-terminal info", () => {
      const req = mapPayoutStatus("REQUESTED");
      expect(req.uiStatus).toBe("PROCESSING");
      expect(req.variant).toBe("info");
      expect(req.isTerminal).toBe(false);

      const proc = mapPayoutStatus("PROCESSING");
      expect(proc.uiStatus).toBe("PROCESSING");
      expect(proc.variant).toBe("info");
      expect(proc.isTerminal).toBe(false);
    });

    it("maps FAILED to terminal danger", () => {
      const info = mapPayoutStatus("FAILED");
      expect(info.uiStatus).toBe("FAILED");
      expect(info.variant).toBe("danger");
      expect(info.isTerminal).toBe(true);
    });

    it("maps undefined, null, or unrecognized status safely to UNKNOWN neutral", () => {
      expect(mapPayoutStatus(undefined).uiStatus).toBe("UNKNOWN");
      expect(mapPayoutStatus(null).uiStatus).toBe("UNKNOWN");
      expect(mapPayoutStatus("MYSTERY").uiStatus).toBe("UNKNOWN");
      expect(mapPayoutStatus("MYSTERY").isTerminal).toBe(false);
    });
  });
});
