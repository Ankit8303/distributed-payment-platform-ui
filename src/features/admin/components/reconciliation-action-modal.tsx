"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

export interface ReconciliationActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  actionLabel: string;
  caseId?: string;
  reference?: string | null;
  consequence: string;
  isPending?: boolean;
}

export function ReconciliationActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  actionLabel,
  caseId,
  reference,
  consequence,
  isPending = false,
}: ReconciliationActionModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Capture trigger element and restore focus on close
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      const timer = setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    } else if (triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
    return undefined;
  }, [isOpen]);

  // Focus trap and Escape key listener
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
  }, [isOpen, isPending, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reconciliation-action-title"
      aria-describedby="reconciliation-action-desc"
      data-testid="reconciliation-action-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div className="max-w-md w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/80 flex items-center justify-center flex-shrink-0 text-amber-400">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3
              id="reconciliation-action-title"
              className="text-base font-bold text-zinc-100"
            >
              {title}
            </h3>
            <p id="reconciliation-action-desc" className="mt-1 text-xs text-zinc-400 leading-relaxed">
              Please review the operational action before executing.
            </p>
          </div>
        </div>

        {/* Action Details */}
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 space-y-2 text-xs">
          {caseId && (
            <div className="flex justify-between items-center font-mono">
              <span className="text-zinc-400">Case ID:</span>
              <span className="text-zinc-200" data-testid="action-modal-case-id">{caseId}</span>
            </div>
          )}
          {reference && (
            <div className="flex justify-between items-center font-mono">
              <span className="text-zinc-400">Reference:</span>
              <span className="text-zinc-200">{reference}</span>
            </div>
          )}
          <div className="pt-1 text-zinc-300 border-t border-zinc-800/80">
            <span className="font-semibold text-amber-300">Consequence: </span>
            <span>{consequence}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onClose}
            disabled={isPending}
            data-testid="action-modal-cancel-button"
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            data-testid="action-modal-confirm-button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>Executing...</span>
              </>
            ) : (
              <span>{actionLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
