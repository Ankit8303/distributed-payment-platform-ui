"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useAdminAccount } from "@/features/admin/hooks/use-admin-account";
import { AccountAdminStatusBadge } from "@/features/admin/components/account-status-badge";
import { AccountBalanceConsistency } from "@/features/admin/components/account-balance-consistency";
import { AccountLifecycleModal } from "@/features/admin/components/account-lifecycle-modal";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import { formatMinorUnits } from "@/lib/formatting/money";
import type { ApiError } from "@/lib/api/client";
import {
  ArrowLeft,
  RefreshCw,
  Copy,
  Check,
  Building,
  Coins,
  Shield,
  Clock,
  FileQuestion,
  Lock,
  Unlock,
  CheckCircle2,
  X,
  BookOpen,
  Layers,
  ShieldCheck,
  FileText,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface AdminAccountInspectorContentProps {
  verifiedTransactionId?: string;
}

function AdminAccountInspectorContent({
  verifiedTransactionId: initialTxId,
}: AdminAccountInspectorContentProps = {}) {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const rawId = params?.id;
  const accountId = typeof rawId === "string" ? rawId.trim() : "";
  const verifiedTransactionId = initialTxId || searchParams?.get("transactionId") || undefined;

  const {
    data: account,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminAccount(accountId);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyAnnouncement, setCopyAnnouncement] = useState<string>("");
  const [lifecycleAction, setLifecycleAction] = useState<"FREEZE" | "UNFREEZE" | null>(null);
  const [lifecycleSuccessMsg, setLifecycleSuccessMsg] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setCopyAnnouncement(`Copied ${label} to clipboard`);
    setTimeout(() => {
      setCopiedKey(null);
      setCopyAnnouncement("");
    }, 2000);
  };

  const formatUtcDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return (
        d.toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "medium",
          timeZone: "UTC",
        }) + " UTC"
      );
    } catch {
      return dateStr;
    }
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div
        data-testid="admin-account-inspector-loading"
        className="space-y-8 animate-pulse"
      >
        <span className="sr-only">Loading account details...</span>
        {/* Navigation skeleton */}
        <div className="h-4 w-32 bg-zinc-800 rounded" />
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-zinc-800 rounded" />
            <div className="h-4 w-96 bg-zinc-900 rounded" />
          </div>
          <div className="h-10 w-28 bg-zinc-800 rounded-lg" />
        </div>
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-zinc-900/60 rounded-xl border border-zinc-800" />
          <div className="h-64 bg-zinc-900/60 rounded-xl border border-zinc-800" />
          <div className="h-56 bg-zinc-900/60 rounded-xl border border-zinc-800" />
          <div className="h-56 bg-zinc-900/60 rounded-xl border border-zinc-800" />
        </div>
      </div>
    );
  }

  // 2. 404 Not Found State
  const is404 =
    (error && "status" in error && (error as ApiError).status === 404) ||
    (!isLoading && !account && !isError && Boolean(accountId));

  if (is404) {
    return (
      <div className="space-y-6" data-testid="admin-account-not-found">
        <div>
          <Link
            href="/admin/accounts"
            data-testid="back-to-accounts-link"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Accounts</span>
          </Link>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-12 text-center max-w-2xl mx-auto shadow-sm">
          <div className="mx-auto w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 mb-4">
            <FileQuestion className="w-6 h-6 text-amber-400" aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Account Not Found</h2>
          <p className="text-sm text-zinc-400 mt-2">
            The account with identifier{" "}
            <span className="font-mono text-zinc-200 bg-zinc-800/80 px-2 py-0.5 rounded border border-zinc-700/60">
              {accountId || "unknown"}
            </span>{" "}
            could not be found in the authoritative ledger directory.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/accounts"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Return to Account Directory</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. General Error State
  if (isError || !account) {
    return (
      <div className="space-y-6" data-testid="admin-account-error-container">
        <div>
          <Link
            href="/admin/accounts"
            data-testid="back-to-accounts-link"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Accounts</span>
          </Link>
        </div>

        <AdminErrorState
          error={error}
          title="Failed to Load Account Record"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  // 4. Formatted values
  const formattedBalance = formatMinorUnits(
    account.materializedBalanceMinor,
    account.currency
  );

  return (
    <div
      data-testid="admin-account-inspector-container"
      className="space-y-8 max-w-7xl mx-auto pb-12"
    >
      {/* Screen Reader Announcement for Copy */}
      <div aria-live="polite" className="sr-only">
        {copyAnnouncement}
      </div>

      {/* Top Breadcrumb & Navigation */}
      <div className="space-y-3">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400">
          <Link
            href="/admin/dashboard"
            className="hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
          >
            Admin
          </Link>
          <span className="text-zinc-600">/</span>
          <Link
            href="/admin/accounts"
            data-testid="breadcrumb-accounts-link"
            className="hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
          >
            Accounts
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="font-mono text-zinc-300" aria-current="page">
            {account.accountNumber || account.id}
          </span>
        </nav>

        <div>
          <Link
            href="/admin/accounts"
            data-testid="back-to-accounts-link"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none focus-visible:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Accounts</span>
          </Link>
        </div>
      </div>

      {/* Lifecycle Success Banner */}
      {lifecycleSuccessMsg && (
        <div
          role="status"
          aria-live="polite"
          data-testid="lifecycle-success-banner"
          className="rounded-lg border border-emerald-900/80 bg-emerald-950/40 p-4 text-emerald-200 flex items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>{lifecycleSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setLifecycleSuccessMsg(null)}
            aria-label="Dismiss confirmation"
            className="p-1 rounded text-emerald-400 hover:text-emerald-200 hover:bg-emerald-900/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Account Header Section */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-zinc-800">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Account Inspector
            </h1>
            <div data-testid="detail-account-status">
              <AccountAdminStatusBadge status={account.status} />
            </div>
            <span
              data-testid="detail-account-type-badge"
              className="inline-flex px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-800/90 text-zinc-300 border border-zinc-700/80 tracking-wide uppercase"
            >
              {account.accountType}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Authoritative inspection view for account{" "}
            <span className="font-semibold text-zinc-200">
              {account.accountNumber}
            </span>{" "}
            ({account.currency})
          </p>
        </div>

        <div className="flex items-center gap-3">
          {account.status === "ACTIVE" && (
            <button
              type="button"
              onClick={() => setLifecycleAction("FREEZE")}
              aria-label="Freeze account"
              data-testid="freeze-account-button"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-950/80 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 transition-colors shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Freeze Account</span>
            </button>
          )}

          {account.status === "FROZEN" && (
            <button
              type="button"
              onClick={() => setLifecycleAction("UNFREEZE")}
              aria-label="Unfreeze account"
              data-testid="unfreeze-account-button"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 transition-colors shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Unfreeze Account</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh account record"
            data-testid="refresh-account-button"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-indigo-400" : ""}`}
              aria-hidden="true"
            />
            <span>{isFetching ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </header>

      {/* Phase F7-G-D Balance Consistency Section */}
      <AccountBalanceConsistency
        accountId={account.id}
        accountNumber={account.accountNumber}
      />

      {/* Main Inspection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Account Identity */}
        <section
          aria-labelledby="identity-heading"
          data-testid="section-account-identity"
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-5 shadow-xs"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800/80">
            <Building className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <h2 id="identity-heading" className="text-sm font-semibold tracking-tight text-white">
              Account Identity
            </h2>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Account Number */}
            <div className="space-y-1">
              <dt className="text-zinc-400 font-medium">Account Number</dt>
              <dd className="flex items-center gap-2">
                <span
                  data-testid="detail-account-number"
                  className="font-mono font-semibold text-zinc-100 text-sm"
                >
                  {account.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(account.accountNumber, "Account Number")}
                  aria-label="Copy account number"
                  data-testid="copy-account-number-button"
                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                >
                  {copiedKey === "Account Number" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </dd>
            </div>

            {/* Account Type */}
            <div className="space-y-1">
              <dt className="text-zinc-400 font-medium">Account Type</dt>
              <dd>
                <span
                  data-testid="detail-account-type"
                  className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700"
                >
                  {account.accountType}
                </span>
              </dd>
            </div>

            {/* Account ID */}
            <div className="sm:col-span-2 space-y-1">
              <dt className="text-zinc-400 font-medium">Account ID (UUID)</dt>
              <dd className="flex items-center gap-2">
                <span
                  data-testid="detail-account-id"
                  className="font-mono text-zinc-300 bg-zinc-950/80 px-2.5 py-1 rounded border border-zinc-800 text-xs break-all"
                >
                  {account.id}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(account.id, "Account ID")}
                  aria-label="Copy account ID"
                  data-testid="copy-account-id-button"
                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                >
                  {copiedKey === "Account ID" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </dd>
            </div>

            {/* Owner ID */}
            <div className="sm:col-span-2 space-y-1">
              <dt className="text-zinc-400 font-medium">Owner ID</dt>
              <dd className="flex items-center gap-2">
                <span
                  data-testid="detail-owner-id"
                  className="font-mono text-zinc-300 bg-zinc-950/80 px-2.5 py-1 rounded border border-zinc-800 text-xs break-all"
                >
                  {account.ownerId}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(account.ownerId, "Owner ID")}
                  aria-label="Copy owner ID"
                  data-testid="copy-owner-id-button"
                  className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                >
                  {copiedKey === "Owner ID" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </dd>
            </div>

            {/* Currency */}
            <div className="space-y-1">
              <dt className="text-zinc-400 font-medium">Currency</dt>
              <dd
                data-testid="detail-currency"
                className="font-mono font-semibold text-zinc-100"
              >
                {account.currency}
              </dd>
            </div>

            {/* Status */}
            <div className="space-y-1">
              <dt className="text-zinc-400 font-medium">Status</dt>
              <dd data-testid="detail-status">
                <AccountAdminStatusBadge status={account.status} />
              </dd>
            </div>
          </dl>
        </section>

        {/* Card 2: Financial Information */}
        <section
          aria-labelledby="financial-heading"
          data-testid="section-financial-balance"
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-5 shadow-xs flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800/80">
              <Coins className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <h2 id="financial-heading" className="text-sm font-semibold tracking-tight text-white">
                Financial Balance
              </h2>
            </div>

            <div className="space-y-1 pt-1">
              <div className="text-xs text-zinc-400 font-medium">
                Materialized Balance ({account.currency})
              </div>
              <div
                data-testid="detail-materialized-balance"
                className="text-3xl font-extrabold tracking-tight text-white font-mono"
              >
                {formattedBalance}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                {account.materializedBalanceMinor.toLocaleString()} minor units
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-950/70 border border-zinc-800/80 p-3.5 text-xs text-zinc-400 space-y-1.5 mt-4">
            <div className="flex items-center gap-2 text-zinc-300 font-medium">
              <Shield className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
              <span>Authoritative Ledger Value</span>
            </div>
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Materialized balance is the persistent accounting balance recorded in PostgreSQL. Independent ledger balance verification and dual-balance consistency audits are governed under Phase F7-G-D.
            </p>
          </div>
        </section>

        {/* Card 3: Account Lifecycle & Status */}
        <section
          aria-labelledby="lifecycle-heading"
          data-testid="section-account-lifecycle"
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xs"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800/80">
            <Shield className="w-4 h-4 text-indigo-400" aria-hidden="true" />
            <h2 id="lifecycle-heading" className="text-sm font-semibold tracking-tight text-white">
              Lifecycle & Governance
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 font-medium">Operational Status:</span>
              <AccountAdminStatusBadge status={account.status} />
            </div>

            <p className="text-zinc-400 text-xs leading-relaxed">
              {account.status === "ACTIVE" &&
                "Account is operational and authorized to originate and receive financial transactions."}
              {account.status === "FROZEN" &&
                "Account is administratively frozen. New outbound transactions and settlements are blocked pending operator clearance."}
              {account.status === "CLOSED" &&
                "Account is permanently closed. No further balance mutations or transactions are permissible."}
            </p>

            <div className="pt-3 border-t border-zinc-800/80">
              {account.status === "ACTIVE" && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Lifecycle Action:</span>
                  <button
                    type="button"
                    onClick={() => setLifecycleAction("FREEZE")}
                    aria-label="Freeze account"
                    data-testid="card-freeze-account-button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/80 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 transition-colors shadow-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-500"
                  >
                    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Freeze Account</span>
                  </button>
                </div>
              )}

              {account.status === "FROZEN" && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 font-medium">Lifecycle Action:</span>
                  <button
                    type="button"
                    onClick={() => setLifecycleAction("UNFREEZE")}
                    aria-label="Unfreeze account"
                    data-testid="card-unfreeze-account-button"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/80 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 transition-colors shadow-xs focus:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                  >
                    <Unlock className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Unfreeze Account</span>
                  </button>
                </div>
              )}

              {account.status === "CLOSED" && (
                <div
                  data-testid="closed-account-notice"
                  className="rounded-lg bg-zinc-950/50 border border-zinc-800/80 p-3 text-[11px] text-zinc-500"
                >
                  Account is permanently closed. Lifecycle mutations are disabled.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Card 4: Audit & Record Metadata */}
        <section
          aria-labelledby="metadata-heading"
          data-testid="section-record-metadata"
          className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xs"
        >
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800/80">
            <Clock className="w-4 h-4 text-purple-400" aria-hidden="true" />
            <h2 id="metadata-heading" className="text-sm font-semibold tracking-tight text-white">
              Audit & Record Metadata
            </h2>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Version */}
            <div className="sm:col-span-2 space-y-1">
              <dt className="text-zinc-400 font-medium">Record Version</dt>
              <dd
                data-testid="detail-version"
                className="font-mono text-zinc-200 text-xs"
              >
                v{account.version}
              </dd>
            </div>

            {/* Created At */}
            <div className="space-y-1">
              <dt className="text-zinc-400 font-medium">Created At</dt>
              <dd>
                <div
                  data-testid="detail-created-at"
                  className="text-zinc-200 font-medium text-xs"
                >
                  {formatUtcDateTime(account.createdAt)}
                </div>
                <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
                  {account.createdAt}
                </div>
              </dd>
            </div>

            {/* Updated At */}
            <div className="space-y-1">
              <dt className="text-zinc-400 font-medium">Last Updated</dt>
              <dd>
                <div
                  data-testid="detail-updated-at"
                  className="text-zinc-200 font-medium text-xs"
                >
                  {formatUtcDateTime(account.updatedAt)}
                </div>
                <div className="font-mono text-[10px] text-zinc-500 mt-0.5">
                  {account.updatedAt}
                </div>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {/* Section 5: Ledger & Audit Navigation (Phase F7-G-F) */}
      <section
        aria-labelledby="ledger-audit-heading"
        data-testid="section-ledger-audit"
        className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 shadow-xs"
      >
        <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800/80">
          <BookOpen className="w-4 h-4 text-indigo-400" aria-hidden="true" />
          <h2 id="ledger-audit-heading" className="text-sm font-semibold tracking-tight text-white">
            Ledger & Audit
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sub-card 1: Ledger Navigation */}
          <div
            data-testid="ledger-navigation-card"
            className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-4 flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" aria-hidden="true" />
                <h3 className="text-xs font-semibold text-zinc-200">Account Ledger</h3>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Inspect the chronological double-entry ledger legs and sequence numbers recorded for this account.
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 flex flex-col gap-2">
              <Link
                href={`/admin/ledger/accounts/${encodeURIComponent(account.id)}`}
                data-testid="view-account-ledger-link"
                aria-label="View Account Ledger"
                prefetch={false}
                className="inline-flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition-colors shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" />
                  <span>View Account Ledger</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
              </Link>

              {verifiedTransactionId ? (
                <Link
                  href={`/admin/ledger/transactions/${encodeURIComponent(verifiedTransactionId)}`}
                  data-testid="view-ledger-transaction-link"
                  aria-label={`View Ledger Transaction ${verifiedTransactionId}`}
                  prefetch={false}
                  className="inline-flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 transition-colors shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 font-mono"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <ExternalLink className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                    <span className="truncate">Transaction: {verifiedTransactionId}</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                </Link>
              ) : (
                <p
                  data-testid="no-transaction-drilldown-notice"
                  className="text-[11px] text-zinc-500 italic"
                >
                  Select an entry in the Account Ledger to drill into transaction details.
                </p>
              )}
            </div>
          </div>

          {/* Sub-card 2: Audit History Navigation */}
          <div
            data-testid="audit-navigation-card"
            className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-4 flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" aria-hidden="true" />
                <h3 className="text-xs font-semibold text-zinc-200">Account Audit Trail</h3>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Inspect immutable security and governance event logs recorded for this account resource.
              </p>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 flex flex-col gap-2">
              <Link
                href={`/admin/audit?resourceType=ACCOUNT&resourceId=${encodeURIComponent(account.id)}`}
                data-testid="view-account-audit-link"
                aria-label="View Account Audit History"
                prefetch={false}
                className="inline-flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition-colors shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-400" aria-hidden="true" />
                  <span>View Account Audit History</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
              </Link>

              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <span>Scope:</span>
                <span className="font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                  resourceType=ACCOUNT
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Account Lifecycle Action Modal (Phase F7-G-E) */}
      {lifecycleAction && (
        <AccountLifecycleModal
          isOpen={Boolean(lifecycleAction)}
          action={lifecycleAction}
          accountId={account.id}
          accountNumber={account.accountNumber}
          currentStatus={account.status}
          onClose={() => setLifecycleAction(null)}
          onSuccess={(updated) => {
            setLifecycleSuccessMsg(
              `Account ${updated.accountNumber} was successfully ${
                lifecycleAction === "FREEZE" ? "frozen" : "unfrozen"
              }.`
            );
            refetch();
          }}
        />
      )}
    </div>
  );
}

export default function AdminAccountInspectorPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 animate-pulse max-w-6xl mx-auto">
          <div className="h-8 w-48 bg-zinc-800 rounded" />
          <div className="h-32 bg-zinc-900 rounded-xl border border-zinc-800" />
          <div className="h-64 bg-zinc-900 rounded-xl border border-zinc-800" />
        </div>
      }
    >
      <AdminAccountInspectorContent />
    </Suspense>
  );
}
