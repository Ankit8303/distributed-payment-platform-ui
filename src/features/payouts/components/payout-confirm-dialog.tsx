import React, { useEffect, useRef } from "react";
import { ArrowUpRight, ShieldCheck, Loader2 } from "lucide-react";
import { formatMoney } from "@/features/payments/utils/money-parser";

export interface PayoutConfirmDialogProps {
  isOpen: boolean;
  accountId: string;
  amountMinor: number;
  currency: string;
  isSubmitting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Focus-trapped confirmation dialog for payouts.
 *
 * Invariant:
 * Verified backend contract contains NO fee fields.
 * Displays strictly authoritative data: origin account, amount, currency.
 * Zero fee calculation or estimation.
 */
export function PayoutConfirmDialog({
  isOpen,
  accountId,
  amountMinor,
  currency,
  isSubmitting = false,
  onConfirm,
  onCancel,
}: PayoutConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

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
        aria-labelledby="payout-confirm-dialog-title"
        aria-describedby="payout-confirm-dialog-description"
        data-testid="payout-confirm-dialog"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <ArrowUpRight className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 id="payout-confirm-dialog-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Confirm Outbound Payout
            </h3>
            <p id="payout-confirm-dialog-description" className="text-xs text-slate-500 dark:text-slate-400">
              Review authoritative disbursement parameters before ledger submission.
            </p>
          </div>
        </div>

        <div className="my-5 space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-800/40 dark:border-slate-800 space-y-3 text-sm">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">Origin Account ID</span>
              <span className="font-mono text-slate-800 dark:text-slate-200 select-all break-all">
                {accountId}
              </span>
            </div>

            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 dark:text-slate-400">Disbursement Amount</span>
              <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                {formatMoney(amountMinor, currency)}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400">Currency</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {currency}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200 text-xs">
            <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p>
              This financial mutation will disburse funds from the selected account to your connected payout destination.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            ref={confirmButtonRef}
            type="button"
            data-testid="payout-confirm-submit-button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Submitting Payout...</span>
              </>
            ) : (
              <span>Confirm & Disburse</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
