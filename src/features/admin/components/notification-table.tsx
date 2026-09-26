"use client";

import React from "react";
import Link from "next/link";
import { Bell, ArrowRight } from "lucide-react";
import {
  NotificationStatusBadge,
  NotificationChannelBadge,
} from "./notification-status-badge";
import type { NotificationAdminResponse } from "@/types/admin";
import { formatDateTime } from "@/lib/formatting/date";

export interface NotificationTableProps {
  notifications: NotificationAdminResponse[];
  isLoading: boolean;
}

export function NotificationTable({
  notifications,
  isLoading,
}: NotificationTableProps) {
  if (isLoading) {
    return (
      <div
        data-testid="notification-table-skeleton"
        className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3"
      >
        <div className="h-5 w-48 bg-zinc-800/60 rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-12 bg-zinc-800/30 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div
        data-testid="notification-table-empty"
        className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-12 text-center"
      >
        <div className="w-12 h-12 rounded-xl bg-zinc-800/50 flex items-center justify-center mx-auto mb-3 text-zinc-500">
          <Bell className="w-6 h-6" aria-hidden="true" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200">
          No notifications found
        </h3>
        <p className="mt-1 text-xs text-zinc-400 max-w-sm mx-auto">
          No notification records match the current query parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-xs text-zinc-300"
          aria-label="Notification Directory"
          data-testid="notification-directory-table"
        >
          <thead className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase tracking-wider text-[11px] font-semibold">
            <tr>
              <th scope="col" className="px-4 py-3">Notification ID</th>
              <th scope="col" className="px-4 py-3">Event Type</th>
              <th scope="col" className="px-4 py-3">Channel</th>
              <th scope="col" className="px-4 py-3">Recipient</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3 text-center">Attempts</th>
              <th scope="col" className="px-4 py-3">Created</th>
              <th scope="col" className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {notifications.map((n) => {
              const formattedDate = formatDateTime(n.createdAt, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <tr
                  key={n.id}
                  data-testid={`notification-row-${n.id}`}
                  className="hover:bg-zinc-800/40 transition-colors"
                >
                  {/* ID */}
                  <td className="px-4 py-3 font-mono font-medium text-zinc-200">
                    <span className="sr-only">{n.id}</span>
                    <span aria-hidden="true" title={n.id}>
                      {n.id.slice(0, 8)}...
                    </span>
                  </td>

                  {/* Event Type */}
                  <td className="px-4 py-3 font-mono text-zinc-300">
                    {n.eventType}
                  </td>

                  {/* Channel */}
                  <td className="px-4 py-3">
                    <NotificationChannelBadge channel={n.channel} />
                  </td>

                  {/* Recipient */}
                  <td className="px-4 py-3 font-mono text-zinc-300">
                    <span title={n.recipient}>
                      {n.recipient.length > 24
                        ? `${n.recipient.slice(0, 24)}...`
                        : n.recipient}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <NotificationStatusBadge status={n.status} />
                  </td>

                  {/* Attempts */}
                  <td className="px-4 py-3 text-center font-mono">
                    {n.attemptCount} / {n.maxAttempts}
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                    {formattedDate}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/notifications/${n.id}`}
                      data-testid={`view-notification-${n.id}-link`}
                      aria-label={`Inspect notification ${n.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 focus:outline-none focus:underline"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
