import { describe, it, expect } from "vitest";
import { mapPaymentStatus } from "@/types/payment";

describe("Payment State Machine Mapping", () => {
  it("maps SETTLED to terminal success state", () => {
    const info = mapPaymentStatus("SETTLED");
    expect(info.uiStatus).toBe("SETTLED");
    expect(info.variant).toBe("success");
    expect(info.isTerminal).toBe(true);
    expect(info.label).toBe("Settled");
  });

  it("maps PENDING_RECONCILIATION to non-terminal warning state", () => {
    const info = mapPaymentStatus("PENDING_RECONCILIATION");
    expect(info.uiStatus).toBe("PENDING_RECONCILIATION");
    expect(info.variant).toBe("warning");
    expect(info.isTerminal).toBe(false);
    expect(info.label).toBe("Reconciliation In Progress");
  });

  it("maps DECLINED and FAILED to terminal danger states", () => {
    const declined = mapPaymentStatus("DECLINED");
    expect(declined.uiStatus).toBe("DECLINED");
    expect(declined.variant).toBe("danger");
    expect(declined.isTerminal).toBe(true);

    const failed = mapPaymentStatus("FAILED");
    expect(failed.uiStatus).toBe("FAILED");
    expect(failed.variant).toBe("danger");
    expect(failed.isTerminal).toBe(true);
  });

  it("maps EXPIRED to terminal neutral state", () => {
    const expired = mapPaymentStatus("EXPIRED");
    expect(expired.uiStatus).toBe("EXPIRED");
    expect(expired.variant).toBe("neutral");
    expect(expired.isTerminal).toBe(true);
  });

  it("maps intermediate in-flight backend states to Processing", () => {
    const inFlightStates = ["CREATED", "AUTHORIZING", "AUTHORIZED", "CAPTURING"];
    for (const state of inFlightStates) {
      const info = mapPaymentStatus(state);
      expect(info.uiStatus).toBe("PROCESSING");
      expect(info.label).toBe("Processing");
      expect(info.variant).toBe("info");
      expect(info.isTerminal).toBe(false);
    }
  });

  it("fails safely on unknown, empty, or null states", () => {
    const unknownCases = [null, undefined, "", "SOMETHING_ELSE", "INVALID"];
    for (const item of unknownCases) {
      const info = mapPaymentStatus(item);
      expect(info.uiStatus).toBe("UNKNOWN");
      expect(info.label).toBe("Status Unknown");
      expect(info.variant).toBe("neutral");
      expect(info.isTerminal).toBe(false);
      // Invariant: Unknown never silently converts to success or failure
      expect(info.uiStatus).not.toBe("SETTLED");
      expect(info.uiStatus).not.toBe("FAILED");
      expect(info.uiStatus).not.toBe("DECLINED");
    }
  });
});
