"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import {
  AlertTriangle,
  Lock,
  RotateCcw,
  X,
  Loader2,
  Building2,
  Wallet,
  Scale,
} from "lucide-react";
import { formatMinorUnits } from "@/lib/formatting/money";
import { useAdminCreateAdjustment } from "@/features/admin/hooks/use-admin-create-adjustment";
import { AccountAdminStatusBadge } from "./account-status-badge";
import type {
  FinancialAdjustmentCreateRequest,
  FinancialAdjustmentResponse,
  AccountAdminResponse,
} from "@/types/admin";
import type { ApiError } from "@/lib/api/client";

export interface AdjustmentConfirmModalProps {
  isOpen: boolean;
  payload: FinancialAdjustmentCreateRequest | null;
  sourceAccount?: AccountAdminResponse | null;
  targetAccount?: AccountAdminResponse | null;
  onClose: () => void;
  onSuccess: (response: FinancialAdjustmentResponse) => void;
}

/**
 * Phase F7-H-C Admin Financial Adjustment Confirmation & Idempotency Execution Gate
 *
 * CRITICAL FINANCIAL SAFETY INVARIANTS:
 * 1. Explicit Final Confirmation: Never execute without a distinct modal confirmation action.
 * 2. Payload Freeze: The payload is frozen in review. No modifications are permitted during confirmation.
 * 3. Idempotency Key Generation: Exactly ONE UUIDv4 is generated via `crypto.randomUUID()`
 *    ONLY upon the first explicit click of "Confirm & Post Adjustment".
 * 4. Key + Payload Binding: If the request fails due to network/ambiguity, the SAME key (K1) and
 *    SAME payload are preserved. Operator-triggered retries reuse the SAME key.
 * 5. Double-Submit Protection: Disables actions and prevents concurrent dispatches while pending.
 * 6. Zero Optimistic Financial Data: Balances, ledger transactions, and adjustments are never fabricated.
 * 7. Zero Automatic Mutation Retries: `retry: false` in React Query mutation hook is respected.
 */
