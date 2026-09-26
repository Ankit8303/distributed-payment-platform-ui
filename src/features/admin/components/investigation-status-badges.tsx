"use client";

import React from "react";
import type { LedgerEntryDirection } from "@/types/admin";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";

export function LedgerDirectionBadge({ direction }: { direction: LedgerEntryDirection | string }) {
  const isDebit = direction === "DEBIT";
  return (
    <span
      role="status"
      data-testid={`ledger-direction-badge-${direction.toLowerCase()}`}
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
        isDebit
          ? "bg-sky-950/80 text-sky-300 border-sky-800/80"
          : "bg-emerald-950/80 text-emerald-300 border-emerald-800/80"
      }`}
    >
      {isDebit ? (
        <ArrowDownLeft className="w-3 h-3 text-sky-400" aria-hidden="true" />
      ) : (
        <ArrowUpRight className="w-3 h-3 text-emerald-400" aria-hidden="true" />
      )}
      <span>{direction}</span>
    </span>
  );
}

export function OutboxStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const isPublished = normalized === "PUBLISHED";
  const isPending = normalized === "PENDING";
  const isFailed = normalized === "FAILED";

  let colorClasses = "bg-zinc-800 text-zinc-300 border-zinc-700";
  let Icon = Clock;

  if (isPublished) {
    colorClasses = "bg-emerald-950/80 text-emerald-300 border-emerald-800/80";
    Icon = CheckCircle;
  } else if (isPending) {
    colorClasses = "bg-amber-950/80 text-amber-300 border-amber-800/80";
    Icon = Clock;
  } else if (isFailed) {
    colorClasses = "bg-rose-950/80 text-rose-300 border-rose-800/80";
    Icon = XCircle;
  }

  return (
    <span
      role="status"
      data-testid={`outbox-status-badge-${status.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

export function ReconciliationStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const isResolved = normalized === "RESOLVED";
  const isPending = normalized === "OPEN" || normalized === "IN_PROGRESS";
  const isManual = normalized === "MANUAL_REVIEW" || normalized === "RETRY_REQUIRED";

  let colorClasses = "bg-zinc-800 text-zinc-300 border-zinc-700";
  let Icon = Clock;

  if (isResolved) {
    colorClasses = "bg-emerald-950/80 text-emerald-300 border-emerald-800/80";
    Icon = CheckCircle;
  } else if (isPending) {
    colorClasses = "bg-blue-950/80 text-blue-300 border-blue-800/80";
    Icon = Clock;
  } else if (isManual) {
    colorClasses = "bg-amber-950/80 text-amber-300 border-amber-800/80";
    Icon = AlertTriangle;
  }

  return (
    <span
      role="status"
      data-testid={`recon-status-badge-${status.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

export function NotificationStatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const isSent = normalized === "SENT";
  const isPending = normalized === "PENDING";
  const isFailed = normalized === "FAILED";

  let colorClasses = "bg-zinc-800 text-zinc-300 border-zinc-700";
  let Icon = Clock;

  if (isSent) {
    colorClasses = "bg-emerald-950/80 text-emerald-300 border-emerald-800/80";
    Icon = CheckCircle;
  } else if (isPending) {
    colorClasses = "bg-amber-950/80 text-amber-300 border-amber-800/80";
    Icon = Clock;
  } else if (isFailed) {
    colorClasses = "bg-rose-950/80 text-rose-300 border-rose-800/80";
    Icon = XCircle;
  }

  return (
    <span
      role="status"
      data-testid={`notification-status-badge-${status.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}
