"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAdminPaymentInvestigation } from "@/features/admin/hooks/use-admin-payment-investigation";
import { PaymentAdminStatusBadge } from "@/features/admin/components/payment-status-badge";
import {
  LedgerDirectionBadge,
  OutboxStatusBadge,
  ReconciliationStatusBadge,
  NotificationStatusBadge,
} from "@/features/admin/components/investigation-status-badges";
import { InvestigationTimeline } from "@/features/admin/components/investigation-timeline";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import { formatMoney } from "@/features/payments/utils/money-parser";
import {
  ArrowLeft,
  RefreshCw,
  SearchCode,
  CreditCard,
  Building,
  BookOpen,
  Send,
  Radio,
  Scale,
  Bell,
  Copy,
  Check,
  Info,
} from "lucide-react";

export default function AdminPaymentInvestigationPage() {
  const params = useParams<{ paymentId: string }>();
  const paymentId = params?.paymentId || "";

  const {
    data: trace,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminPaymentInvestigation(paymentId);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (isLoading) {
    return (
      <div
        data-testid="admin-investigation-loading"
        className="space-y-6 animate-pulse"
      >
        <div className="h-8 w-64 bg-zinc-800 rounded" />
        <div className="h-32 bg-zinc-900 rounded-xl border border-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-zinc-900 rounded-xl border border-zinc-800" />
          <div className="h-48 bg-zinc-900 rounded-xl border border-zinc-800" />
        </div>
        <div className="h-64 bg-zinc-900 rounded-xl border border-zinc-800" />
      </div>
    );
  }

  if (isError || !trace) {
    return (
      <div className="space-y-6">
        <Link
          href="/admin/payments"
          data-testid="back-to-payments-link"
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

  const { payment, payerAccount, payeeAccount, ledgerTransaction, outboxEvents, kafkaAudits, reconciliationCases, notifications } = trace;

  const formattedAmount = formatMoney(payment.amountMinor, payment.currency);
  const formattedFee = formatMoney(payment.feeMinor, payment.currency);
  const formattedCreatedAt = new Date(payment.createdAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  });
  const formattedUpdatedAt = new Date(payment.updatedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  });

  return (
    <div
      data-testid="admin-investigation-container"
      className="space-y-8 max-w-7xl mx-auto pb-12"
    >
      {/* Navigation & Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/payments"
            data-testid="back-to-payments-link"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline min-h-[38px]"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Payments</span>
          </Link>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="investigation-refresh-button"
            aria-label="Refresh investigation trace"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[38px]"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>{isFetching ? "Refreshing..." : "Refresh Trace"}</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/80 flex items-center justify-center text-indigo-400 shadow-sm"
                aria-hidden="true"
              >
                <SearchCode className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Payment Investigation
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                  Authoritative multi-subsystem trace • Distributed Ledger & Transport Audit
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PaymentAdminStatusBadge status={payment.status} />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs text-zinc-300">
              <span className="text-zinc-500">ID:</span>
              <span>{payment.id}</span>
              <button
                type="button"
                onClick={() => handleCopy(payment.id, "paymentId")}
                aria-label="Copy Payment ID"
                className="text-zinc-400 hover:text-white transition-colors ml-1 focus:outline-none"
              >
                {copiedKey === "paymentId" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Lifecycle Timeline Component */}
      <InvestigationTimeline trace={trace} />

      {/* 2. Payment Summary Card */}
      <section
        data-testid="payment-summary-section"
        aria-labelledby="payment-summary-heading"
        className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
          <CreditCard className="w-4 h-4 text-indigo-400" aria-hidden="true" />
          <h2 id="payment-summary-heading" className="text-base font-semibold text-zinc-100">
            Payment Summary
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Settlement Amount</div>
            <div className="text-xl font-bold font-mono text-white" data-testid="detail-amount-value">
              {formattedAmount}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">Currency: {payment.currency}</div>
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Platform Fee</div>
            <div className="text-xl font-bold font-mono text-zinc-200" data-testid="detail-fee-value">
              {formattedFee}
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">Exact Minor Units: {payment.feeMinor}</div>
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Provider Reference</div>
            <div className="text-sm font-mono font-semibold text-zinc-200 truncate" title={payment.providerReference || "None"}>
              {payment.providerReference || "None"}
            </div>
            <div className="text-[11px] text-zinc-500">External Gateway Reference</div>
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/80 space-y-1">
            <div className="text-xs text-zinc-400 font-medium">Idempotency Governance</div>
            <div className="text-xs font-mono text-zinc-300 truncate" title={payment.idempotencyKey}>
              {payment.idempotencyKey}
            </div>
            <div className="text-[11px] text-zinc-500">Scope: {payment.idempotencyScope || "DEFAULT"}</div>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap gap-6 text-xs text-zinc-400">
          <div>
            <span className="text-zinc-500">Created:</span>{" "}
            <span className="font-mono text-zinc-300">{formattedCreatedAt}</span>
          </div>
          <div>
            <span className="text-zinc-500">Updated:</span>{" "}
            <span className="font-mono text-zinc-300">{formattedUpdatedAt}</span>
          </div>
        </div>
      </section>

      {/* 3. Account Context Section */}
      <section
        data-testid="account-context-section"
        aria-labelledby="account-context-heading"
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Building className="w-4 h-4 text-indigo-400" aria-hidden="true" />
          <h2 id="account-context-heading" className="text-base font-semibold text-zinc-100">
            Account Context
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Payer Account */}
          <div
            data-testid="payer-account-card"
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 font-mono">
                Payer Account
              </span>
              {payerAccount && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {payerAccount.status}
                </span>
              )}
            </div>

            {payerAccount ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Account ID</span>
                  <span className="font-mono text-zinc-200" data-testid="payer-account-id">{payerAccount.id}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Account Number</span>
                  <span className="font-mono text-zinc-200">{payerAccount.accountNumber}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Account Type</span>
                  <span className="font-mono text-zinc-200">{payerAccount.accountType}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-400">Materialized Balance</span>
                  <span className="font-mono font-bold text-white">
                    {formatMoney(payerAccount.materializedBalanceMinor, payerAccount.currency)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 py-4 text-center">
                Payer account record not found or inaccessible for ID: {payment.payerAccountId}
              </div>
            )}
          </div>

          {/* Payee Account */}
          <div
            data-testid="payee-account-card"
            className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                Payee Account
              </span>
              {payeeAccount && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {payeeAccount.status}
                </span>
              )}
            </div>

            {payeeAccount ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Account ID</span>
                  <span className="font-mono text-zinc-200" data-testid="payee-account-id">{payeeAccount.id}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Account Number</span>
                  <span className="font-mono text-zinc-200">{payeeAccount.accountNumber}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-400">Account Type</span>
                  <span className="font-mono text-zinc-200">{payeeAccount.accountType}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-zinc-400">Materialized Balance</span>
                  <span className="font-mono font-bold text-white">
                    {formatMoney(payeeAccount.materializedBalanceMinor, payeeAccount.currency)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500 py-4 text-center">
                Payee account record not found or inaccessible for ID: {payment.payeeAccountId}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Ledger Transaction & Double-Entry Section */}
      <section
        data-testid="ledger-transaction-section"
        aria-labelledby="ledger-section-heading"
        className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <h2 id="ledger-section-heading" className="text-base font-semibold text-zinc-100">
              Double-Entry Ledger Audit
            </h2>
          </div>
          {ledgerTransaction && (
            <span className="text-xs font-mono text-zinc-400">
              Tx ID: <span className="text-zinc-200 font-semibold">{ledgerTransaction.id}</span>
            </span>
          )}
        </div>

        {ledgerTransaction ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
              <div>
                <span className="text-zinc-500">Source Type:</span>{" "}
                <span className="font-mono text-zinc-200">{ledgerTransaction.sourceReferenceType}</span>
              </div>
              <div>
                <span className="text-zinc-500">Description:</span>{" "}
                <span className="text-zinc-300">{ledgerTransaction.description || "Payment Settlement"}</span>
              </div>
              <div>
                <span className="text-zinc-500">Posted At:</span>{" "}
                <span className="font-mono text-zinc-300">
                  {new Date(ledgerTransaction.createdAt).toLocaleString("en-US")}
                </span>
              </div>
            </div>

            {/* Entries Table */}
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table
                data-testid="ledger-entries-table"
                className="w-full text-left text-xs text-zinc-300"
              >
                <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-[11px] uppercase border-b border-zinc-800">
                  <tr>
                    <th scope="col" className="py-2.5 px-3">Seq</th>
                    <th scope="col" className="py-2.5 px-3">Entry ID</th>
                    <th scope="col" className="py-2.5 px-3">Account ID</th>
                    <th scope="col" className="py-2.5 px-3">Direction</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Amount</th>
                    <th scope="col" className="py-2.5 px-3">Currency</th>
                    <th scope="col" className="py-2.5 px-3">Created At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {ledgerTransaction.entries && ledgerTransaction.entries.length > 0 ? (
                    ledgerTransaction.entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-zinc-400">{entry.sequenceNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-zinc-400">{entry.id}</td>
                        <td className="py-2.5 px-3 font-mono text-zinc-200">{entry.accountId}</td>
                        <td className="py-2.5 px-3">
                          <LedgerDirectionBadge direction={entry.direction} />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-right text-white">
                          {formatMoney(entry.amountMinor, entry.currency)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-zinc-400">{entry.currency}</td>
                        <td className="py-2.5 px-3 font-mono text-zinc-500">
                          {new Date(entry.createdAt).toLocaleTimeString("en-US")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-zinc-500">
                        No individual ledger entries recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-lg border border-dashed border-zinc-800">
            No double-entry ledger transaction has been posted for this payment.
          </div>
        )}
      </section>

      {/* 5. Transactional Outbox Events Section */}
      <section
        data-testid="outbox-events-section"
        aria-labelledby="outbox-section-heading"
        className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <h2 id="outbox-section-heading" className="text-base font-semibold text-zinc-100">
              Transactional Outbox Events
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {outboxEvents?.length || 0} Event(s)
          </span>
        </div>

        {outboxEvents && outboxEvents.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-[11px] uppercase border-b border-zinc-800">
                <tr>
                  <th scope="col" className="py-2.5 px-3">Event ID</th>
                  <th scope="col" className="py-2.5 px-3">Event Type</th>
                  <th scope="col" className="py-2.5 px-3">Topic</th>
                  <th scope="col" className="py-2.5 px-3">Status</th>
                  <th scope="col" className="py-2.5 px-3">Created At</th>
                  <th scope="col" className="py-2.5 px-3">Published At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {outboxEvents.map((evt) => (
                  <tr key={evt.eventId} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-zinc-400">{evt.eventId}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-200">{evt.eventType}</td>
                    <td className="py-2.5 px-3 font-mono text-indigo-300">{evt.topic}</td>
                    <td className="py-2.5 px-3">
                      <OutboxStatusBadge status={evt.status} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">
                      {new Date(evt.createdAt).toLocaleString("en-US")}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">
                      {evt.publishedAt ? new Date(evt.publishedAt).toLocaleString("en-US") : "Unpublished"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-lg border border-dashed border-zinc-800">
            No transactional outbox events recorded for this payment.
          </div>
        )}
      </section>

      {/* 6. Kafka Consumer Audit Section */}
      <section
        data-testid="kafka-audit-section"
        aria-labelledby="kafka-audit-heading"
        className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <h2 id="kafka-audit-heading" className="text-base font-semibold text-zinc-100">
              Kafka Transport Audit
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {kafkaAudits?.length || 0} Consumer Record(s)
          </span>
        </div>

        {/* Transport architecture notice */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-sky-950/40 border border-sky-900/60 text-sky-200 text-xs">
          <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong className="font-semibold text-sky-100">Transport Audit Evidence:</strong> Kafka audit records represent asynchronous messaging transport evidence verified by the platform backend. Kafka serves as transport infrastructure and is not the financial source of truth.
          </p>
        </div>

        {kafkaAudits && kafkaAudits.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-[11px] uppercase border-b border-zinc-800">
                <tr>
                  <th scope="col" className="py-2.5 px-3">Audit ID</th>
                  <th scope="col" className="py-2.5 px-3">Event ID</th>
                  <th scope="col" className="py-2.5 px-3">Event Type</th>
                  <th scope="col" className="py-2.5 px-3">Correlation ID</th>
                  <th scope="col" className="py-2.5 px-3">Consumed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {kafkaAudits.map((k) => (
                  <tr key={k.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-zinc-400">{k.id}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">{k.eventId}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-200">{k.eventType}</td>
                    <td className="py-2.5 px-3 font-mono text-indigo-300">{k.correlationId || "None"}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">
                      {k.createdAt ? new Date(k.createdAt).toLocaleString("en-US") : "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-lg border border-dashed border-zinc-800">
            No Kafka consumer audit records captured for this payment.
          </div>
        )}
      </section>

      {/* 7. Reconciliation Cases Section */}
      <section
        data-testid="reconciliation-section"
        aria-labelledby="recon-heading"
        className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <h2 id="recon-heading" className="text-base font-semibold text-zinc-100">
              Reconciliation Cases (Read-Only)
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {reconciliationCases?.length || 0} Case(s)
          </span>
        </div>

        {reconciliationCases && reconciliationCases.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-[11px] uppercase border-b border-zinc-800">
                <tr>
                  <th scope="col" className="py-2.5 px-3">Case ID</th>
                  <th scope="col" className="py-2.5 px-3">Operation Type</th>
                  <th scope="col" className="py-2.5 px-3">Local Status</th>
                  <th scope="col" className="py-2.5 px-3">Recon Status</th>
                  <th scope="col" className="py-2.5 px-3">Discrepancy</th>
                  <th scope="col" className="py-2.5 px-3">Attempts</th>
                  <th scope="col" className="py-2.5 px-3">Correlation ID</th>
                  <th scope="col" className="py-2.5 px-3">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {reconciliationCases.map((rc) => (
                  <tr key={rc.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-zinc-400">{rc.id}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-200">{rc.operationType}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-300">{rc.localStatus}</td>
                    <td className="py-2.5 px-3">
                      <ReconciliationStatusBadge status={rc.reconciliationStatus} />
                    </td>
                    <td className="py-2.5 px-3 text-zinc-300">{rc.discrepancyType || "Standard"}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">{rc.attemptCount}</td>
                    <td className="py-2.5 px-3 font-mono text-indigo-300">{rc.correlationId || "None"}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">
                      {new Date(rc.createdAt).toLocaleString("en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-lg border border-dashed border-zinc-800">
            No reconciliation discrepancy recorded. Payment settled without automated reconciliation intervention.
          </div>
        )}
      </section>

      {/* 8. Notification Dispatches Section */}
      <section
        data-testid="notifications-section"
        aria-labelledby="notifications-heading"
        className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <h2 id="notifications-heading" className="text-base font-semibold text-zinc-100">
              Notification Trace (Read-Only)
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            {notifications?.length || 0} Dispatch(es)
          </span>
        </div>

        {notifications && notifications.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-950/80 text-zinc-400 font-mono text-[11px] uppercase border-b border-zinc-800">
                <tr>
                  <th scope="col" className="py-2.5 px-3">Notification ID</th>
                  <th scope="col" className="py-2.5 px-3">Channel</th>
                  <th scope="col" className="py-2.5 px-3">Status</th>
                  <th scope="col" className="py-2.5 px-3">Recipient</th>
                  <th scope="col" className="py-2.5 px-3">Attempts</th>
                  <th scope="col" className="py-2.5 px-3">Next Attempt</th>
                  <th scope="col" className="py-2.5 px-3">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-zinc-400">{n.id}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-zinc-200">{n.channel}</td>
                    <td className="py-2.5 px-3">
                      <NotificationStatusBadge status={n.status} />
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-300">{n.recipientRedacted || "Redacted"}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-400">{n.attemptCount}</td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">
                      {n.nextAttemptAt ? new Date(n.nextAttemptAt).toLocaleString("en-US") : "None"}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-500">
                      {new Date(n.createdAt).toLocaleString("en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-lg border border-dashed border-zinc-800">
            No notification dispatches recorded for this payment.
          </div>
        )}
      </section>
    </div>
  );
}
