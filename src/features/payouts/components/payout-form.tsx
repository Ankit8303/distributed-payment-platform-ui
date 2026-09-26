import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AlertCircle, RotateCcw } from "lucide-react";
import { parseDecimalToMinor } from "@/features/payments/utils/money-parser";
import { useCreatePayout } from "../hooks/use-create-payout";
import { PayoutConfirmDialog } from "./payout-confirm-dialog";
import type { PayoutCreateRequest } from "@/types/payout";
import type { ApiError } from "@/lib/api/client";

export interface PayoutFormProps {
  defaultAccountId?: string;
  defaultCurrency?: string;
}

export function PayoutForm({
  defaultAccountId = "",
  defaultCurrency = "USD",
}: PayoutFormProps) {
  const router = useRouter();
  const createPayoutMutation = useCreatePayout();

  // Form inputs
  const [accountId, setAccountId] = useState(defaultAccountId);
  const [amountDecimal, setAmountDecimal] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);

  // Validation & Error states
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submissionError, setSubmissionError] = useState<ApiError | Error | null>(null);

  // Confirmation & Freeze State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [frozenPayload, setFrozenPayload] = useState<PayoutCreateRequest | null>(null);
  const [activeIdempotencyKey, setActiveIdempotencyKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const trimmedAccount = accountId.trim();
    if (!trimmedAccount) {
      errors.accountId = "Origin account ID is required";
    } else if (!uuidRegex.test(trimmedAccount)) {
      errors.accountId = "Must be a valid UUID format (e.g. 123e4567-e89b-12d3-a456-426614174000)";
    }

    const parseResult = parseDecimalToMinor(amountDecimal);
    if (parseResult.error) {
      errors.amountDecimal = parseResult.error;
    }

    const currencyRegex = /^[A-Z]{3}$/;
    const trimmedCurrency = currency.trim().toUpperCase();
    if (!trimmedCurrency) {
      errors.currency = "Currency is required";
    } else if (!currencyRegex.test(trimmedCurrency)) {
      errors.currency = "Currency must be a 3-letter ISO code (e.g. USD)";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 1: User initiates review
  const handleReviewPayout = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError(null);

    if (!validateForm()) return;

    const parseResult = parseDecimalToMinor(amountDecimal);
    const payload: PayoutCreateRequest = {
      accountId: accountId.trim(),
      amountMinor: parseResult.minor,
      currency: currency.trim().toUpperCase(),
    };

    setFrozenPayload(payload);
    setIsConfirmOpen(true);
  };

  // Step 2: User confirms in dialog -> Freeze exact payload -> Generate K1 -> Submit
  const handleConfirmAndDisburse = async () => {
    if (!frozenPayload || isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    const idempotencyKey =
      activeIdempotencyKey ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          }));

    if (!activeIdempotencyKey) {
      setActiveIdempotencyKey(idempotencyKey);
    }

    try {
      const response = await createPayoutMutation.mutateAsync({
        request: frozenPayload,
        idempotencyKey,
      });

      router.push(`/payouts/${response.payoutId}`);
    } catch (err: unknown) {
      setIsSubmitting(false);
      setIsConfirmOpen(false);
      setSubmissionError(
        err instanceof Error ? err : new Error("Payout submission failed")
      );
    }
  };

  const apiErr = submissionError && "response" in submissionError ? (submissionError as ApiError) : null;
  const errorTitle = apiErr?.response?.title || "Payout Request Failed";
  const errorDetail = apiErr?.response?.detail || submissionError?.message;

  return (
    <div className="space-y-6">
      {/* Top Error Alert if submission failed */}
      {submissionError && (
        <div
          role="alert"
          data-testid="payout-error-alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <h3 className="text-sm font-semibold">{errorTitle}</h3>
              <p className="text-xs text-rose-700 dark:text-rose-300">{errorDetail}</p>
              {activeIdempotencyKey && (
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-xs font-mono text-rose-600 dark:text-rose-400">
                    Idempotency Key: {activeIdempotencyKey.slice(0, 8)}...
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsConfirmOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 dark:text-rose-200 hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry with Same Key</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payout Form */}
      <form
        onSubmit={handleReviewPayout}
        noValidate
        aria-label="Create Payout Form"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5"
      >
        {/* Origin Account ID */}
        <div>
          <label
            htmlFor="payout-account-id"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
          >
            Origin Account ID <span className="text-rose-500">*</span>
          </label>
          <input
            id="payout-account-id"
            data-testid="payout-account-id-input"
            type="text"
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              if (fieldErrors.accountId) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.accountId;
                  return next;
                });
              }
            }}
            placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-950 dark:text-slate-100 ${
              fieldErrors.accountId
                ? "border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-800"
                : "border-slate-200 bg-slate-50/50 focus:border-emerald-500 focus:bg-white focus:ring-emerald-500/20 dark:border-slate-800"
            }`}
            aria-invalid={Boolean(fieldErrors.accountId)}
            aria-describedby={fieldErrors.accountId ? "account-id-error" : undefined}
            required
          />
          {fieldErrors.accountId && (
            <p id="account-id-error" className="mt-1 text-xs text-rose-600 dark:text-rose-400">
              {fieldErrors.accountId}
            </p>
          )}
        </div>

        {/* Amount & Currency Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label
              htmlFor="payout-amount"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
            >
              Payout Amount <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="payout-amount"
                data-testid="payout-amount-input"
                type="text"
                inputMode="decimal"
                value={amountDecimal}
                onChange={(e) => {
                  setAmountDecimal(e.target.value);
                  if (fieldErrors.amountDecimal) {
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.amountDecimal;
                      return next;
                    });
                  }
                }}
                placeholder="0.00"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-950 dark:text-slate-100 ${
                  fieldErrors.amountDecimal
                    ? "border-rose-300 bg-rose-50/30 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-800"
                    : "border-slate-200 bg-slate-50/50 focus:border-emerald-500 focus:bg-white focus:ring-emerald-500/20 dark:border-slate-800"
                }`}
                aria-invalid={Boolean(fieldErrors.amountDecimal)}
                aria-describedby={fieldErrors.amountDecimal ? "amount-error" : undefined}
                required
              />
            </div>
            {fieldErrors.amountDecimal && (
              <p id="amount-error" className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {fieldErrors.amountDecimal}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="payout-currency"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
            >
              Currency <span className="text-rose-500">*</span>
            </label>
            <input
              id="payout-currency"
              data-testid="payout-currency-input"
              type="text"
              maxLength={3}
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value.toUpperCase());
                if (fieldErrors.currency) {
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.currency;
                    return next;
                  });
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 uppercase placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              required
            />
            {fieldErrors.currency && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {fieldErrors.currency}
              </p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="submit"
            data-testid="payout-review-button"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            <span>Review Payout</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      {frozenPayload && (
        <PayoutConfirmDialog
          isOpen={isConfirmOpen}
          accountId={frozenPayload.accountId}
          amountMinor={frozenPayload.amountMinor}
          currency={frozenPayload.currency}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirmAndDisburse}
          onCancel={() => {
            if (!isSubmitting) {
              setIsConfirmOpen(false);
            }
          }}
        />
      )}
    </div>
  );
}
