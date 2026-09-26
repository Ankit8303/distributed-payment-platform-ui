"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useAdminNotification } from "@/features/admin/hooks/use-admin-notification";
import { useRetryAdminNotification } from "@/features/admin/hooks/use-admin-notification-mutations";
import {
  NotificationStatusBadge,
  NotificationChannelBadge,
} from "@/features/admin/components/notification-status-badge";
import { NotificationActionModal } from "@/features/admin/components/notification-action-modal";
import { AdminErrorState } from "@/features/admin/components/admin-error-state";
import {
  Bell,
  ArrowLeft,
  RotateCcw,
  RefreshCw,
  Server,
  Calendar,
  CheckCircle2,
  FileText,
  Clock,
  Layers,
} from "lucide-react";

export default function NotificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminNotification(id);

  const [retryModalOpen, setRetryModalOpen] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const retryMutation = useRetryAdminNotification(id, {
    onSuccess: () => {
      setRetryModalOpen(false);
      setSuccessNotice("Notification delivery retry submitted successfully.");
      refetch();
    },
  });

  if (isLoading) {
    return (
      <div
        data-testid="notification-detail-loading"
        className="space-y-6 max-w-5xl mx-auto"
      >
        <div className="h-6 w-36 bg-zinc-800 rounded animate-pulse" />
        <div className="h-32 bg-zinc-850/50 rounded-2xl border border-zinc-800 animate-pulse" />
        <div className="h-64 bg-zinc-850/30 rounded-2xl border border-zinc-800 animate-pulse" />
      </div>
    );
  }

  if (isError || !data || !data.notification) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Link
          href="/admin/notifications"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Notifications</span>
        </Link>
        <AdminErrorState
          error={error || new Error("Notification record could not be retrieved")}
          title="Notification Not Found"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </div>
    );
  }

  const { notification: n, deliveries } = data;

  const formattedCreated = new Date(n.createdAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedUpdated = new Date(n.updatedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formattedSent = n.sentAt
    ? new Date(n.sentAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Not sent";

  const formattedNextAttempt = n.nextAttemptAt
    ? new Date(n.nextAttemptAt).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "None scheduled";

  return (
    <div className="space-y-6 max-w-5xl mx-auto" data-testid="notification-detail-container">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/notifications"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Notifications</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Retry Delivery action button */}
          <button
            type="button"
            onClick={() => setRetryModalOpen(true)}
            data-testid="retry-notification-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retry Delivery</span>
          </button>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="refresh-notification-detail-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successNotice && (
        <div
          data-testid="notification-retry-success-banner"
          className="p-4 rounded-xl border border-emerald-800/80 bg-emerald-950/40 text-xs text-emerald-300 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs font-bold px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
              <Bell className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  data-testid="notification-detail-event"
                  className="text-xl sm:text-2xl font-bold text-white tracking-tight"
                >
                  {n.eventType}
                </h1>
                <NotificationChannelBadge channel={n.channel} />
                <NotificationStatusBadge status={n.status} />
              </div>
              <p className="mt-1 font-mono text-xs text-zinc-400">
                Notification ID: <span data-testid="notification-detail-id">{n.id}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Dispatch & Event Information */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Event Metadata
            </h2>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-xs">
            <div>
              <dt className="text-zinc-500 font-medium">Event Identifier</dt>
              <dd className="mt-0.5 font-mono text-zinc-200 break-all">{n.eventId}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Aggregate Identifier</dt>
              <dd className="mt-0.5 font-mono text-zinc-200 break-all">{n.aggregateId}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Recipient</dt>
              <dd className="mt-0.5 font-mono text-zinc-200 break-all">{n.recipient}</dd>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <dt className="text-zinc-500 font-medium">Template Code</dt>
                <dd className="mt-0.5 font-mono text-zinc-300">{n.templateCode}</dd>
              </div>
              <div>
                <dt className="text-zinc-500 font-medium">Template Version</dt>
                <dd className="mt-0.5 font-mono text-zinc-300">v{n.templateVersion}</dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Section 2: Delivery & Lease State */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Delivery & Lease Lifecycle
            </h2>
          </div>
          <dl className="grid grid-cols-1 gap-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <dt className="text-zinc-500 font-medium">Attempts</dt>
                <dd className="mt-0.5 font-mono text-zinc-200 font-semibold">
                  {n.attemptCount} / {n.maxAttempts}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500 font-medium">Next Scheduled</dt>
                <dd className="mt-0.5 text-zinc-300">{formattedNextAttempt}</dd>
              </div>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Sent At</dt>
              <dd className="mt-0.5 text-zinc-300">{formattedSent}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 font-medium">Worker Lease</dt>
              <dd className="mt-0.5 font-mono text-zinc-400">
                {n.leaseWorkerId ? `${n.leaseWorkerId} (expires: ${n.leaseExpiresAt || "N/A"})` : "None"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Section 3: Rendered Content Inspection */}
        <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <FileText className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Rendered Payload Content
            </h2>
          </div>
          <div className="space-y-3 text-xs">
            {n.renderedSubject && (
              <div>
                <span className="text-zinc-500 font-medium block mb-1">Subject / Header:</span>
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/80 font-mono text-zinc-200 break-words">
                  {n.renderedSubject}
                </div>
              </div>
            )}
            <div>
              <span className="text-zinc-500 font-medium block mb-1">Body:</span>
              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/80 font-mono text-zinc-200 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                {n.renderedBody || "No body content available."}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Audit Timestamps */}
        <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Audit & Processing Timestamps
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-zinc-500 font-medium block">Outbox Created</span>
              <span className="mt-0.5 text-zinc-200 font-mono">{formattedCreated}</span>
            </div>
            <div>
              <span className="text-zinc-500 font-medium block">Last State Update</span>
              <span className="mt-0.5 text-zinc-200 font-mono">{formattedUpdated}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Attempt History Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-zinc-200">
              Delivery Attempts ({deliveries?.length || 0})
            </h2>
          </div>
        </div>

        {!deliveries || deliveries.length === 0 ? (
          <p className="text-xs text-zinc-500 italic py-2">
            No delivery attempts recorded yet for this outbox notification.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full text-left text-xs text-zinc-300"
              aria-label="Delivery Attempts Table"
              data-testid="delivery-attempts-table"
            >
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">
                <tr>
                  <th scope="col" className="px-3 py-2">#</th>
                  <th scope="col" className="px-3 py-2">Worker</th>
                  <th scope="col" className="px-3 py-2">Status</th>
                  <th scope="col" className="px-3 py-2">Provider Status</th>
                  <th scope="col" className="px-3 py-2">HTTP Code</th>
                  <th scope="col" className="px-3 py-2">Error</th>
                  <th scope="col" className="px-3 py-2">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-zinc-800/30">
                    <td className="px-3 py-2 text-zinc-400 font-bold">{d.attemptNumber}</td>
                    <td className="px-3 py-2 text-zinc-300">{d.workerId}</td>
                    <td className="px-3 py-2 text-zinc-200">{d.status}</td>
                    <td className="px-3 py-2 text-zinc-400">{d.providerStatus || "—"}</td>
                    <td className="px-3 py-2 text-zinc-400">{d.httpStatusCode ?? "—"}</td>
                    <td className="px-3 py-2 text-rose-400 text-[11px] max-w-xs truncate" title={d.errorMessage || ""}>
                      {d.errorMessage || "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-400 text-[11px] whitespace-nowrap">
                      {new Date(d.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Retry Confirmation Modal */}
      <NotificationActionModal
        isOpen={retryModalOpen}
        onClose={() => setRetryModalOpen(false)}
        onConfirm={() => retryMutation.mutate()}
        title="Retry Notification Delivery"
        description="Schedule an immediate operational redelivery attempt for this notification record."
        actionLabel="Confirm Retry"
        consequence="A new delivery attempt will be queued and dispatched to the gateway. Status will update authoritatively upon provider response."
        isPending={retryMutation.isPending}
      />
    </div>
  );
}
