"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { Scale, RefreshCw, CheckCircle2, ArrowRight } from "lucide-react";
import { AdjustmentForm } from "@/features/admin/components/adjustment-form";
import { AdjustmentConfirmModal } from "@/features/admin/components/adjustment-confirm-modal";
import { useAdminAccount } from "@/features/admin/hooks/use-admin-account";
import { formatMinorUnits } from "@/lib/formatting/money";
import type {
  FinancialAdjustmentCreateRequest,
  FinancialAdjustmentResponse,
} from "@/types/admin";

function AdjustmentsContent() {
  const [reviewPayload, setReviewPayload] =
    useState<FinancialAdjustmentCreateRequest | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [postedAdjustment, setPostedAdjustment] =
    useState<FinancialAdjustmentResponse | null>(null);

  // Authoritative account details for confirmation display
  const { data: sourceAccount } = useAdminAccount(reviewPayload?.sourceAccountId);
  const { data: targetAccount } = useAdminAccount(reviewPayload?.targetAccountId);

  const handleReview = (payload: FinancialAdjustmentCreateRequest) => {
    setReviewPayload(payload);
    setIsConfirmModalOpen(true);
  };

  const handleModalClose = () => {
    setIsConfirmModalOpen(false);
  };

  const handlePostingSuccess = (response: FinancialAdjustmentResponse) => {
    setPostedAdjustment(response);
    setIsConfirmModalOpen(false);
    setReviewPayload(null);
  };

  const handleCreateAnother = () => {
    setPostedAdjustment(null);
    setReviewPayload(null);
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
              <Scale className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              Financial Adjustments
            </h1>
          </div>
          <p className="mt-1.5 text-xs sm:text-sm text-zinc-400 max-w-2xl">
            Prepare authoritative administrative ledger adjustments between platform accounts.
            Adjustments create balanced, immutable double-entry ledger legs upon confirmation in Phase F7-H-C.
          </p>
        </div>
      </div>

      {/* Authoritative Success Banner after successful posting */}
      {postedAdjustment && (
        <section
          data-testid="adjustment-success-banner"
          aria-labelledby="success-heading"
          className="rounded-xl border border-emerald-800/80 bg-emerald-950/30 p-5 space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center gap-2.5 text-emerald-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            <h2 id="success-heading" className="text-sm font-semibold tracking-wide text-emerald-200">
              Financial Adjustment Posted Successfully (HTTP 201 Created)
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-zinc-900/80 rounded-lg p-4 border border-zinc-800">
            <div>
              <span className="text-zinc-500 font-mono text-[11px] block">Adjustment ID:</span>
              <span
                data-testid="success-adjustment-id"
                className="font-mono text-zinc-100 font-semibold break-all select-all"
              >
                {postedAdjustment.adjustmentId}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 font-mono text-[11px] block">Compensating Ledger TX ID:</span>
              <span
                data-testid="success-ledger-tx-id"
                className="font-mono text-zinc-100 font-semibold break-all select-all"
              >
                {postedAdjustment.compensatingLedgerTransactionId}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 font-mono text-[11px] block">Amount Transferred:</span>
              <span
                data-testid="success-amount"
                className="font-mono font-bold text-emerald-400 text-sm"
              >
                {formatMinorUnits(postedAdjustment.amountMinor, postedAdjustment.currency)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 font-mono text-[11px] block">Operator ID:</span>
              <span className="font-mono text-zinc-300 break-all">
                {postedAdjustment.operatorId}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-zinc-500 font-mono text-[11px] block">Immutable Audit Reason:</span>
              <span className="text-zinc-200 italic break-words">&quot;{postedAdjustment.reason}&quot;</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-emerald-900/60">
            <span className="text-[11px] text-zinc-400">
              Balanced double-entry ledger legs posted. Materialized account balances synchronized.
            </span>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                data-testid="create-another-adjustment-button"
                onClick={handleCreateAnother}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <span>Prepare Another</span>
              </button>
              <Link
                href={`/admin/adjustments/${postedAdjustment.adjustmentId}`}
                data-testid="view-posted-adjustment-detail-link"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <span>View Adjustment Record</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Main Workspace Form */}
      <AdjustmentForm
        onReview={handleReview}
        onOpenConfirm={(payload) => {
          setReviewPayload(payload);
          setIsConfirmModalOpen(true);
        }}
      />

      {/* Confirmation & Idempotency Execution Gate Modal */}
      <AdjustmentConfirmModal
        isOpen={isConfirmModalOpen}
        payload={reviewPayload}
        sourceAccount={sourceAccount}
        targetAccount={targetAccount}
        onClose={handleModalClose}
        onSuccess={handlePostingSuccess}
      />
    </div>
  );
}

export default function AdminAdjustmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-zinc-400 text-xs">
          <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-500" />
          Loading Financial Adjustment Workspace...
        </div>
      }
    >
      <AdjustmentsContent />
    </Suspense>
  );
}
