import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RotateCcw, ShieldAlert, ArrowLeft, Loader2, Check } from "lucide-react";
import { useCreateRefund } from "../hooks/use-create-refund";
import { parseDecimalToMinor, formatMoney } from "@/features/payments/utils/money-parser";
import type { ApiError } from "@/lib/api/client";
import type { RefundResponse } from "@/types/refund";

export interface RefundModalProps {
  isOpen: boolean;
  paymentId: string;
  paymentCurrency: string;
  originalAmountMinor: number;
  onClose: () => void;
  onSuccess?: (refund: RefundResponse) => void;
}

export function RefundModal({
  isOpen,
  paymentId,
  paymentCurrency,
  originalAmountMinor,
  onClose,
  onSuccess,
}: RefundModalProps) {
  const router = useRouter();
  const createRefundMutation = useCreateRefund();

  const [step, setStep] = useState<"input" | "confirm">("input");
  const [amountStr, setAmountStr] = useState("");
  const [reasonStr, setReasonStr] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Idempotency state: frozen payload and K1
  const [frozenPayload, setFrozenPayload] = useState<{
    amountMinor: number;
    reason?: string;
  } | null>(null);
  const [activeIdempotencyKey, setActiveIdempotencyKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<ApiError | Error | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Reset modal state on open/close
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setStep("input");
    setAmountStr("");
    setReasonStr("");
    setValidationError(null);
    setFrozenPayload(null);
    setActiveIdempotencyKey(null);
    setIsSubmitting(false);
    setSubmissionError(null);

    const timer = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Focus confirm button when transitioning to confirm step
  useEffect(() => {
    if (step !== "confirm") {
      return;
    }

    const timer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [step]);

  // Accessibility: Focus trap & Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        e.preventDefault();
        onClose();
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  // Step 1: Validate payload and proceed to confirmation
  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSubmissionError(null);

    const parseResult = parseDecimalToMinor(amountStr);
    if (parseResult.error) {
      setValidationError(parseResult.error);
      return;
    }

    if (reasonStr.length > 500) {
      setValidationError("Reason must not exceed 500 characters");
      return;
    }

    const payload = {
      amountMinor: parseResult.minor,
      reason: reasonStr.trim() ? reasonStr.trim() : undefined,
    };

    setFrozenPayload(payload);
    setStep("confirm");
  };

  // Step 2: Explicit user confirmation -> Freeze payload -> Generate K1 -> Submit
  const handleExecuteRefund = async () => {
    if (!frozenPayload || isSubmitting) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    // Critical Idempotency Rule: Use existing K1 on retry; generate new UUIDv4 only on initial confirmation
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
      const response = await createRefundMutation.mutateAsync({
        paymentId,
        request: frozenPayload,
        idempotencyKey,
      });

      if (onSuccess) {
        onSuccess(response);
      }
      onClose();
      router.push(`/refunds/${response.refundId}`);
    } catch (err: unknown) {
      setIsSubmitting(false);
      setSubmissionError(
        err instanceof Error ? err : new Error("Refund request failed")
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      aria-hidden={!isOpen}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="refund-dialog-title"
        aria-describedby="refund-dialog-description"
        data-testid="refund-modal"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <RotateCcw className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="refund-dialog-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {step === "input" ? "Issue Refund" : "Confirm Refund"}
            </h2>
            <p id="refund-dialog-description" className="text-xs text-slate-500 dark:text-slate-400">
              {step === "input"
                ? `Initiate a partial or full refund for payment ${paymentId.slice(0, 8)}...`
                : "Verify the exact refund details before dispatching to the ledger."}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {(validationError || submissionError) && (() => {
          const apiErr =
            submissionError && "response" in submissionError
              ? (submissionError as ApiError)
              : null;
          const displayTitle =
            validationError || apiErr?.response?.title || "Refund Submission Failed";
          const displayDetail =
            apiErr?.response?.detail ||
            (submissionError && !validationError ? submissionError.message : null);

          return (
            <div
              role="alert"
              data-testid="refund-error-alert"
              className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-200 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{displayTitle}</p>
                {displayDetail && (
                  <p className="mt-0.5 text-rose-700 dark:text-rose-300">
                    {displayDetail}
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Body: Step 1 Input Form */}
        {step === "input" ? (
          <form onSubmit={handleProceedToConfirm} noValidate className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="refund-amount-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Refund Amount ({paymentCurrency})
              </label>
              <div className="relative">
                <input
                  ref={firstInputRef}
                  id="refund-amount-input"
                  data-testid="refund-amount-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Original payment: {formatMoney(originalAmountMinor, paymentCurrency)}</span>
                <button
                  type="button"
                  onClick={() => setAmountStr((originalAmountMinor / 100).toFixed(2))}
                  className="text-amber-600 hover:text-amber-700 dark:text-amber-400 font-semibold"
                >
                  Full Amount
                </button>
              </p>
            </div>

            <div>
              <label
                htmlFor="refund-reason-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Reason (Optional)
              </label>
              <textarea
                id="refund-reason-input"
                data-testid="refund-reason-input"
                rows={3}
                maxLength={500}
                placeholder="Reason for issuing this refund..."
                value={reasonStr}
                onChange={(e) => setReasonStr(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              />
              <p className="mt-1 text-right text-xs text-slate-400">
                {reasonStr.length} / 500
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="refund-review-button"
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors"
              >
                Review Refund
              </button>
            </div>
          </form>
        ) : (
          /* Step 2 Confirmation View */
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400">Payment ID</span>
                <span className="font-mono text-slate-900 dark:text-slate-100">{paymentId}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400">Refund Amount</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
                  {frozenPayload && formatMoney(frozenPayload.amountMinor, paymentCurrency)}
                </span>
              </div>
              {frozenPayload?.reason && (
                <div className="text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500 dark:text-slate-400 block mb-1">Reason:</span>
                  <p className="text-slate-800 dark:text-slate-200 italic">{frozenPayload.reason}</p>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p>
                This action is an authoritative financial refund. Upon confirmation, funds will be returned and compensating ledger transactions created.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setStep("input")}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  ref={confirmBtnRef}
                  type="button"
                  data-testid="refund-confirm-submit-button"
                  onClick={handleExecuteRefund}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Refund...</span>
                    </>
                  ) : activeIdempotencyKey ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry with Existing Key</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Issue Refund</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
