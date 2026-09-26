"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";

export type KpiVariant = "default" | "success" | "warning" | "danger" | "info";

export interface KpiStatusBadge {
  label: string;
  variant: "neutral" | "success" | "warning" | "danger" | "info";
}

export interface KpiCardProps {
  title: string;
  value: number | undefined;
  isLoading?: boolean;
  variant?: KpiVariant;
  icon?: LucideIcon;
  description?: string;
  statusBadge?: KpiStatusBadge;
  testId?: string;
}

const VARIANT_BORDER_STYLES: Record<KpiVariant, string> = {
  default: "border-zinc-800 hover:border-zinc-700",
  success: "border-emerald-900/60 hover:border-emerald-800/80",
  warning: "border-amber-900/60 hover:border-amber-800/80",
  danger: "border-rose-900/60 hover:border-rose-800/80",
  info: "border-sky-900/60 hover:border-sky-800/80",
};

const VARIANT_ICON_BG: Record<KpiVariant, string> = {
  default: "bg-zinc-800/80 text-zinc-300",
  success: "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60",
  warning: "bg-amber-950/80 text-amber-400 border border-amber-800/60",
  danger: "bg-rose-950/80 text-rose-400 border border-rose-800/60",
  info: "bg-sky-950/80 text-sky-400 border border-sky-800/60",
};

const BADGE_STYLES: Record<KpiStatusBadge["variant"], string> = {
  neutral: "bg-zinc-800 text-zinc-300 border-zinc-700",
  success: "bg-emerald-950/80 text-emerald-300 border-emerald-800/80",
  warning: "bg-amber-950/80 text-amber-300 border-amber-800/80",
  danger: "bg-rose-950/80 text-rose-300 border-rose-800/80",
  info: "bg-sky-950/80 text-sky-300 border-sky-800/80",
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  isLoading = false,
  variant = "default",
  icon: Icon,
  description,
  statusBadge,
  testId,
}) => {
  const borderClass = VARIANT_BORDER_STYLES[variant];
  const iconBgClass = VARIANT_ICON_BG[variant];

  return (
    <div
      role="region"
      aria-label={title}
      data-testid={testId || `kpi-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
      className={`rounded-xl border bg-zinc-900/90 p-5 shadow-sm transition-colors duration-150 ${borderClass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 truncate">
            {title}
          </p>

          <div className="mt-2 flex items-baseline gap-2">
            {isLoading ? (
              <div
                role="status"
                aria-label={`Loading ${title}`}
                className="h-9 w-24 rounded bg-zinc-800/80 animate-pulse"
              >
                <span className="sr-only">Loading {title}...</span>
              </div>
            ) : (
              <span
                data-testid={`${testId || `kpi-card-${title.toLowerCase().replace(/\s+/g, "-")}`}-value`}
                className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white"
              >
                {typeof value === "number" ? value.toLocaleString("en-US") : "—"}
              </span>
            )}
          </div>

          {description && (
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed truncate">
              {description}
            </p>
          )}

          {statusBadge && !isLoading && (
            <div className="mt-3">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${BADGE_STYLES[statusBadge.variant]}`}
              >
                {statusBadge.label}
              </span>
            </div>
          )}
        </div>

        {Icon && (
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgClass}`}
            aria-hidden="true"
          >
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};
