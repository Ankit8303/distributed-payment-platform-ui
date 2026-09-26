import { describe, it, expect } from "vitest";
import { paymentFormSchema, type PaymentCreateRequest, type PaymentResponse } from "@/types/payment";

describe("Payment Types & Zod Schemas", () => {
  it("validates a correct payment form draft", () => {
    const validDraft = {
      payeeAccountId: "123e4567-e89b-12d3-a456-426614174000",
      amountDecimal: "25.50",
      currency: "USD",
      paymentMethodToken: "tok_visa",
    };

    const result = paymentFormSchema.safeParse(validDraft);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid payee UUID format", () => {
    const invalidDraft = {
      payeeAccountId: "not-a-valid-uuid",
      amountDecimal: "10.00",
      currency: "USD",
      paymentMethodToken: "tok_visa",
    };

    const result = paymentFormSchema.safeParse(invalidDraft);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain("Must be a valid UUID");
    }
  });

  it("rejects invalid amount formats with more than 2 decimal places", () => {
    const invalidDraft = {
      payeeAccountId: "123e4567-e89b-12d3-a456-426614174000",
      amountDecimal: "10.555",
      currency: "USD",
      paymentMethodToken: "tok_visa",
    };

    const result = paymentFormSchema.safeParse(invalidDraft);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain("Invalid amount format");
    }
  });

  it("validates 3 uppercase characters for currency contract", () => {
    const validCurrencies = ["USD", "EUR", "GBP", "JPY", "CAD"];
    for (const curr of validCurrencies) {
      const res = paymentFormSchema.safeParse({
        payeeAccountId: "123e4567-e89b-12d3-a456-426614174000",
        amountDecimal: "10.00",
        currency: curr,
        paymentMethodToken: "tok_visa",
      });
      expect(res.success).toBe(true);
    }

    const invalidRes = paymentFormSchema.safeParse({
      payeeAccountId: "123e4567-e89b-12d3-a456-426614174000",
      amountDecimal: "10.00",
      currency: "us", // 2 chars
      paymentMethodToken: "tok_visa",
    });
    expect(invalidRes.success).toBe(false);
  });

  it("ensures PaymentCreateRequest and PaymentResponse conform to contract", () => {
    const req: PaymentCreateRequest = {
      payeeAccountId: "123e4567-e89b-12d3-a456-426614174000",
      amountMinor: 2550,
      currency: "USD",
      paymentMethodToken: "tok_visa",
    };
    expect(req.amountMinor).toBe(2550);

    const res: PaymentResponse = {
      paymentId: "987e6543-e21b-12d3-a456-426614174000",
      idempotencyKey: "k-12345",
      payerAccountId: "111e1111-e11b-11d1-a111-111111111111",
      payeeAccountId: req.payeeAccountId,
      amountMinor: req.amountMinor,
      feeAmountMinor: 0,
      currency: req.currency,
      status: "SETTLED",
      createdAt: "2026-09-25T12:00:00Z",
    };
    expect(res.status).toBe("SETTLED");
  });
});
