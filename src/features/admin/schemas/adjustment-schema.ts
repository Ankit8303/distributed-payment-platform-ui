import { z } from "zod";
import type { FinancialAdjustmentCreateRequest } from "@/types/admin";

/**
 * Standard RFC 4122 UUID validation pattern matching project conventions.
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Client form draft validation schema for the Financial Adjustment form.
 */
export const adjustmentFormSchema = z
  .object({
    sourceAccountId: z
      .string()
      .trim()
      .min(1, "Source account is required")
      .regex(UUID_REGEX, "Source account ID must be a valid UUID"),
    targetAccountId: z
      .string()
      .trim()
      .min(1, "Target account is required")
      .regex(UUID_REGEX, "Target account ID must be a valid UUID"),
    amountDecimal: z
      .string()
      .trim()
      .min(1, "Amount is required")
      .regex(/^\d+(\.\d{1,2})?$/, "Invalid amount format. Use e.g. 10.50"),
    currency: z
      .string()
      .trim()
      .length(3, "Currency must be exactly 3 uppercase letters (e.g. USD)")
      .regex(/^[A-Z]{3}$/, "Currency must be exactly 3 uppercase letters (e.g. USD)"),
    reason: z
      .string()
      .trim()
      .min(1, "Audit reason is required and cannot be blank")
      .max(500, "Audit reason cannot exceed 500 characters"),
  })
  .refine((data) => data.sourceAccountId !== data.targetAccountId, {
    message: "Source account and target account must not be the same account",
    path: ["targetAccountId"],
  });

export type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

/**
 * Schema verifying the frozen FinancialAdjustmentCreateRequest payload structure.
 */
export const adjustmentCreatePayloadSchema: z.ZodType<FinancialAdjustmentCreateRequest> =
  z.object({
    sourceAccountId: z
      .string()
      .trim()
      .regex(UUID_REGEX, "Source account ID must be a valid UUID"),
    targetAccountId: z
      .string()
      .trim()
      .regex(UUID_REGEX, "Target account ID must be a valid UUID"),
    amountMinor: z
      .number()
      .int("Amount minor must be an integer")
      .min(1, "Amount must be at least 1 minor unit"),
    currency: z
      .string()
      .trim()
      .length(3, "Currency must be exactly 3 characters")
      .regex(/^[A-Z]{3}$/, "Currency must be 3 uppercase letters"),
    reason: z
      .string()
      .trim()
      .min(1, "Reason is required")
      .max(500, "Reason cannot exceed 500 characters"),
  });
