"use client";

import React, { use } from "react";
import Link from "next/link";
import { useAdminUser } from "@/features/admin/hooks/use-admin-user";
import {
  UserStatusBadge,
  UserRoleBadge,
} from "@/features/admin/components/user-status-badge";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import {
  Users,
  ArrowLeft,
  RefreshCw,
  Mail,
  Shield,
  Calendar,
  Lock,
  Info,
} from "lucide-react";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const { data: user, isLoading, isError, error, refetch, isFetching } =
    useAdminUser(userId);

  if (isLoading) {
    return (
      <div
        data-testid="user-detail-loading"
        className="space-y-6 max-w-5xl mx-auto"
      >
        <div className="h-6 w-36 bg-zinc-800 rounded animate-pulse" />
        <div className="h-32 bg-zinc-850/50 rounded-2xl border border-zinc-800 animate-pulse" />
        <div className="h-64 bg-zinc-850/30 rounded-2xl border border-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to User Directory</span>
        </Link>
        <AdminErrorState
          error={error || new Error("User record could not be retrieved")}
          title="User Not Found"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  const formattedCreated = new Date(user.createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedUpdated = new Date(user.updatedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="user-detail-container">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to User Directory</span>
        </Link>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          data-testid="refresh-user-detail-button"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Hero Header Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
              <Users className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  data-testid="user-detail-email"
                  className="text-xl sm:text-2xl font-bold text-white tracking-tight"
                >
                  {user.email}
                </h1>
                <UserRoleBadge role={user.role} />
                <UserStatusBadge status={user.status} />
              </div>
              <p className="mt-1 font-mono text-xs text-zinc-400">
                User ID: <span data-testid="user-detail-id">{user.id}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: User Identity & Profile */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Mail className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Identity Profile
            </h2>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-xs">
            <div>
              <dt className="text-zinc-500 font-medium">User Identifier (UUID)</dt>
              <dd className="mt-0.5 font-mono text-zinc-200 break-all">{user.id}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Primary Email</dt>
              <dd className="mt-0.5 text-zinc-200 font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Identity Provider</dt>
              <dd className="mt-0.5 text-zinc-300">Internal Auth Authority (PostgreSQL Auth)</dd>
            </div>
          </dl>
        </div>

        {/* Section 2: Role & Privileges */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Shield className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Role & Access Governance
            </h2>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-xs">
            <div>
              <dt className="text-zinc-500 font-medium">Assigned Role</dt>
              <dd className="mt-1">
                <UserRoleBadge role={user.role} />
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Account Status</dt>
              <dd className="mt-1">
                <UserStatusBadge status={user.status} />
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Administrative Scope</dt>
              <dd className="mt-0.5 text-zinc-300">
                {user.role === "ADMIN" || user.role === "SYSTEM"
                  ? "Full operational platform access permitted"
                  : "Customer / Merchant domain access only"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Section 3: Audit Information */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Audit & Lifecycle Timestamps
            </h2>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-zinc-500 font-medium">Profile Created</dt>
              <dd className="mt-0.5 text-zinc-200">{formattedCreated}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Last Profile Update</dt>
              <dd className="mt-0.5 text-zinc-200">{formattedUpdated}</dd>
            </div>
          </dl>
        </div>

        {/* Section 4: Operational Governance Notice */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Lock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Governance Policy
            </h2>
          </div>
          <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-400 space-y-2">
            <div className="flex items-center gap-2 text-zinc-300 font-medium">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Immutable Identity Tier</span>
            </div>
            <p>
              Administrative modifications (credential reset, role elevation, suspension)
              are governed by system authority policies. In accordance with platform security
              invariants, no client-side user mutations are permitted without dedicated verified
              backend mutation endpoints.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
