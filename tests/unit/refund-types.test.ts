import { describe, it, expect } from "vitest";
import { refundCreateSchema, mapRefundStatus } from "@/types/refund";

describe("Refund Types & Schemas", () => {
  describe("refundCreateSchema", () => {
    it("validates a correct refund payload with valid minor amount and reason", () => {
      const validPayload = {
        amountMinor: 2500,
        reason: "Customer request - item returned",
      };

      const result = refundCreateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amountMinor).toBe(2500);
        expect(result.data.reason).toBe("Customer request - item returned");
      }
    });

    it("accepts a refund payload without a reason", () => {
      const validPayload = {
        amountMinor: 1000,
      };

      const result = refundCreateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects zero or negative refund amount", () => {
      expect(refundCreateSchema.safeParse({ amountMinor: 0 }).success).toBe(false);
      expect(refundCreateSchema.safeParse({ amountMinor: -500 }).success).toBe(false);
    });

    it("rejects non-integer minor units", () => {
      expect(refundCreateSchema.safeParse({ amountMinor: 10.5 }).success).toBe(false);
    });

    it("rejects reason exceeding 500 characters", () => {
      const longReason = "a".repeat(501);
      const result = refundCreateSchema.safeParse({
        amountMinor: 100,
        reason: longReason,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("mapRefundStatus", () => {
    it("maps SETTLED to terminal success", () => {
      const info = mapRefundStatus("SETTLED");
      expect(info.uiStatus).toBe("SETTLED");
      expect(info.variant).toBe("success");
      expect(info.isTerminal).toBe(true);
    });

    it("maps PENDING_RECONCILIATION to non-terminal warning", () => {
      const info = mapRefundStatus("PENDING_RECONCILIATION");
      expect(info.uiStatus).toBe("PENDING_RECONCILIATION");
      expect(info.variant).toBe("warning");
      expect(info.isTerminal).toBe(false);
    });

    it("maps REQUESTED and PROCESSING to non-terminal info", () => {
      const requested = mapRefundStatus("REQUESTED");
      expect(requested.uiStatus).toBe("PROCESSING");
      expect(requested.variant).toBe("info");
      expect(requested.isTerminal).toBe(false);

      const processing = mapRefundStatus("PROCESSING");
      expect(processing.uiStatus).toBe("PROCESSING");
      expect(processing.variant).toBe("info");
      expect(processing.isTerminal).toBe(false);
    });

    it("maps FAILED to terminal danger", () => {
      const info = mapRefundStatus("FAILED");
      expect(info.uiStatus).toBe("FAILED");
      expect(info.variant).toBe("danger");
      expect(info.isTerminal).toBe(true);
    });

    it("maps undefined, null, or unrecognized status safely to UNKNOWN neutral", () => {
      expect(mapRefundStatus(undefined).uiStatus).toBe("UNKNOWN");
      expect(mapRefundStatus(null).uiStatus).toBe("UNKNOWN");
      expect(mapRefundStatus("SOMETHING_NEW").uiStatus).toBe("UNKNOWN");
      expect(mapRefundStatus("SOMETHING_NEW").isTerminal).toBe(false);
    });
  });
});
