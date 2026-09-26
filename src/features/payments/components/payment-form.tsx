import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Info } from "lucide-react";
import { parseDecimalToMinor } from "../utils/money-parser";
import {
  SANDBOX_PAYMENT_METHODS,
  DEFAULT_PAYMENT_METHOD_TOKEN,
  type PaymentMethodOption,
} from "../tokens/payment-method-tokens";
import { useCreatePayment } from "../hooks/use-create-payment";
import { PaymentConfirmDialog } from "./payment-confirm-dialog";
import { PaymentErrorState } from "./payment-error-state";
import type { FrozenPaymentPayload } from "@/types/payment";
import type { ApiError } from "@/lib/api/client";

export function PaymentForm() {
  const router = useRouter();
  const createPaymentMutation = useCreatePayment();

  // Form input state
  const [payeeAccountId, setPayeeAccountId] = useState("");
  const [amountDecimal, setAmountDecimal] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [paymentMethodToken, setPaymentMethodToken] = useState(DEFAULT_PAYMENT_METHOD_TOKEN);
  const [customToken, setCustomToken] = useState("");

  // Validation & Error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submissionError, setSubmissionError] = useState<ApiError | Error | null>(null);

  // Confirmation & Freeze State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [frozenPayload, setFrozenPayload] = useState<FrozenPaymentPayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate form client-side
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!payeeAccountId.trim()) {
      errors.payeeAccountId = "Payee account ID is required";
    } else if (!uuidRegex.test(payeeAccountId.trim())) {
      errors.payeeAccountId = "Must be a valid UUID (e.g. 123e4567-e89b-12d3-a456-426614174000)";
    }

    const parseResult = parseDecimalToMinor(amountDecimal);
    if (parseResult.error) {
      errors.amountDecimal = parseResult.error;
    }

    const currencyRegex = /^[A-Z]{3}$/;
    if (!currency.trim()) {
      errors.currency = "Currency is required";
    } else if (!currencyRegex.test(currency.trim().toUpperCase())) {
      errors.currency = "Currency must be 3 uppercase letters (e.g. USD)";
    }

    const activeToken =
      paymentMethodToken === "tok_custom" ? customToken.trim() : paymentMethodToken;
    if (!activeToken) {
      errors.paymentMethodToken = "Payment method token is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 1: User clicks "Review Payment"
  const handleReviewPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!validateForm()) {
      return;
    }

    const parseResult = parseDecimalToMinor(amountDecimal);
    const activeToken =
      paymentMethodToken === "tok_custom" ? customToken.trim() : paymentMethodToken;

    // Freeze exact payload for confirmation (Key is NOT generated yet)
    const snapshot: FrozenPaymentPayload = {
      payeeAccountId: payeeAccountId.trim(),
      amountMinor: parseResult.minor,
      amountDecimal: amountDecimal.trim(),
      currency: currency.trim().toUpperCase(),
      paymentMethodToken: activeToken,
      idempotencyKey: "", // Will be assigned atomically upon user confirmation
    };

    setFrozenPayload(snapshot);
    setIsConfirmOpen(true);
  };

  // Step 2: User confirms payment in dialog
  const handleConfirmAndPay = async () => {
    if (!frozenPayload || isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    // Idempotency Invariant: Generate K1 ONLY upon explicit user confirmation
    const idempotencyKey =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

    try {
      const response = await createPaymentMutation.mutateAsync({
        request: {
          payeeAccountId: frozenPayload.payeeAccountId,
          amountMinor: frozenPayload.amountMinor,
          currency: frozenPayload.currency,
          paymentMethodToken: frozenPayload.paymentMethodToken,
        },
        idempotencyKey,
      });

      // Immediate redirect to authoritative payment detail route
      router.push(`/payments/${response.paymentId}`);
    } catch (err: unknown) {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
      setSubmissionError(err instanceof Error ? err : new Error("Payment submission failed"));
    }
  };

  const selectedMethodOption: PaymentMethodOption =
    SANDBOX_PAYMENT_METHODS.find((m) => m.token === paymentMethodToken) || {
      id: "sandbox-custom",
      token: customToken || "tok_custom",
      name: "Custom Token",
      description: "Custom sandbox payment token",
      simulatedOutcome: "CUSTOM",
    };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form
        onSubmit={handleReviewPayment}
        noValidate
        data-testid="payment-form"
        className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6"
      >
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Initiate New Payment
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Send funds to an operational payee account. Your payer account is resolved automatically.
          </p>
        </div>

        {submissionError && <PaymentErrorState error={submissionError} />}

        {/* Payee Account ID */}
        <div className="space-y-1.5">
          <label
            htmlFor="payeeAccountId"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Payee Account ID <span className="text-rose-500">*</span>
          </label>
          <input
            id="payeeAccountId"
            name="payeeAccountId"
            type="text"
            disabled={isSubmitting}
            value={payeeAccountId}
            onChange={(e) => {
              setPayeeAccountId(e.target.value);
              if (fieldErrors.payeeAccountId) {
                setFieldErrors((prev) => ({ ...prev, payeeAccountId: "" }));
              }
            }}
            placeholder="123e4567-e89b-12d3-a456-426614174000"
            aria-invalid={Boolean(fieldErrors.payeeAccountId)}
            aria-describedby={
              fieldErrors.payeeAccountId
                ? "payeeAccountId-error"
                : "payeeAccountId-description"
            }
            className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono placeholder:text-slate-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 ${
              fieldErrors.payeeAccountId
                ? "border-rose-300 focus:ring-rose-500 dark:border-rose-800"
                : "border-slate-200 focus:ring-indigo-500 dark:border-slate-700"
            }`}
          />
          <p id="payeeAccountId-description" className="text-xs text-slate-500 dark:text-slate-400">
            Must be a valid RFC 4122 UUID of the destination account.
          </p>
          {fieldErrors.payeeAccountId && (
            <p id="payeeAccountId-error" role="alert" className="text-xs text-rose-600 dark:text-rose-400">
              {fieldErrors.payeeAccountId}
            </p>
          )}
        </div>

        {/* Amount & Currency Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label
              htmlFor="amountDecimal"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Amount <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="amountDecimal"
                name="amountDecimal"
                type="text"
                inputMode="decimal"
                disabled={isSubmitting}
                value={amountDecimal}
                onChange={(e) => {
                  setAmountDecimal(e.target.value);
                  if (fieldErrors.amountDecimal) {
                    setFieldErrors((prev) => ({ ...prev, amountDecimal: "" }));
                  }
                }}
                placeholder="10.50"
                aria-invalid={Boolean(fieldErrors.amountDecimal)}
                aria-describedby={
                  fieldErrors.amountDecimal
                    ? "amountDecimal-error"
                    : "amountDecimal-description"
                }
                className={`w-full px-4 py-2.5 rounded-xl border text-sm placeholder:text-slate-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 ${
                  fieldErrors.amountDecimal
                    ? "border-rose-300 focus:ring-rose-500 dark:border-rose-800"
                    : "border-slate-200 focus:ring-indigo-500 dark:border-slate-700"
                }`}
              />
            </div>
            <p id="amountDecimal-description" className="text-xs text-slate-500 dark:text-slate-400">
              Decimal value with up to 2 decimal places (converted to integer cents).
            </p>
            {fieldErrors.amountDecimal && (
              <p id="amountDecimal-error" role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                {fieldErrors.amountDecimal}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="currency"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Currency <span className="text-rose-500">*</span>
            </label>
            <input
              id="currency"
              name="currency"
              type="text"
              maxLength={3}
              disabled={isSubmitting}
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value.toUpperCase());
                if (fieldErrors.currency) {
                  setFieldErrors((prev) => ({ ...prev, currency: "" }));
                }
              }}
              placeholder="USD"
              aria-invalid={Boolean(fieldErrors.currency)}
              aria-describedby="currency-description"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 uppercase text-sm font-semibold placeholder:text-slate-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 disabled:opacity-50"
            />
            <p id="currency-description" className="text-xs text-slate-500 dark:text-slate-400">
              ISO code (USD default).
            </p>
            {fieldErrors.currency && (
              <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
                {fieldErrors.currency}
              </p>
            )}
          </div>
        </div>

        {/* Payment Method Selector (Development/Sandbox Test Card) */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Payment Method (Sandbox Token) <span className="text-rose-500">*</span>
            </label>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
              <Info className="h-3 w-3" />
              <span>Sandbox Test Tokens Only</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Sandbox payment methods">
            {SANDBOX_PAYMENT_METHODS.map((method) => {
              const isSelected = paymentMethodToken === method.token;
              return (
                <div
                  key={method.id}
                  onClick={() => {
                    if (!isSubmitting) setPaymentMethodToken(method.token);
                  }}
                  className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/50 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/30"
                      : "border-slate-200 hover:border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-800/40"
                  } ${isSubmitting ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {method.name}
                    </span>
                    <input
                      type="radio"
                      name="paymentMethodToken"
                      value={method.token}
                      checked={isSelected}
                      onChange={() => setPaymentMethodToken(method.token)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-snug">
                    {method.description}
                  </p>
                </div>
              );
            })}
          </div>

          {paymentMethodToken === "tok_custom" && (
            <div className="pt-2">
              <label htmlFor="customToken" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                Enter Custom Token String
              </label>
              <input
                id="customToken"
                type="text"
                disabled={isSubmitting}
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                placeholder="tok_custom_example"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 dark:border-slate-700"
              />
            </div>
          )}
          {fieldErrors.paymentMethodToken && (
            <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
              {fieldErrors.paymentMethodToken}
            </p>
          )}
        </div>

        {/* Submit Action */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing Payment...</span>
              </>
            ) : (
              <>
                <span>Review Payment</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      {frozenPayload && (
        <PaymentConfirmDialog
          isOpen={isConfirmOpen}
          payeeAccountId={frozenPayload.payeeAccountId}
          amountMinor={frozenPayload.amountMinor}
          currency={frozenPayload.currency}
          paymentMethod={selectedMethodOption}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirmAndPay}
          onCancel={() => {
            if (!isSubmitting) setIsConfirmOpen(false);
          }}
        />
      )}
    </div>
  );
}
