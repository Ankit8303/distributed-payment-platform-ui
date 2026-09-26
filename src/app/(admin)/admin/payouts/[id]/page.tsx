"use client";

import React, { use } from "react";
import Link from "next/link";
import { useAdminPayout } from "@/features/admin/hooks/use-admin-payout";
import { AdminPayoutStatusBadge } from "@/features/admin/components/payout-status-badge";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import { formatMoney } from "@/features/payments/utils/money-parser";
import {
  ArrowUpRight,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Calendar,
  ShieldCheck,
  Wallet,
  Building,
} from "lucide-react";

export default function AdminPayoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: payout, isLoading, isError, error, refetch, isFetching } =
    useAdminPayout(id);

  if (isLoading) {
    return (
      <div
        data-testid="payout-detail-loading"
        className="space-y-6 max-w-5xl mx-auto"
      >
        <div className="h-6 w-36 bg-zinc-800 rounded animate-pulse" />
        <div className="h-32 bg-zinc-850/50 rounded-2xl border border-zinc-800 animate-pulse" />
        <div className="h-64 bg-zinc-850/30 rounded-2xl border border-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (isError || !payout) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Link
          href="/admin/payouts"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Payouts</span>
        </Link>
        <AdminErrorState
          error={error || new Error("Payout record could not be retrieved")}
          title="Payout Not Found"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  const formattedAmount = formatMoney(payout.amountMinor, payout.currency);

  const formattedCreated = new Date(payout.createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedUpdated = new Date(payout.updatedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="payout-detail-container">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/payouts"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Payouts</span>
        </Link>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="refresh-payout-detail-button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Hero Header Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
              <ArrowUpRight className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span
                  data-testid="payout-detail-amount"
                  className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight"
                >
                  {formattedAmount}
                </span>
                <AdminPayoutStatusBadge status={payout.status} />
              </div>
              <p className="mt-1 font-mono text-xs text-zinc-400">
                Payout ID: <span data-testid="payout-detail-id">{payout.id}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Financial & Resource Details */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <DollarSign className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Authoritative Financial Data
            </h2>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-xs">
            <div>
              <dt className="text-zinc-500 font-medium">Disbursed Payout Amount</dt>
              <dd className="mt-0.5 font-mono text-base font-bold text-zinc-100">
                {formattedAmount}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Currency</dt>
              <dd className="mt-0.5 font-mono text-zinc-200 font-semibold">{payout.currency}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Lifecycle Status</dt>
              <dd className="mt-1">
                <AdminPayoutStatusBadge status={payout.status} />
              </dd>
            </div>
          </dl>
        </div>

        {/* Section 2: Originating Account Reference */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Wallet className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Disbursing Account Reference
            </h2>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-xs">
            <div>
              <dt className="text-zinc-500 font-medium">Source Account Identifier</dt>
              <dd className="mt-1">
                <Link
                  href={`/admin/accounts/${payout.accountId}`}
                  data-testid="payout-account-link"
                  className="inline-flex items-center gap-1.5 font-mono text-indigo-400 hover:text-indigo-300 hover:underline break-all"
                >
                  <span>{payout.accountId}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Account Governance</dt>
              <dd className="mt-0.5 text-zinc-300">
                Authoritative platform account subject to double-entry ledger settlement.
              </dd>
            </div>
          </dl>
        </div>

        {/* Section 3: Provider Gateway Reference */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Building className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              External Gateway & Provider
            </h2>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-xs">
            <div>
              <dt className="text-zinc-500 font-medium">Banking / Rails Reference ID</dt>
              <dd className="mt-0.5 font-mono text-zinc-200">
                {payout.providerReference || "None / Pending settlement"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Disbursement Rail</dt>
              <dd className="mt-0.5 text-zinc-300">Authoritative Banking Rail Provider</dd>
            </div>
          </dl>
        </div>

        {/* Section 4: Audit Information */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Audit Timestamps
            </h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-zinc-500 font-medium">Disbursement Initiated</dt>
              <dd className="mt-0.5 font-mono text-zinc-200">{formattedCreated}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Last State Update</dt>
              <dd className="mt-0.5 font-mono text-zinc-200">{formattedUpdated}</dd>
            </div>
          </dl>
        </div>

        {/* Section 5: Financial Source of Truth Note */}
        <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Financial Integrity Policy
            </h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            All disbursement records displayed originate directly from authoritative banking rail webhooks and
            immutable PostgreSQL double-entry ledger state. The frontend presentation layer performs zero fee,
            net settlement, or reserve deductions.
          </p>
        </div>
      </div>
    </div>
  );
}
