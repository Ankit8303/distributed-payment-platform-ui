"use client";

import React from "react";
import type { NotificationStatus, NotificationChannel } from "@/types/admin";

export interface NotificationStatusBadgeProps {
  status: NotificationStatus | string;
  className?: string;
}

export function NotificationStatusBadge({
  status,
  className = "",
}: NotificationStatusBadgeProps) {
  let badgeStyles = "border-zinc-800 bg-zinc-900/60 text-zinc-400";
  let label = status;

  switch (status) {
    case "SENT":
      badgeStyles = "border-emerald-800/80 bg-emerald-950/40 text-emerald-300";
      label = "Sent";
      break;
    case "PENDING":
      badgeStyles = "border-amber-800/80 bg-amber-950/40 text-amber-300";
      label = "Pending";
      break;
    case "PROCESSING":
      badgeStyles = "border-sky-800/80 bg-sky-950/40 text-sky-300";
      label = "Processing";
      break;
    case "FAILED":
      badgeStyles = "border-rose-800/80 bg-rose-950/40 text-rose-300";
      label = "Failed";
      break;
    case "EXHAUSTED":
      badgeStyles = "border-purple-800/80 bg-purple-950/40 text-purple-300";
      label = "Exhausted";
      break;
    default:
      label = status || "Unknown";
      break;
  }

  return (
    <span
      data-testid="notification-status-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeStyles} ${className}`}
    >
      {label}
    </span>
  );
}

export interface NotificationChannelBadgeProps {
  channel: NotificationChannel | string;
  className?: string;
}

export function NotificationChannelBadge({
  channel,
  className = "",
}: NotificationChannelBadgeProps) {
  let badgeStyles = "border-zinc-800 bg-zinc-900/60 text-zinc-400";
  let label = channel;

  switch (channel) {
    case "EMAIL":
      badgeStyles = "border-blue-800/80 bg-blue-950/40 text-blue-300";
      label = "Email";
      break;
    case "SMS":
      badgeStyles = "border-emerald-800/80 bg-emerald-950/40 text-emerald-300";
      label = "SMS";
      break;
    case "WEBHOOK":
      badgeStyles = "border-purple-800/80 bg-purple-950/40 text-purple-300";
      label = "Webhook";
      break;
    default:
      label = channel || "Unknown";
      break;
  }

  return (
    <span
      data-testid="notification-channel-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium border ${badgeStyles} ${className}`}
    >
      {label}
    </span>
  );
}
