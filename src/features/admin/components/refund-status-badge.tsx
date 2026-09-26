"use client";

import React from "react";
import type { RefundStatus } from "@/types/admin";

export interface AdminRefundStatusBadgeProps {
  status: RefundStatus | string;
  className?: string;
}

export function AdminRefundStatusBadge({
  status,
  className = "",
}: AdminRefundStatusBadgeProps) {
  let badgeStyles = "border-zinc-800 bg-zinc-900/60 text-zinc-400";
  let label = status;

  switch (status) {
    case "SETTLED":
    case "SUCCEEDED":
      badgeStyles = "border-emerald-800/80 bg-emerald-950/40 text-emerald-300";
      label = "Settled";
      break;
    case "PROCESSING":
      badgeStyles = "border-blue-800/80 bg-blue-950/40 text-blue-300";
      label = "Processing";
      break;
    case "REQUESTED":
    case "PENDING":
      badgeStyles = "border-amber-800/80 bg-amber-950/40 text-amber-300";
      label = "Requested";
      break;
    case "PENDING_RECONCILIATION":
      badgeStyles = "border-purple-800/80 bg-purple-950/40 text-purple-300";
      label = "Pending Reconciliation";
      break;
    case "FAILED":
      badgeStyles = "border-rose-800/80 bg-rose-950/40 text-rose-300";
      label = "Failed";
      break;
    default:
      label = status || "Unknown";
      break;
  }

  return (
    <span
      data-testid="admin-refund-status-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeStyles} ${className}`}
    >
      {label}
    </span>
  );
}
