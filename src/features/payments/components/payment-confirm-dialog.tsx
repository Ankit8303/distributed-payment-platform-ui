import React, { useEffect, useRef } from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { formatMoney } from "../utils/money-parser";
import type { PaymentMethodOption } from "../tokens/payment-method-tokens";

export interface PaymentConfirmDialogProps {
  isOpen: boolean;
  payeeAccountId: string;
  amountMinor: number;
  currency: string;
  paymentMethod: PaymentMethodOption;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PaymentConfirmDialog({
  isOpen,
  payeeAccountId,
  amountMinor,
  currency,
  paymentMethod,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: PaymentConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    // Focus confirm button when dialog opens
    const focusTimer = setTimeout(() => {
      confirmButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        e.preventDefault();
        onCancel();
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (!firstElement || !lastElement) return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      aria-hidden={!isOpen}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        data-testid="payment-confirm-dialog"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Confirm Payment
            </h3>
            <p id="confirm-dialog-description" className="text-xs text-slate-500 dark:text-slate-400">
              Review transaction details before financial submission.
            </p>
          </div>
        </div>

        {/* Transaction Summary List */}
        <div className="my-5 space-y-3 text-sm">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Amount</span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {formatMoney(amountMinor, currency)}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-800/20 space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              Destination Payee Account
            </span>
            <span className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all">
              {payeeAccountId}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-800/20 space-y-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 block">
              Payment Method (Sandbox Token)
            </span>
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
              {paymentMethod.name}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 block">
              {paymentMethod.description}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Upon confirmation, an idempotency key will bind to this exact payload to protect against double charges.
          </span>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            ref={confirmButtonRef}
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isSubmitting ? "Processing..." : "Confirm & Pay"}
          </button>
        </div>
      </div>
    </div>
  );
}
