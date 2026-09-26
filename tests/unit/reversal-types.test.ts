import { describe, it, expect } from "vitest";
import { reversalCreateSchema, mapReversalStatus } from "@/types/reversal";

describe("Reversal Types & Schemas", () => {
  describe("reversalCreateSchema", () => {
    it("validates a correct reversal payload with mandatory reason", () => {
      const validPayload = {
        reason: "Administrative reversal - duplicate transaction",
      };

      const result = reversalCreateSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe("Administrative reversal - duplicate transaction");
      }
    });

    it("rejects an empty reason", () => {
      expect(reversalCreateSchema.safeParse({ reason: "" }).success).toBe(false);
      expect(reversalCreateSchema.safeParse({ reason: "   " }).success).toBe(false);
      expect(reversalCreateSchema.safeParse({}).success).toBe(false);
    });

    it("rejects reason exceeding 500 characters", () => {
      const longReason = "r".repeat(501);
      expect(reversalCreateSchema.safeParse({ reason: longReason }).success).toBe(false);
    });
  });

  describe("mapReversalStatus", () => {
    it("maps COMPLETED to terminal success", () => {
      const info = mapReversalStatus("COMPLETED");
      expect(info.uiStatus).toBe("COMPLETED");
      expect(info.variant).toBe("success");
      expect(info.isTerminal).toBe(true);
    });

    it("maps PENDING_RECONCILIATION to non-terminal warning", () => {
      const info = mapReversalStatus("PENDING_RECONCILIATION");
      expect(info.uiStatus).toBe("PENDING_RECONCILIATION");
      expect(info.variant).toBe("warning");
      expect(info.isTerminal).toBe(false);
    });

    it("maps FAILED to terminal danger", () => {
      const info = mapReversalStatus("FAILED");
      expect(info.uiStatus).toBe("FAILED");
      expect(info.variant).toBe("danger");
      expect(info.isTerminal).toBe(true);
    });

    it("maps undefined, null, or unrecognized status safely to UNKNOWN neutral", () => {
      expect(mapReversalStatus(undefined).uiStatus).toBe("UNKNOWN");
      expect(mapReversalStatus(null).uiStatus).toBe("UNKNOWN");
      expect(mapReversalStatus("UNKNOWN_CODE").uiStatus).toBe("UNKNOWN");
      expect(mapReversalStatus("UNKNOWN_CODE").isTerminal).toBe(false);
    });
  });
});
