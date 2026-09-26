import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  LedgerDirectionBadge,
  OutboxStatusBadge,
  ReconciliationStatusBadge,
  NotificationStatusBadge,
} from "@/features/admin/components/investigation-status-badges";
import { InvestigationTimeline } from "@/features/admin/components/investigation-timeline";
import type { PaymentInvestigationTraceResponse } from "@/types/admin";

const mockTrace: PaymentInvestigationTraceResponse = {
  payment: {
    id: "pay-11111111-2222-3333-4444-555555555555",
    payerAccountId: "acc-payer-001",
    payeeAccountId: "acc-payee-001",
    amountMinor: 25000,
    feeMinor: 150,
    currency: "USD",
    status: "SETTLED",
    providerReference: "prov-ref-987",
    idempotencyKey: "idem-key-001",
    idempotencyScope: "GLOBAL",
    createdAt: "2026-09-26T10:00:00Z",
    updatedAt: "2026-09-26T10:01:00Z",
  },
  payerAccount: null,
  payeeAccount: null,
  ledgerTransaction: {
    id: "ltx-1111",
    sourceReferenceId: "pay-11111111-2222-3333-4444-555555555555",
    sourceReferenceType: "PAYMENT",
    description: "Settlement",
    createdAt: "2026-09-26T10:00:10Z",
    entries: [
      {
        id: "ent-1",
        accountId: "acc-payer-001",
        direction: "DEBIT",
        amountMinor: 25000,
        currency: "USD",
        sequenceNumber: 1,
        createdAt: "2026-09-26T10:00:10Z",
      },
    ],
  },
  outboxEvents: [
    {
      eventId: "evt-1",
      eventType: "PAYMENT_SETTLED",
      aggregateType: "PAYMENT",
      aggregateId: "pay-11111111-2222-3333-4444-555555555555",
      status: "PUBLISHED",
      topic: "payment.events",
      createdAt: "2026-09-26T10:00:15Z",
      publishedAt: "2026-09-26T10:00:16Z",
    },
  ],
  kafkaAudits: [],
  reconciliationCases: [],
  notifications: [
    {
      id: "notif-1",
      eventId: "evt-1",
      channel: "EMAIL",
      status: "SENT",
      attemptCount: 1,
      nextAttemptAt: null,
      recipientRedacted: "us***@test.local",
      createdAt: "2026-09-26T10:00:20Z",
    },
  ],
};

describe("Phase F7-E Payment Forensic Investigation Accessibility Audit (WCAG 2.1 AA)", () => {
  it("provides accessible status and direction badges with role='status' semantics", () => {
    render(
      <div>
        <LedgerDirectionBadge direction="DEBIT" />
        <LedgerDirectionBadge direction="CREDIT" />
        <OutboxStatusBadge status="PUBLISHED" />
        <ReconciliationStatusBadge status="RESOLVED" />
        <NotificationStatusBadge status="SENT" />
      </div>
    );

    const statuses = screen.getAllByRole("status");
    expect(statuses.length).toBe(5);

    expect(screen.getByTestId("ledger-direction-badge-debit")).toHaveTextContent("DEBIT");
    expect(screen.getByTestId("ledger-direction-badge-credit")).toHaveTextContent("CREDIT");
    expect(screen.getByTestId("outbox-status-badge-published")).toHaveTextContent("PUBLISHED");
    expect(screen.getByTestId("recon-status-badge-resolved")).toHaveTextContent("RESOLVED");
    expect(screen.getByTestId("notification-status-badge-sent")).toHaveTextContent("SENT");
  });

  it("provides accessible timeline list semantics with ordered list and time tags", () => {
    render(<InvestigationTimeline trace={mockTrace} />);

    const list = screen.getByRole("list", { name: "Lifecycle Trace Timeline" });
    expect(list).toBeInTheDocument();

    const listItems = screen.getAllByRole("listitem");
    expect(listItems.length).toBeGreaterThanOrEqual(3);

    // Verify presence of time elements with dateTime attributes
    const timeElements = list.querySelectorAll("time");
    expect(timeElements.length).toBeGreaterThanOrEqual(1);
    timeElements.forEach((el) => {
      expect(el).toHaveAttribute("dateTime");
    });
  });
});
