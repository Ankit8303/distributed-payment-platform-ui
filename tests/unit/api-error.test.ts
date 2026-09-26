import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/api/client";
import type { ApiErrorResponse } from "@/types/api";

describe("ApiError class", () => {
  it("unpacks RFC 7807 problem details fields", () => {
    const errorPayload: ApiErrorResponse = {
      type: "https://api.paymentledger.com/errors/INSUFFICIENT_FUNDS",
      title: "Insufficient Account Balance",
      status: 422,
      detail: "Account balance is 5000 USD cents; required 10000 USD cents.",
      instance: "/api/v1/payments",
      errorCode: "INSUFFICIENT_FUNDS",
      correlationId: "test-correlation-id-1234",
      timestamp: "2026-09-25T15:00:00.000Z",
      invalidParameters: [
        { field: "amountMinor", reason: "Exceeds available balance" }
      ],
    };

    const err = new ApiError(errorPayload);

    expect(err.message).toBe(errorPayload.detail);
    expect(err.status).toBe(422);
    expect(err.errorCode).toBe("INSUFFICIENT_FUNDS");
    expect(err.correlationId).toBe("test-correlation-id-1234");
    expect(err.response.invalidParameters).toHaveLength(1);
    expect(err.response.invalidParameters?.[0]?.field).toBe("amountMinor");
  });
});
