"use client";

import React from "react";
import type { AccountStatus } from "@/types/account";
import { CheckCircle, Lock, XCircle, HelpCircle } from "lucide-react";

export interface AccountStatusBadgeProps {
  status: AccountStatus | string;
  className?: string;
}

interface StatusConfig {
  label: string;
  className: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  ACTIVE: {
    label: "Active",
    className:
      "bg-emerald-950/80 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/60",
    icon: CheckCircle,
  },
  FROZEN: {
    label: "Frozen",
    className:
      "bg-rose-950/80 text-rose-300 border-rose-800/80 hover:bg-rose-900/60",
    icon: Lock,
  },
  CLOSED: {
    label: "Closed",
    className:
      "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700/60",
    icon: XCircle,
  },
};

export const AccountAdminStatusBadge: React.FC<AccountStatusBadgeProps> = ({
  status,
  className = "",
}) => {
  const normalizedStatus = (status || "").toUpperCase();
  const config = STATUS_CONFIGS[normalizedStatus] || {
    label: status || "Unknown",
    className: "bg-zinc-800 text-zinc-400 border-zinc-700",
    icon: HelpCircle,
  };

  const Icon = config.icon;

  return (
    <span
      data-testid="account-status-badge"
      aria-label={`Account Status: ${config.label}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold tracking-wide border shadow-xs transition-colors ${config.className} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
};
