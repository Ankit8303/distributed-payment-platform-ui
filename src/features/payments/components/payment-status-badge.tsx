import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, HelpCircle } from "lucide-react";
import { mapPaymentStatus } from "@/types/payment";

export interface PaymentStatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

export function PaymentStatusBadge({ status, className = "" }: PaymentStatusBadgeProps) {
  const info = mapPaymentStatus(status);

  const variantStyles: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    warning: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    danger: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    neutral: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };

  const IconComponent = {
    success: CheckCircle2,
    warning: AlertTriangle,
    danger: XCircle,
    info: Clock,
    neutral: HelpCircle,
  }[info.variant];

  return (
    <span
      role="status"
      data-testid="payment-status-badge"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full border ${variantStyles[info.variant]} ${className}`}
      aria-label={`Payment status: ${info.label}`}
    >
      <IconComponent className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
      <span>{info.label}</span>
    </span>
  );
}
