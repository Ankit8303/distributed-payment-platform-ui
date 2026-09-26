"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAdminPayment } from "@/features/admin/hooks/use-admin-payment";
import { PaymentAdminStatusBadge } from "@/features/admin/components/payment-status-badge";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import { formatMoney } from "@/features/payments/utils/money-parser";
import {
  ArrowLeft,
  RefreshCw,
  SearchCode,
  CreditCard,
  Building,
  Key,
  Calendar,
  Layers,
  Copy,
  Check,
} from "lucide-react";

export default function AdminPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const paymentId = params?.id || "";

  const { data: payment, isLoading, isError, error, refetch, isFetching } =
    useAdminPayment(paymentId);

  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div
        data-testid="admin-payment-detail-loading"
        className="space-y-6 animate-pulse"
      >
        <div className="h-8 w-48 bg-zinc-800 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-zinc-900 rounded-xl border border-zinc-800" />
          <div className="h-48 bg-zinc-900 rounded-xl border border-zinc-800" />
          <div className="h-48 bg-zinc-900 rounded-xl border border-zinc-800" />
          <div className="h-48 bg-zinc-900 rounded-xl border border-zinc-800" />
        </div>
      </div>
    );
  }

  if (isError || !payment) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/payments"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Back to Payments</span>
        </Link>

        <AdminErrorState
          error={error}
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  const formattedAmount = formatMoney(payment.amountMinor, payment.currency);
  const formattedFee = formatMoney(payment.feeMinor, payment.currency);
  const formattedCreatedAt = new Date(payment.createdAt).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "medium",
  });
  const formattedUpdatedAt = new Date(payment.updatedAt).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "medium",
  });

  return (
    <div className="space-y-8" data-testid="admin-payment-detail-container">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <Link
            href="/admin/payments"
            data-testid="back-to-payments-link"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 mb-2 transition-colors focus:outline-none focus-visible:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Payments</span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Payment Details
            </h1>
            <PaymentAdminStatusBadge status={payment.status} />
          </div>
          <p className="mt-1 font-mono text-xs text-zinc-400 select-all">
            ID: {payment.id}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="admin-payment-detail-refresh-button"
            aria-label="Refresh payment details"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
          </button>

          {/* Investigation Affordance (F7-E Gateway) */}
          <Link
            href={`/admin/investigations/payments/${payment.id}`}
            data-testid="investigate-payment-button"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            <SearchCode className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Investigate Trace</span>
          </Link>
        </div>
      </div>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Financial Settlement Information */}
        <section
          aria-labelledby="heading-financial-info"
          className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200 border-b border-zinc-800/80 pb-3">
            <CreditCard className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <h2 id="heading-financial-info">Financial Settlement</h2>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <dt className="text-zinc-400 font-medium">Transaction Amount</dt>
              <dd
                data-testid="detail-amount-value"
                className="mt-1 text-xl font-bold font-mono text-white"
              >
                {formattedAmount}
              </dd>
            </div>

            <div>
              <dt className="text-zinc-400 font-medium">Platform Fee</dt>
              <dd
                data-testid="detail-fee-value"
                className="mt-1 text-xl font-bold font-mono text-zinc-300"
              >
                {formattedFee}
              </dd>
            </div>

            <div>
              <dt className="text-zinc-400 font-medium">Currency</dt>
              <dd className="mt-1 font-mono font-semibold text-zinc-200">
                {payment.currency}
              </dd>
            </div>

            <div>
              <dt className="text-zinc-400 font-medium">Settlement Status</dt>
              <dd className="mt-1">
                <PaymentAdminStatusBadge status={payment.status} />
              </dd>
            </div>
          </dl>
        </section>

        {/* 2. Account Routing */}
        <section
          aria-labelledby="heading-account-routing"
          className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200 border-b border-zinc-800/80 pb-3">
            <Building className="w-4 h-4 text-blue-400" aria-hidden="true" />
            <h2 id="heading-account-routing">Account Routing</h2>
          </div>

          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-zinc-400 font-medium">Payer Account ID</dt>
              <dd className="mt-1 flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-zinc-200">
                <span data-testid="detail-payer-account-id">{payment.payerAccountId}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(payment.payerAccountId, "payer")}
                  aria-label="Copy payer account ID"
                  className="p-1 hover:text-white text-zinc-400 focus:outline-none"
                >
                  {copiedKey === "payer" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </dd>
            </div>

            <div>
              <dt className="text-zinc-400 font-medium">Payee Account ID</dt>
              <dd className="mt-1 flex items-center justify-between p-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-zinc-200">
                <span data-testid="detail-payee-account-id">{payment.payeeAccountId}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(payment.payeeAccountId, "payee")}
                  aria-label="Copy payee account ID"
                  className="p-1 hover:text-white text-zinc-400 focus:outline-none"
                >
                  {copiedKey === "payee" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </dd>
            </div>
          </dl>
        </section>

        {/* 3. Provider & Gateway Information */}
        <section
          aria-labelledby="heading-provider-info"
          className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200 border-b border-zinc-800/80 pb-3">
            <Layers className="w-4 h-4 text-purple-400" aria-hidden="true" />
            <h2 id="heading-provider-info">Gateway & Provider</h2>
          </div>

          <dl className="text-xs">
            <div>
              <dt className="text-zinc-400 font-medium">Provider Reference</dt>
              <dd
                data-testid="detail-provider-ref"
                className="mt-1 p-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-zinc-200"
              >
                {payment.providerReference || "—"}
              </dd>
            </div>
          </dl>
        </section>

        {/* 4. Idempotency Governance */}
        <section
          aria-labelledby="heading-idempotency-info"
          className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200 border-b border-zinc-800/80 pb-3">
            <Key className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <h2 id="heading-idempotency-info">Idempotency Governance</h2>
          </div>

          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-zinc-400 font-medium">Idempotency Key</dt>
              <dd className="mt-1 p-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-zinc-200 select-all truncate">
                {payment.idempotencyKey}
              </dd>
            </div>

            <div>
              <dt className="text-zinc-400 font-medium">Idempotency Scope</dt>
              <dd className="mt-1 font-mono text-zinc-300">
                {payment.idempotencyScope || "—"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* 5. Audit & Timestamp History */}
      <section
        aria-labelledby="heading-audit-timestamps"
        className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200 border-b border-zinc-800/80 pb-3">
          <Calendar className="w-4 h-4 text-zinc-400" aria-hidden="true" />
          <h2 id="heading-audit-timestamps">Lifecycle Timestamps</h2>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <dt className="text-zinc-400 font-medium">Record Created At</dt>
            <dd
              data-testid="detail-created-at"
              className="mt-1 font-mono text-zinc-200"
            >
              {formattedCreatedAt}
            </dd>
          </div>

          <div>
            <dt className="text-zinc-400 font-medium">Last State Update</dt>
            <dd
              data-testid="detail-updated-at"
              className="mt-1 font-mono text-zinc-200"
            >
              {formattedUpdatedAt}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
