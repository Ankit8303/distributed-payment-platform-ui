"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAdminAccountLifecycle } from "@/features/admin/hooks/use-admin-account-lifecycle";
import { AccountAdminStatusBadge } from "./account-status-badge";
import type { AccountAdminResponse } from "@/types/admin";
import type { ApiError } from "@/lib/api/client";
import {
  AlertTriangle,
  Lock,
  Unlock,
  X,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";

export interface AccountLifecycleModalProps {
  isOpen: boolean;
  action: "FREEZE" | "UNFREEZE";
  accountId: string;
  accountNumber: string;
  currentStatus: string;
  onClose: () => void;
  onSuccess?: (account: AccountAdminResponse) => void;
}

/**
 * Phase F7-G-E Admin Account Freeze / Unfreeze Lifecycle Modal
 * Provides an accessible, controlled confirmation workflow for administrative account status transitions.
 * Consumes:
 *   POST /api/v1/admin/accounts/{accountId}/freeze
 *   POST /api/v1/admin/accounts/{accountId}/unfreeze
 *
 * CRITICAL GOVERNANCE INVARIANTS:
 * 1. Mandatory Reason: Whitespace-only or empty reason is strictly rejected.
 * 2. No Optimistic State: Account state transitions occur strictly upon backend confirmation.
 * 3. Mutation Retry = false: No automatic mutation replay or retry loops.
 * 4. Duplicate Submission Guard: Disabled buttons while pending.
 */
export const AccountLifecycleModal: React.FC<AccountLifecycleModalProps> = ({
  isOpen,
  action,
  accountId,
  accountNumber,
  currentStatus,
  onClose,
  onSuccess,
}) => {
  const lifecycle = useAdminAccountLifecycle();

  const [reason, setReason] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<ApiError | Error | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  const isPending = lifecycle.isFreezing || lifecycle.isUnfreezing;
  const isFreeze = action === "FREEZE";

  const resetLifecycle = lifecycle.reset;
  const resetLifecycleRef = useRef(resetLifecycle);
  useEffect(() => {
    resetLifecycleRef.current = resetLifecycle;
  }, [resetLifecycle]);

  // Reset state when opening/closing
  useEffect(() => {
    setReason("");
    setValidationError(null);
    setSubmissionError(null);
    resetLifecycleRef.current();
  }, [isOpen]);

  // Focus reason field on open
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      reasonInputRef.current?.focus();
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Accessibility: Focus trap & Escape key handler
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
          'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setSubmissionError(null);

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setValidationError("A non-blank operational justification is required.");
      reasonInputRef.current?.focus();
      return;
    }

    try {
      let updated: AccountAdminResponse;
      if (isFreeze) {
        updated = await lifecycle.freezeAccount(accountId, { reason: trimmedReason });
      } else {
        updated = await lifecycle.unfreezeAccount(accountId, { reason: trimmedReason });
      }
      onSuccess?.(updated);
      onClose();
    } catch (err) {
      setSubmissionError(err as ApiError | Error);
    }
  };

  const isApiError =
    submissionError instanceof Error &&
    ("response" in submissionError || "errorCode" in submissionError || "status" in submissionError);
  const apiErr = isApiError ? (submissionError as ApiError) : null;
  const displayErrorMessage =
    apiErr?.response?.detail ||
    submissionError?.message ||
    (isFreeze
      ? "Failed to freeze account. The account may have already transitioned state."
      : "Failed to unfreeze account. The account may have already transitioned state.");

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lifecycle-modal-title"
        aria-describedby="lifecycle-modal-description"
        data-testid="account-lifecycle-modal"
        className="w-full max-w-lg rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden focus:outline-none"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                isFreeze
                  ? "bg-rose-950/80 border border-rose-800/80 text-rose-400"
                  : "bg-emerald-950/80 border border-emerald-800/80 text-emerald-400"
              }`}
              aria-hidden="true"
            >
              {isFreeze ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </div>
            <div>
              <h2
                id="lifecycle-modal-title"
                data-testid="lifecycle-modal-title"
                className="text-base font-bold text-white tracking-tight"
              >
                {isFreeze ? "Freeze Account" : "Unfreeze Account"}
              </h2>
              <p className="text-xs text-zinc-400">
                Administrative Lifecycle Action
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Close dialog"
            data-testid="close-lifecycle-modal-button"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Identity & Status Summary Box */}
          <div className="rounded-lg bg-zinc-950/70 border border-zinc-800 p-4 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Account Number:</span>
              <span
                data-testid="modal-account-number"
                className="font-mono font-semibold text-white"
              >
                {accountNumber}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Account ID:</span>
              <span
                data-testid="modal-account-id"
                className="font-mono text-zinc-400 truncate max-w-[240px]"
                title={accountId}
              >
                {accountId}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
              <span className="text-zinc-400 font-medium">Current Status:</span>
              <div data-testid="modal-current-status">
                <AccountAdminStatusBadge status={currentStatus} />
              </div>
            </div>
          </div>

          {/* Operational Narrative Description */}
          <p
            id="lifecycle-modal-description"
            className="text-xs text-zinc-300 leading-relaxed"
          >
            {isFreeze
              ? "Freezing this account immediately blocks all outbound payment origination, payouts, and settlements. Account record will be marked FROZEN in the primary ledger."
              : "Unfreezing this account restores normal operational capabilities, allowing payment origination and transaction settlement to resume."}
          </p>

          {/* Reason Input Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="lifecycle-reason"
              className="block text-xs font-semibold text-zinc-200"
            >
              Operational Justification <span className="text-rose-400">*</span>
            </label>
            <textarea
              id="lifecycle-reason"
              ref={reasonInputRef}
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (validationError) setValidationError(null);
              }}
              disabled={isPending}
              placeholder={
                isFreeze
                  ? "Enter the compliance, risk, or audit reason for freezing this account..."
                  : "Enter the operational justification for unfreezing this account..."
              }
              aria-required="true"
              aria-invalid={Boolean(validationError)}
              aria-describedby={
                validationError ? "lifecycle-reason-error" : undefined
              }
              data-testid="lifecycle-reason-input"
              className={`w-full rounded-lg bg-zinc-950 border px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 transition-colors ${
                validationError
                  ? "border-rose-500 focus:ring-rose-500/30"
                  : "border-zinc-700 focus:border-indigo-500 focus:ring-indigo-500/20"
              } disabled:opacity-50`}
            />

            {validationError && (
              <p
                id="lifecycle-reason-error"
                role="alert"
                data-testid="lifecycle-reason-error"
                className="text-xs text-rose-400 flex items-center gap-1.5 pt-0.5"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{validationError}</span>
              </p>
            )}
          </div>

          {/* Submission Error Banner */}
          {submissionError && (
            <div
              role="alert"
              aria-live="assertive"
              data-testid="lifecycle-submission-error"
              className="rounded-lg border border-rose-800/80 bg-rose-950/40 p-3.5 text-xs text-rose-200 space-y-1 shadow-xs"
            >
              <div className="flex items-center gap-2 font-semibold text-rose-100">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
                <span>Action Failed</span>
              </div>
              <p className="text-rose-300 leading-relaxed">
                {displayErrorMessage}
              </p>
              {apiErr?.correlationId && (
                <div className="text-[11px] font-mono text-rose-400 pt-0.5">
                  Correlation ID: {apiErr.correlationId}
                </div>
              )}
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={onClose}
              disabled={isPending}
              data-testid="cancel-lifecycle-button"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:opacity-50 shadow-xs"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isPending}
              data-testid="confirm-lifecycle-button"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed ${
                isFreeze
                  ? "bg-rose-700 hover:bg-rose-600 focus-visible:ring-rose-500"
                  : "bg-emerald-700 hover:bg-emerald-600 focus-visible:ring-emerald-500"
              }`}
            >
              {isPending && (
                <RotateCcw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              )}
              <span>
                {isPending
                  ? isFreeze
                    ? "Freezing Account..."
                    : "Unfreezing Account..."
                  : isFreeze
                  ? "Confirm Freeze"
                  : "Confirm Unfreeze"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
