"use client";

import React from "react";
import type {
  ReconciliationStatus,
  DiscrepancyType,
  ReconciliationOperationType,
} from "@/types/admin";

export interface ReconciliationStatusBadgeProps {
  status: ReconciliationStatus | string;
  className?: string;
}

export function ReconciliationStatusBadge({
  status,
  className = "",
}: ReconciliationStatusBadgeProps) {
  let badgeStyles = "border-zinc-800 bg-zinc-900/60 text-zinc-400";
  let label = status;

  switch (status) {
    case "OPEN":
      badgeStyles = "border-amber-800/80 bg-amber-950/40 text-amber-300";
      label = "Open";
      break;
    case "IN_PROGRESS":
      badgeStyles = "border-sky-800/80 bg-sky-950/40 text-sky-300";
      label = "In Progress";
      break;
    case "RETRY_REQUIRED":
      badgeStyles = "border-rose-800/80 bg-rose-950/40 text-rose-300";
      label = "Retry Required";
      break;
    case "RESOLVED":
      badgeStyles = "border-emerald-800/80 bg-emerald-950/40 text-emerald-300";
      label = "Resolved";
      break;
    case "MANUAL_REVIEW":
      badgeStyles = "border-purple-800/80 bg-purple-950/40 text-purple-300";
      label = "Manual Review";
      break;
    default:
      label = status || "Unknown";
      break;
  }

  return (
    <span
      data-testid="reconciliation-status-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeStyles} ${className}`}
    >
      {label}
    </span>
  );
}

export interface DiscrepancyBadgeProps {
  type: DiscrepancyType | string | null | undefined;
  className?: string;
}

const DISCREPANCY_LABELS: Record<string, string> = {
  PROVIDER_SUCCESS_LOCAL_PENDING: "Provider Success / Local Pending",
  PROVIDER_FAILURE_LOCAL_PENDING: "Provider Failure / Local Pending",
  PROVIDER_UNKNOWN: "Provider Unknown",
  PROVIDER_MISMATCH: "Provider Mismatch",
  LOCAL_FINANCIAL_STATE_MISSING: "Missing Local State",
  LEDGER_STATE_MISMATCH: "Ledger State Mismatch",
  DUPLICATE_OPERATION: "Duplicate Operation",
  ALREADY_RESOLVED: "Already Resolved",
  NON_RECONCILABLE: "Non-Reconcilable",
};

export function DiscrepancyBadge({
  type,
  className = "",
}: DiscrepancyBadgeProps) {
  if (!type) {
    return <span className="text-xs text-zinc-500 font-mono">—</span>;
  }

  const label = DISCREPANCY_LABELS[type] || type.replace(/_/g, " ");

  return (
    <span
      data-testid="discrepancy-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border border-zinc-800 bg-zinc-900/80 text-zinc-300 ${className}`}
    >
      {label}
    </span>
  );
}

export interface OperationTypeBadgeProps {
  operationType: ReconciliationOperationType | string;
  className?: string;
}

export function OperationTypeBadge({
  operationType,
  className = "",
}: OperationTypeBadgeProps) {
  let color = "text-zinc-400 border-zinc-800 bg-zinc-900/60";

  switch (operationType) {
    case "PAYMENT":
      color = "text-indigo-400 border-indigo-900/60 bg-indigo-950/40";
      break;
    case "REFUND":
      color = "text-amber-400 border-amber-900/60 bg-amber-950/40";
      break;
    case "PAYOUT":
      color = "text-cyan-400 border-cyan-900/60 bg-cyan-950/40";
      break;
    case "REVERSAL":
      color = "text-rose-400 border-rose-900/60 bg-rose-950/40";
      break;
  }

  return (
    <span
      data-testid="operation-type-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${color} ${className}`}
    >
      {operationType}
    </span>
  );
}
