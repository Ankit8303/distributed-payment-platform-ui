import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RotateCcw, ShieldAlert, ArrowLeft, Loader2, Check } from "lucide-react";
import { useCreateReversal } from "../hooks/use-create-reversal";
import { formatMoney } from "@/features/payments/utils/money-parser";
import type { ApiError } from "@/lib/api/client";
import type { ReversalResponse } from "@/types/reversal";

export interface ReversalModalProps {
  isOpen: boolean;
  paymentId: string;
  paymentCurrency: string;
  originalAmountMinor: number;
  onClose: () => void;
  onSuccess?: (reversal: ReversalResponse) => void;
}

export function ReversalModal({
  isOpen,
  paymentId,
  paymentCurrency,
  originalAmountMinor,
  onClose,
  onSuccess,
}: ReversalModalProps) {
  const router = useRouter();
  const createReversalMutation = useCreateReversal();

  const [step, setStep] = useState<"input" | "confirm">("input");
  const [reasonStr, setReasonStr] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Idempotency state: frozen payload and K1
  const [frozenPayload, setFrozenPayload] = useState<{
    reason: string;
  } | null>(null);
  const [activeIdempotencyKey, setActiveIdempotencyKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<ApiError | Error | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setStep("input");
    setReasonStr("");
    setValidationError(null);
    setFrozenPayload(null);
    setActiveIdempotencyKey(null);
    setIsSubmitting(false);
    setSubmissionError(null);

    const timer = setTimeout(() => {
      reasonInputRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (step !== "confirm") {
      return;
    }

    const timer = setTimeout(() => {
      confirmBtnRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [step]);

  // Accessibility: Focus trap & Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        e.preventDefault();
        onClose();
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

    const trimmedReason = reasonStr.trim();
    if (!trimmedReason) {
      setValidationError("Reversal reason is mandatory.");
      return;
    }

    if (trimmedReason.length > 500) {
      setValidationError("Reason must not exceed 500 characters.");
      return;
    }

    setFrozenPayload({ reason: trimmedReason });
    setStep("confirm");
  };

  // Step 2: Explicit user confirmation -> Freeze payload -> Generate K1 -> Submit
  const handleExecuteReversal = async () => {
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
      const response = await createReversalMutation.mutateAsync({
        paymentId,
        request: frozenPayload,
        idempotencyKey,
      });

      if (onSuccess) {
        onSuccess(response);
      }
      onClose();
      router.push(`/reversals/${response.reversalId}`);
    } catch (err: unknown) {
      setIsSubmitting(false);
      setSubmissionError(
        err instanceof Error ? err : new Error("Reversal request failed")
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
        aria-labelledby="reversal-dialog-title"
        aria-describedby="reversal-dialog-description"
        data-testid="reversal-modal"
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <RotateCcw className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h2 id="reversal-dialog-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {step === "input" ? "Request Full Payment Reversal" : "Confirm Full Payment Reversal"}
            </h2>
            <p id="reversal-dialog-description" className="text-xs text-slate-500 dark:text-slate-400">
              Reversing payment {paymentId.slice(0, 8)}... for {formatMoney(originalAmountMinor, paymentCurrency)}.
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
            validationError || apiErr?.response?.title || "Reversal Submission Failed";
          const displayDetail =
            apiErr?.response?.detail ||
            (submissionError && !validationError ? submissionError.message : null);

          return (
            <div
              role="alert"
              data-testid="reversal-error-alert"
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

        {/* Body */}
        {step === "input" ? (
          <form onSubmit={handleProceedToConfirm} noValidate className="mt-4 space-y-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 text-xs space-y-1">
              <span className="text-slate-500 dark:text-slate-400">Scope of Reversal:</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Full original payment amount: {formatMoney(originalAmountMinor, paymentCurrency)}.
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Reversal cannot be partial. The entire transaction will be cancelled on the ledger.
              </p>
            </div>

            <div>
              <label
                htmlFor="reversal-reason-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Reason for Reversal <span className="text-rose-500">*</span>
              </label>
              <textarea
                ref={reasonInputRef}
                id="reversal-reason-input"
                data-testid="reversal-reason-input"
                rows={3}
                maxLength={500}
                placeholder="Describe why this payment must be fully reversed (required)..."
                value={reasonStr}
                onChange={(e) => setReasonStr(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                required
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
                data-testid="reversal-review-button"
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-colors"
              >
                Review Reversal
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
                <span className="text-slate-500 dark:text-slate-400">Full Reversal Amount</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                  {formatMoney(originalAmountMinor, paymentCurrency)}
                </span>
              </div>
              <div className="text-xs pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400 block mb-1">Mandatory Reason:</span>
                <p className="text-slate-800 dark:text-slate-200 italic">{frozenPayload?.reason}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p>
                Caution: This will execute a full payment reversal. Both payer and payee balances will be adjusted on the ledger platform.
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
                  data-testid="reversal-confirm-submit-button"
                  onClick={handleExecuteReversal}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Executing Reversal...</span>
                    </>
                  ) : activeIdempotencyKey ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry with Existing Key</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Reverse Payment</span>
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
