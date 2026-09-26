"use client";

import React from "react";
import type { PaymentInvestigationTraceResponse } from "@/types/admin";
import {
  CreditCard,
  BookOpen,
  Send,
  Radio,
  Scale,
  Bell,
} from "lucide-react";

export interface InvestigationTimelineProps {
  trace: PaymentInvestigationTraceResponse;
}

interface TimelineItem {
  id: string;
  subsystem: string;
  title: string;
  detail: string;
  timestamp: string | null;
  status: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "emerald" | "blue" | "amber" | "rose" | "zinc";
}

export function InvestigationTimeline({ trace }: { trace: PaymentInvestigationTraceResponse }) {
  const items: TimelineItem[] = [];

  // 1. Payment creation
  items.push({
    id: `payment-${trace.payment.id}`,
    subsystem: "Payment Engine",
    title: `Payment ${trace.payment.status}`,
    detail: `ID: ${trace.payment.id} • Currency: ${trace.payment.currency}`,
    timestamp: trace.payment.createdAt,
    status: trace.payment.status,
    icon: CreditCard,
    tone: trace.payment.status === "SETTLED" ? "emerald" : trace.payment.status === "PENDING_RECONCILIATION" ? "amber" : "blue",
  });

  // 2. Ledger transaction
  if (trace.ledgerTransaction) {
    const entryCount = trace.ledgerTransaction.entries?.length || 0;
    items.push({
      id: `ledger-${trace.ledgerTransaction.id}`,
      subsystem: "Double-Entry Ledger",
      title: "Ledger Transaction Posted",
      detail: `Tx ID: ${trace.ledgerTransaction.id} (${entryCount} double-entry entries)`,
      timestamp: trace.ledgerTransaction.createdAt,
      status: "POSTED",
      icon: BookOpen,
      tone: "emerald",
    });
  }

  // 3. Outbox events
  if (trace.outboxEvents && trace.outboxEvents.length > 0) {
    trace.outboxEvents.forEach((evt) => {
      items.push({
        id: `outbox-${evt.eventId}`,
        subsystem: "Transactional Outbox",
        title: `Outbox Event: ${evt.eventType}`,
        detail: `Topic: ${evt.topic} • Status: ${evt.status}${evt.publishedAt ? ` (Published)` : ""}`,
        timestamp: evt.createdAt,
        status: evt.status,
        icon: Send,
        tone: evt.status === "PUBLISHED" ? "emerald" : evt.status === "PENDING" ? "amber" : "zinc",
      });
    });
  }

  // 4. Kafka audits
  if (trace.kafkaAudits && trace.kafkaAudits.length > 0) {
    trace.kafkaAudits.forEach((audit) => {
      items.push({
        id: `kafka-${audit.id}`,
        subsystem: "Kafka Transport Audit",
        title: `Kafka Consumed: ${audit.eventType}`,
        detail: `Correlation ID: ${audit.correlationId || "None"} • Aggregate: ${audit.aggregateId}`,
        timestamp: audit.createdAt,
        status: "DELIVERED",
        icon: Radio,
        tone: "blue",
      });
    });
  }

  // 5. Reconciliation cases
  if (trace.reconciliationCases && trace.reconciliationCases.length > 0) {
    trace.reconciliationCases.forEach((rc) => {
      items.push({
        id: `recon-${rc.id}`,
        subsystem: "Reconciliation",
        title: `Reconciliation Case: ${rc.reconciliationStatus}`,
        detail: `Discrepancy: ${rc.discrepancyType || "Standard"} • Attempts: ${rc.attemptCount}`,
        timestamp: rc.createdAt,
        status: rc.reconciliationStatus,
        icon: Scale,
        tone: rc.reconciliationStatus === "RESOLVED" ? "emerald" : "amber",
      });
    });
  }

  // 6. Notifications
  if (trace.notifications && trace.notifications.length > 0) {
    trace.notifications.forEach((notif) => {
      items.push({
        id: `notif-${notif.id}`,
        subsystem: "Notification Service",
        title: `Notification (${notif.channel}): ${notif.status}`,
        detail: `Recipient: ${notif.recipientRedacted || "Redacted"} • Attempts: ${notif.attemptCount}`,
        timestamp: notif.createdAt,
        status: notif.status,
        icon: Bell,
        tone: notif.status === "SENT" ? "emerald" : notif.status === "PENDING" ? "amber" : "zinc",
      });
    });
  }

  // Sort by timestamp when available, otherwise preserve backend order
  const sortedItems = [...items].sort((a, b) => {
    if (!a.timestamp) return 1;
    if (!b.timestamp) return -1;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  return (
    <div
      data-testid="investigation-timeline-section"
      className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">Lifecycle Trace Timeline</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Authoritative sequential timeline derived directly from backend subsystems. Zero client extrapolation.
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
          {sortedItems.length} Events
        </span>
      </div>

      <ol
        aria-label="Lifecycle Trace Timeline"
        className="relative border-l border-zinc-800 ml-4 space-y-6 py-2"
      >
        {sortedItems.map((item, idx) => {
          const Icon = item.icon;
          const formattedTime = item.timestamp
            ? new Date(item.timestamp).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "medium",
              })
            : "Timestamp Unavailable";

          return (
            <li
              key={item.id}
              data-testid={`timeline-item-${idx}`}
              className="ml-6 relative group"
            >
              {/* Dot */}
              <span
                className={`absolute -left-[35px] top-0 flex h-7 w-7 items-center justify-center rounded-full border bg-zinc-950 ${
                  item.tone === "emerald"
                    ? "border-emerald-500/60 text-emerald-400"
                    : item.tone === "blue"
                    ? "border-sky-500/60 text-sky-400"
                    : item.tone === "amber"
                    ? "border-amber-500/60 text-amber-400"
                    : "border-zinc-600 text-zinc-400"
                }`}
                aria-hidden="true"
              >
                <Icon className="h-3.5 w-3.5" />
              </span>

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <div>
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-indigo-400">
                    {item.subsystem}
                  </span>
                  <h3 className="text-sm font-semibold text-zinc-100">{item.title}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{item.detail}</p>
                </div>
                <time
                  dateTime={item.timestamp || undefined}
                  className="text-[11px] font-mono text-zinc-500 flex-shrink-0"
                >
                  {formattedTime}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
