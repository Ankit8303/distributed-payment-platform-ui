"use client";

import React from "react";
import type { UserStatus, UserRole } from "@/types/admin";

export interface UserStatusBadgeProps {
  status: UserStatus | string;
  className?: string;
}

export function UserStatusBadge({ status, className = "" }: UserStatusBadgeProps) {
  let badgeStyles = "border-zinc-800 bg-zinc-900/60 text-zinc-400";
  let label = status;

  switch (status) {
    case "ACTIVE":
      badgeStyles = "border-emerald-800/80 bg-emerald-950/40 text-emerald-300";
      label = "Active";
      break;
    case "SUSPENDED":
      badgeStyles = "border-amber-800/80 bg-amber-950/40 text-amber-300";
      label = "Suspended";
      break;
    case "LOCKED":
      badgeStyles = "border-rose-800/80 bg-rose-950/40 text-rose-300";
      label = "Locked";
      break;
    case "DELETED":
      badgeStyles = "border-zinc-800 bg-zinc-900 text-zinc-500 line-through";
      label = "Deleted";
      break;
    default:
      label = status || "Unknown";
      break;
  }

  return (
    <span
      data-testid="user-status-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeStyles} ${className}`}
    >
      {label}
    </span>
  );
}

export interface UserRoleBadgeProps {
  role: UserRole | string;
  className?: string;
}

export function UserRoleBadge({ role, className = "" }: UserRoleBadgeProps) {
  let badgeStyles = "border-zinc-800 bg-zinc-900/60 text-zinc-400";
  let label = role;

  switch (role) {
    case "ADMIN":
      badgeStyles = "border-indigo-800/80 bg-indigo-950/40 text-indigo-300";
      label = "Admin";
      break;
    case "SYSTEM":
      badgeStyles = "border-purple-800/80 bg-purple-950/40 text-purple-300";
      label = "System";
      break;
    case "MERCHANT":
      badgeStyles = "border-amber-800/80 bg-amber-950/40 text-amber-300";
      label = "Merchant";
      break;
    case "CUSTOMER":
      badgeStyles = "border-sky-800/80 bg-sky-950/40 text-sky-300";
      label = "Customer";
      break;
    default:
      label = role || "Unknown";
      break;
  }

  return (
    <span
      data-testid="user-role-badge"
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border ${badgeStyles} ${className}`}
    >
      {label}
    </span>
  );
}
