"use client";

import React from "react";
import type { PaymentStatus } from "@/types/admin";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Loader2,
  HelpCircle,
} from "lucide-react";

export interface PaymentStatusBadgeProps {
  status: PaymentStatus | string;
  className?: string;
}

interface StatusConfig {
  label: string;
  className: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  SETTLED: {
    label: "Settled",
    className:
      "bg-emerald-950/80 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60",
    icon: CheckCircle,
  },
  PENDING_RECONCILIATION: {
    label: "Pending Reconciliation",
    className:
      "bg-amber-950/80 text-amber-300 border-amber-800/80 hover:bg-amber-900/60",
    icon: Clock,
  },
  FAILED: {
    label: "Failed",
    className:
      "bg-rose-950/80 text-rose-300 border-rose-800/80 hover:bg-rose-900/60",
    icon: XCircle,
  },
  DECLINED: {
    label: "Declined",
    className:
      "bg-rose-950/80 text-rose-300 border-rose-800/80 hover:bg-rose-900/60",
    icon: AlertCircle,
  },
  EXPIRED: {
    label: "Expired",
    className:
      "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700/60",
    icon: AlertTriangle,
  },
  AUTHORIZED: {
    label: "Authorized",
    className:
      "bg-blue-950/80 text-blue-300 border-blue-800/80 hover:bg-blue-900/60",
    icon: CheckCircle,
  },
  AUTHORIZING: {
    label: "Authorizing",
    className:
      "bg-blue-950/80 text-blue-300 border-blue-800/80 hover:bg-blue-900/60",
    icon: Loader2,
  },
  CAPTURING: {
    label: "Capturing",
    className:
      "bg-indigo-950/80 text-indigo-300 border-indigo-800/80 hover:bg-indigo-900/60",
    icon: Loader2,
  },
  CREATED: {
    label: "Created",
    className:
      "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700/60",
    icon: Loader2,
  },
};

export const PaymentAdminStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  status,
  className = "",
}) => {
  const normalizedStatus = (status || "").toUpperCase();
  const config = STATUS_CONFIGS[normalizedStatus] || {
    label: status || "Unknown",
    className: "bg-zinc-800 text-zinc-300 border-zinc-700",
    icon: HelpCircle,
  };

  const Icon = config.icon;

  return (
    <span
      role="status"
      aria-label={`Status: ${config.label}`}
      data-testid={`payment-status-badge-${normalizedStatus.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border font-mono tracking-wide ${config.className} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};
