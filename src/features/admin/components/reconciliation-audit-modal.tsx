"use client";

import React, { useEffect, useRef } from "react";
import { formatMinorUnits } from "@/lib/formatting/money";
import type {
  ReconciliationLedgerAuditReport,
  ReconciliationBalanceAuditReport,
} from "@/types/admin";
import {
  Scale,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";

export type AuditType = "ledger" | "balances";

export interface ReconciliationAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditType: AuditType;
  onRunAudit: () => void;
  isLoading?: boolean;
  ledgerReport?: ReconciliationLedgerAuditReport | null;
  balanceReport?: ReconciliationBalanceAuditReport | null;
}

export function ReconciliationAuditModal({
  isOpen,
  onClose,
  auditType,
  onRunAudit,
  isLoading = false,
  ledgerReport,
  balanceReport,
}: ReconciliationAuditModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  // Capture trigger element and restore focus on close
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
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
      if (e.key === "Escape" && !isLoading) {
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
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isLedger = auditType === "ledger";
  const title = isLedger
    ? "Ledger Zero-Sum Integrity Audit"
    : "Materialized Balance Consistency Audit";
  const description = isLedger
    ? "Audits double-entry ledger transactions to verify that debits equal credits across all journal lines."
    : "Audits materialized account balances against authoritative calculated ledger sums.";

  const hasReport = isLedger ? Boolean(ledgerReport) : Boolean(balanceReport);
  const findingsCount = isLedger
    ? ledgerReport?.findingsCount ?? 0
    : balanceReport?.findingsCount ?? 0;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
      aria-describedby="audit-modal-desc"
      data-testid="reconciliation-audit-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
    >
      <div className="max-w-2xl w-full max-h-[85vh] flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800/80 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
              <Scale className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 id="audit-modal-title" className="text-base font-bold text-zinc-100">
                {title}
              </h3>
              <p id="audit-modal-desc" className="text-xs text-zinc-400">
                {description}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close audit modal"
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-zinc-300">
          {/* Action Trigger Area */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
            <div>
              <div className="font-semibold text-zinc-200">
                Execute Audit Invariant Check
              </div>
              <div className="text-[11px] text-zinc-400">
                Dispatches authoritative server verification against PostgreSQL.
              </div>
            </div>
            <button
              type="button"
              onClick={onRunAudit}
              disabled={isLoading}
              data-testid="execute-audit-button"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Auditing...</span>
                </>
              ) : (
                <span>Run Audit</span>
              )}
            </button>
          </div>

          {/* Results Summary */}
          {hasReport && (
            <div
              data-testid="audit-results-summary"
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/30">
                  <div className="text-zinc-400 text-[11px]">Items Audited</div>
                  <div className="text-lg font-bold text-zinc-100 font-mono mt-0.5" data-testid="audited-items-count">
                    {isLedger
                      ? ledgerReport?.transactionsAudited.toLocaleString()
                      : balanceReport?.accountsAudited.toLocaleString()}
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border ${
                    findingsCount === 0
                      ? "border-emerald-900/60 bg-emerald-950/20"
                      : "border-rose-900/60 bg-rose-950/20"
                  }`}
                >
                  <div className="text-[11px] text-zinc-400">Findings Count</div>
                  <div
                    className={`text-lg font-bold font-mono mt-0.5 ${
                      findingsCount === 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                    data-testid="findings-count"
                  >
                    {findingsCount}
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              {findingsCount === 0 ? (
                <div
                  data-testid="audit-pass-banner"
                  className="flex items-center gap-2.5 p-3.5 rounded-xl border border-emerald-800/80 bg-emerald-950/40 text-emerald-200"
                >
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  <span>
                    Audit passed: Zero invariant violations or balance discrepancies detected.
                  </span>
                </div>
              ) : (
                <div
                  data-testid="audit-findings-alert"
                  className="flex items-center gap-2.5 p-3.5 rounded-xl border border-rose-800/80 bg-rose-950/40 text-rose-200"
                >
                  <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                  <span>
                    Attention: {findingsCount} discrepancy findings require administrative review.
                  </span>
                </div>
              )}

              {/* Ledger Findings Table */}
              {isLedger && ledgerReport && ledgerReport.findings.length > 0 && (
                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-900 text-zinc-400 text-[11px] border-b border-zinc-800">
                      <tr>
                        <th className="px-3 py-2">Transaction ID</th>
                        <th className="px-3 py-2">Finding Type</th>
                        <th className="px-3 py-2">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {ledgerReport.findings.map((f, i) => (
                        <tr key={i} className="hover:bg-zinc-900/40">
                          <td className="px-3 py-2 font-mono text-zinc-200">
                            {f.transactionId}
                          </td>
                          <td className="px-3 py-2 font-mono text-amber-300">
                            {f.findingType}
                          </td>
                          <td className="px-3 py-2 text-zinc-400">
                            {f.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Balance Findings Table */}
              {!isLedger && balanceReport && balanceReport.findings.length > 0 && (
                <div className="rounded-xl border border-zinc-800 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-900 text-zinc-400 text-[11px] border-b border-zinc-800">
                      <tr>
                        <th className="px-3 py-2">Account ID</th>
                        <th className="px-3 py-2">Materialized Balance</th>
                        <th className="px-3 py-2">Calculated Ledger</th>
                        <th className="px-3 py-2">Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {balanceReport.findings.map((f, i) => (
                        <tr key={i} className="hover:bg-zinc-900/40">
                          <td className="px-3 py-2 font-mono text-zinc-200">
                            {f.accountId}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {formatMinorUnits(f.materializedBalance)}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {formatMinorUnits(f.calculatedLedgerBalance)}
                          </td>
                          <td className="px-3 py-2 font-mono text-rose-400">
                            {formatMinorUnits(f.delta)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/30 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            data-testid="audit-modal-close-button"
            className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