export function AdjustmentConfirmModal({
  isOpen,
  payload,
  sourceAccount,
  targetAccount,
  onClose,
  onSuccess,
}: AdjustmentConfirmModalProps) {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descId = `${dialogId}-description`;

  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // State Machine: 'REVIEW' | 'POSTING' | 'AMBIGUOUS' | 'ERROR' | 'SUCCESS'
  const [executionState, setExecutionState] = useState<
    "REVIEW" | "POSTING" | "AMBIGUOUS" | "ERROR" | "SUCCESS"
  >("REVIEW");

  // Idempotency key state: Generated on first explicit confirmation click; preserved across retries
  const [activeIdempotencyKey, setActiveIdempotencyKey] = useState<string | null>(null);

  // Error state
  const [executionError, setExecutionError] = useState<{
    message: string;
    isAmbiguous: boolean;
    errorCode?: string;
    status?: number;
  } | null>(null);

  // Mutation hook
  const createAdjustmentMutation = useAdminCreateAdjustment({
    onSuccess: (data) => {
      setExecutionState("SUCCESS");
      onSuccess(data);
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      const isNetworkOrTimeout =
        !apiErr.status || apiErr.status === 0 || err.name === "TypeError" || err.name === "AbortError";

      if (isNetworkOrTimeout) {
        setExecutionState("AMBIGUOUS");
        setExecutionError({
          message:
            "Posting outcome could not be confirmed due to a network interruption or timeout. Do not create a new adjustment. You may retry using the exact same confirmation key.",
          isAmbiguous: true,
          status: apiErr.status,
          errorCode: apiErr.errorCode,
        });
      } else {
        setExecutionState("ERROR");
        setExecutionError({
          message:
            apiErr.response?.detail ||
            apiErr.message ||
            "The backend rejected the financial adjustment request.",
          isAmbiguous: false,
          status: apiErr.status,
          errorCode: apiErr.errorCode,
        });
      }
    },
  });

  const isPending = createAdjustmentMutation.isPending;

  const resetMutation = createAdjustmentMutation.reset;
  const resetMutationRef = useRef(resetMutation);
  useEffect(() => {
    resetMutationRef.current = resetMutation;
  }, [resetMutation]);

  // Reset modal state when opened or closed
  useEffect(() => {
    if (isOpen) {
      setExecutionState("REVIEW");
      setActiveIdempotencyKey(null);
      setExecutionError(null);
      resetMutationRef.current();
    }
  }, [isOpen]);

  // Initial focus on safe Cancel button (NOT on Confirm & Post)
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Focus trap & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isPending) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (!first || !last) return;

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPending, onClose]);

  if (!isOpen || !payload) return null;

  /**
   * Explicit confirmation execution gate.
   * Generates ONE idempotency key on first attempt; reuses it if retrying an ambiguous/failed attempt.
   */
  const handleConfirmAndPost = () => {
    if (isPending) return; // Prevent duplicate dispatches

    let keyToUse = activeIdempotencyKey;
    if (!keyToUse) {
      // Generate exactly ONE RFC 4122 v4 UUID at confirmation boundary
      keyToUse = crypto.randomUUID();
      setActiveIdempotencyKey(keyToUse);
    }

    setExecutionState("POSTING");
    setExecutionError(null);

    createAdjustmentMutation.mutate({
      request: payload,
      idempotencyKey: keyToUse,
    });
  };

  const isFrozenWarning =
    sourceAccount?.status === "FROZEN" || targetAccount?.status === "FROZEN";
  const isClosedWarning =
    sourceAccount?.status === "CLOSED" || targetAccount?.status === "CLOSED";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      aria-hidden={!isOpen}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        data-testid="adjustment-confirm-dialog"
        className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 sm:p-7 shadow-2xl space-y-6 text-zinc-100 max-h-[90vh] overflow-y-auto"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-800/60 text-amber-400">
              <Scale className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="text-lg font-bold text-zinc-100">
                Confirm Financial Adjustment
              </h2>
              <p id={descId} className="text-xs text-zinc-400">
                Controlled double-entry ledger posting execution gate (Phase F7-H-C)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close confirmation dialog"
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Financial Immutability Notice */}
        <div className="rounded-xl border border-amber-900/60 bg-amber-950/30 p-4 text-xs text-amber-200/90 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <span>Authoritative Financial Operation Warning</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed pl-1 text-amber-200">
            <li>This is an <strong>immediate financial ledger adjustment</strong>.</li>
            <li>The adjustment creates an <strong>immutable ledger transaction</strong>.</li>
            <li>Once posted, this operation <strong>cannot be edited or deleted</strong>.</li>
          </ul>
        </div>

        {/* Frozen/Closed Warning Banner if applicable */}
        {(isFrozenWarning || isClosedWarning) && (
          <div
            data-testid="modal-lifecycle-warning"
            role="status"
            className="rounded-lg border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-200 flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-0.5">
              <p className="font-semibold text-rose-300">Operational Notice: Account Status</p>
              <p className="text-[11px] text-rose-200/90">
                One or more selected accounts is currently{" "}
                {sourceAccount?.status === "FROZEN" || targetAccount?.status === "FROZEN"
                  ? "FROZEN"
                  : "CLOSED"}
                . Backend financial validation remains authoritative.
              </p>
            </div>
          </div>
        )}

        {/* Human-Readable Frozen Financial Payload Review */}
        <div className="space-y-4 text-xs bg-zinc-950/80 rounded-xl p-4 border border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <span className="font-mono text-zinc-400 uppercase text-[11px] tracking-wider">
              Transfer Details
            </span>
            <span
              data-testid="modal-amount-display"
              className="font-mono font-bold text-base text-emerald-400"
            >
              {formatMinorUnits(payload.amountMinor, payload.currency)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Source Account (Debit Leg) */}
            <div className="space-y-1.5 p-3 rounded-lg bg-zinc-900 border border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                <span>Source Account (Debit Leg)</span>
              </div>
              <p className="font-mono text-zinc-100 font-semibold text-xs">
                {sourceAccount?.accountNumber || "Account"}
              </p>
              <p className="font-mono text-[10px] text-zinc-500 break-all select-all">
                {payload.sourceAccountId}
              </p>
              {sourceAccount && (
                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <span className="font-mono text-zinc-400 uppercase text-[10px]">
                    {sourceAccount.accountType}
                  </span>
                  <AccountAdminStatusBadge status={sourceAccount.status} />
                </div>
              )}
            </div>

            {/* Target Account (Credit Leg) */}
            <div className="space-y-1.5 p-3 rounded-lg bg-zinc-900 border border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                <Wallet className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                <span>Target Account (Credit Leg)</span>
              </div>
              <p className="font-mono text-zinc-100 font-semibold text-xs">
                {targetAccount?.accountNumber || "Account"}
              </p>
              <p className="font-mono text-[10px] text-zinc-500 break-all select-all">
                {payload.targetAccountId}
              </p>
              {targetAccount && (
                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <span className="font-mono text-zinc-400 uppercase text-[10px]">
                    {targetAccount.accountType}
                  </span>
                  <AccountAdminStatusBadge status={targetAccount.status} />
                </div>
              )}
            </div>
          </div>

          {/* Audit Reason */}
          <div className="pt-2 border-t border-zinc-800/80">
            <span className="text-zinc-500 block text-[11px] mb-1">Mandatory Audit Reason:</span>
            <p className="text-zinc-200 italic break-words bg-zinc-900/60 p-2.5 rounded border border-zinc-800/60">
              &quot;{payload.reason}&quot;
            </p>
          </div>
        </div>

        {/* Error Display */}
        {executionError && (
          <div
            role="alert"
            data-testid="modal-execution-error"
            className={`rounded-xl p-4 border text-xs space-y-1.5 ${
              executionError.isAmbiguous
                ? "bg-amber-950/40 border-amber-800/80 text-amber-200"
                : "bg-rose-950/40 border-rose-800/80 text-rose-200"
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle
                className={`w-4 h-4 shrink-0 ${
                  executionError.isAmbiguous ? "text-amber-400" : "text-rose-400"
                }`}
                aria-hidden="true"
              />
              <span>
                {executionError.isAmbiguous
                  ? "Ambiguous Network Outcome"
                  : "Adjustment Execution Failed"}
              </span>
            </div>
            <p className="leading-relaxed text-[11px]">{executionError.message}</p>
            {activeIdempotencyKey && executionError.isAmbiguous && (
              <p className="text-[10px] font-mono text-amber-300/80 pt-1">
                Preserved Idempotency Key: {activeIdempotencyKey}
              </p>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-zinc-700 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:opacity-50"
          >
            Cancel / Back to Form
          </button>

          <button
            type="button"
            data-testid="confirm-post-adjustment-button"
            onClick={handleConfirmAndPost}
            disabled={isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-200" aria-hidden="true" />
                <span>Posting Ledger Adjustment...</span>
              </>
            ) : executionState === "AMBIGUOUS" ? (
              <>
                <RotateCcw className="w-4 h-4 text-emerald-200" aria-hidden="true" />
                <span>Retry Posting with Same Key</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-emerald-200" aria-hidden="true" />
                <span>Confirm & Post Adjustment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
