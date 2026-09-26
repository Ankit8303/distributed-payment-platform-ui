# Phase F7 Implementation Plan: Admin / Operations UI

**Document ID**: `PHASE-F7-IMPLEMENTATION-PLAN`  
**Target Milestone**: Phase F7 — Admin / Operations UI  
**Platform**: Distributed Payment & Ledger Platform UI  
**Target Repositories**:
- Frontend: `distributed-payment-platform-ui-complete-agent-kit` (Branch: `main`, Tag: `frontend-f6-blocked`, Commit: `ee14074`)
- Backend: `payment-ledger-platform-complete-agent-kit` (**FROZEN**)  
**Status**: `F7_IMPLEMENTATION_PLAN_READY`

---

## 1. Executive Summary

This document specifies the authoritative, step-by-step implementation plan for **Phase F7 — Admin / Operations UI**. Following the verified findings of [PHASE-F7-GAP-ANALYSIS.md](file:///c:/Users/Ankit/Downloads/distributed-payment-platform-ui-complete-agent-kit-v1/distributed-payment-platform-ui-complete-agent-kit/docs/phase-reports/PHASE-F7-GAP-ANALYSIS.md), the frozen Spring Boot backend exposes **12 production-hardened administrative controllers** and **33 distinct REST endpoints**, all secured with `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`.

This plan establishes an enterprise-grade, accessible, and performant operations portal that allows authorized platform administrators and system operators to observe platform health, investigate payment lifecycles from ingress to double-entry ledger settlement, execute compensating financial adjustments, govern accounts, manage reconciliation discrepancies, inspect append-only audit trails, and oversee notifications and users.

Zero backend code modifications or database migrations are required or permitted. Every administrative action implemented in the frontend maps strictly to an authoritative backend API, preserves immutable double-entry ledger invariants, enforces client-side idempotency locking, and ensures non-repudiation through audit tracking.

---

## 2. Source of Truth

The authoritative specifications governing this plan are:
1. **Authoritative Gap Analysis**: [`docs/phase-reports/PHASE-F7-GAP-ANALYSIS.md`](file:///c:/Users/Ankit/Downloads/distributed-payment-platform-ui-complete-agent-kit-v1/distributed-payment-platform-ui-complete-agent-kit/docs/phase-reports/PHASE-F7-GAP-ANALYSIS.md).
2. **Frozen Backend Source Contracts**: Compiled Java controllers and DTOs in `com.paymentledger.admin.*`, `com.paymentledger.reconciliation.*`, and `com.paymentledger.notification.*`.
3. **Database Financial Invariants**: PostgreSQL double-entry ledger schemas and Flyway migrations.
4. **Frozen Frontend Milestones**: Phases F0, F1, F2, F3, F4 (Closed), F5, and F6 (Closed).

---

## 3. F7 Scope

### 3.1 In-Scope Administrative Modules (100% Backed by Verified APIs)
1. **Admin Foundation & Shell**: Route group `(admin)`, navigation layout, sidebar, header, and multi-role boundary enforcement (`ADMIN`, `SYSTEM`).
2. **Operations Dashboard**: System health metrics and operational KPI cards (`/api/v1/admin/dashboard/summary`).
3. **Payment Operations & Detail**: Paginated payment directory, search, status filtering, and authoritative payment inspection.
4. **Forensic Payment Investigation**: Full distributed trace visualization (Payment $\to$ Ledger Transaction $\to$ Balanced Entries $\to$ Outbox $\to$ Kafka Audits $\to$ Reconciliation $\to$ Notifications).
5. **Ledger Journal & Statements**: Searchable double-entry journal transactions, balanced debit/credit entry inspection, and account ledger statements.
6. **Account Governance & Balance Audit**: Filterable account directory, real-time balance consistency audit (materialized vs ledger-derived), freeze account mutation, and unfreeze account mutation.
7. **Financial Adjustments**: Compensating double-entry ledger transfer form, client-side idempotency key lifecycle, review modal, and adjustment receipt.
8. **Refund & Payout Oversight**: Filterable administrative directories for refunds and payouts.
9. **Reconciliation Management**: Discrepancy case queue, attempt history inspector, manual retry trigger, automated worker cycle trigger, and global ledger/balance consistency audit triggers.
10. **Notification Operations**: Message delivery tracking queue, attempt history, manual delivery retry, and batch worker trigger.
11. **Audit Log Explorer**: Searchable, append-only security audit log explorer with JSON before/after state diff presenter.
12. **User Identity Directory**: Identity management directory, role filtering, status filtering, and profile inspector (excluding credentials).

---

## 4. Architectural Invariants

The following 20 core invariants must never be violated during implementation:
1. **PostgreSQL Authority**: PostgreSQL via Spring Boot services remains the sole source of financial truth.
2. **Immutable Ledger**: Posted ledger entries cannot be updated, edited, or deleted. All financial corrections require a new balanced double-entry transaction.
3. **Kafka as Event Transport**: Kafka events and audit logs reflect state transitions; they do not dictate authoritative balances.
4. **Redis Auxiliary Role**: Redis is used for rate limiting and locks only; the UI never relies on Redis state.
5. **Authoritative Backend Security**: Frontend authorization is purely for presentation and navigation UX. The backend Spring Security filter chain is the authoritative security boundary.
6. **Strict Route Isolation**: Admin routes (`/admin/*`) and customer routes (`/dashboard`, `/payments/*`, `/accounts/*`) must remain strictly isolated in separate Next.js route groups.
7. **No Admin Endpoints in Customer UI**: Admin endpoints (`/api/v1/admin/*`) must never be requested from customer components.
8. **Zero Balance Fabrication**: The frontend must never calculate, synthesize, or estimate account balances. It must display backend values verbatim.
9. **No Fabricated Financial State**: The frontend must never invent transaction states, ledger entries, or reconciliation outcomes.
10. **Zero Speculative APIs**: All HTTP requests must target verified backend routes with exact DTO field alignments.
11. **No Direct Database Access**: The frontend interacts exclusively via HTTPS JSON REST APIs.
12. **No Direct Event Broker Access**: The browser never connects directly to Kafka or Redis.
13. **Idempotency Preservation**: A financial mutation (`POST /api/v1/admin/adjustments`) must never be silently retried with a newly generated idempotency key upon ambiguous failure.
14. **Auditability of Mutations**: Every administrative state change must capture the acting operator's identity, role, timestamp, reason, correlation ID, and request ID.
15. **Exact Intent Preservation**: Idempotency payload hashing ensures that key reuse with altered arguments produces HTTP 409 Conflict.
16. **No Stale Mutation Reuse**: Form submission locks disable inputs during network transit.
17. **PII and Secret Redaction**: User credentials, password hashes, and raw recipient email addresses must remain masked or unexposed.
18. **No Optimistic Financial Updates**: State-changing operations must wait for HTTP 200/201 confirmation before rendering state changes.
19. **Preserve Frozen Modules**: F0–F6 frontend source files must remain untouched, except for documented shared utility extensions.
20. **Deterministic Error Presentation**: All API errors must be parsed through standard RFC 7807 problem details handlers with correlation IDs displayed.

---

## 5. Security Model

### 5.1 Multi-Role Authorization Evaluation
The frozen backend permits both `ROLE_ADMIN` and `ROLE_SYSTEM` across all administrative endpoints.
In the existing frontend:
- `src/types/auth.ts` defines `UserRole = "CUSTOMER" | "MERCHANT" | "ADMIN" | "SYSTEM"`.
- `src/lib/auth/jwt.ts` decodes `role: UserRole` from backend JWT tokens.
- However, `src/components/layout/protected-route.tsx` currently accepts a single `requiredRole?: UserRole` and checks `user?.role !== requiredRole && user?.role !== "ADMIN"`.
- **Planned Security Enhancement**: Update `ProtectedRoute` props to support `allowedRoles?: UserRole[]` (while maintaining backward compatibility for existing callers with `requiredRole?: UserRole`).
  - For the admin layout, specify `allowedRoles={["ADMIN", "SYSTEM"]}`.
  - If a user with `ROLE_CUSTOMER` or `ROLE_MERCHANT` attempts to access `/admin/*`, `ProtectedRoute` intercepts the request client-side, renders an `Access Restricted` alert, and prevents any unauthorized backend API calls.

### 5.2 Token Isolation & Refresh Mechanics
- Access tokens remain strictly **in-memory** within `src/lib/auth/token-storage.ts`.
- Refresh tokens are stored in `sessionStorage` (per-tab isolation, automatically destroyed on tab closure).
- The existing single-flight mutex in `useAuth.refreshSession()` prevents race conditions during token rotation.
- Inactive administrative sessions automatically clear tokens upon HTTP 401 Unauthorized, redirecting the browser to `/login?redirect=/admin/dashboard`.

---

## 6. Role Matrix

| Capability / Route | Backend Endpoint | `ROLE_ADMIN` | `ROLE_SYSTEM` | `ROLE_CUSTOMER` | `ROLE_MERCHANT` | Frontend Guard |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin Shell / Nav** | N/A | Permitted | Permitted | **Denied (403)** | **Denied (403)** | `allowedRoles={['ADMIN', 'SYSTEM']}` |
| **Dashboard Metrics** | `GET /api/v1/admin/dashboard/summary` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Inherited from layout |
| **Payment Directory** | `GET /api/v1/admin/payments` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Inherited from layout |
| **Payment Detail** | `GET /api/v1/admin/payments/{id}` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Inherited from layout |
| **Forensic Trace** | `GET /api/v1/admin/investigations/payments/{id}` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Inherited from layout |
| **Ledger Journal** | `GET /api/v1/admin/ledger/transactions` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Inherited from layout |
| **Account Statements** | `GET /api/v1/admin/ledger/accounts/{id}/entries` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Inherited from layout |
| **Account Directory** | `GET /api/v1/admin/accounts` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Inherited from layout |
| **Balance Audit** | `GET /api/v1/admin/accounts/{id}/balance-summary`| Permitted | Permitted | **Denied (403)** | **Denied (403)** | Inherited from layout |
| **Account Freeze** | `POST /api/v1/admin/accounts/{id}/freeze` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Action confirmation dialog |
| **Account Unfreeze** | `POST /api/v1/admin/accounts/{id}/unfreeze` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Action confirmation dialog |
| **Financial Adjust.**| `POST /api/v1/admin/adjustments` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Review modal + Idempotency |
| **Recon. Case Queue**| `GET /api/v1/admin/reconciliation/cases` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Inherited from layout |
| **Recon. Retry** | `POST /api/v1/admin/reconciliation/cases/{id}/retry` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Action confirmation dialog |
| **Audit Log Search** | `GET /api/v1/admin/audit-logs` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Inherited from layout |
| **Notification Queue**| `GET /api/v1/admin/notifications` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Inherited from layout |
| **User Directory** | `GET /api/v1/admin/users` | Permitted | Permitted | **Denied (403)** | **Denied (403)** | Inherited from layout |

---

## 7. Route Architecture

All administrative views reside in the dedicated Next.js App Router route group `src/app/(admin)/admin`:

```
src/app/(admin)/
  ├── layout.tsx                                 -> Admin Root Shell (<ProtectedRoute allowedRoles={['ADMIN', 'SYSTEM']}>)
  └── admin/
        ├── dashboard/
        │     └── page.tsx                       -> System Health & KPI Overview
        ├── payments/
        │     ├── page.tsx                       -> Searchable & Filterable Payment Directory
        │     └── [id]/
        │           └── page.tsx                 -> Payment Inspector & Navigation to Investigation
        ├── investigations/
        │     └── [paymentId]/
        │           └── page.tsx                 -> Multi-Stage Forensic Trace Visualization
        ├── ledger/
        │     ├── transactions/
        │     │     ├── page.tsx                 -> Double-Entry Journal Transactions
        │     │     └── [id]/
        │     │           └── page.tsx           -> Balanced Debit/Credit Entries Inspector
        │     └── accounts/
        │           └── [accountId]/
        │                 └── page.tsx           -> Account Ledger Statement & Historical Entries
        ├── accounts/
        │     ├── page.tsx                       -> Account Governance Directory
        │     └── [id]/
        │           └── page.tsx                 -> Account Inspector, Real-time Balance Audit, Freeze/Unfreeze
        ├── adjustments/
        │     ├── page.tsx                       -> Compensating Adjustment Directory & Receipts
        │     └── new/
        │           └── page.tsx                 -> Double-Entry Adjustment Initiation Form & Review Modal
        ├── refunds/
        │     ├── page.tsx                       -> Administrative Refund Directory
        │     └── [id]/
        │           └── page.tsx                 -> Refund Inspector
        ├── payouts/
        │     ├── page.tsx                       -> Administrative Payout Directory
        │     └── [id]/
        │           └── page.tsx                 -> Payout Inspector
        ├── reconciliation/
        │     ├── page.tsx                       -> Discrepancy Case Directory & Batch Auditor Triggers
        │     └── [id]/
        │           └── page.tsx                 -> Case Inspector, Attempt Timeline & Manual Retry
        ├── notifications/
        │     ├── page.tsx                       -> Delivery Queue Directory & Worker Trigger
        │     └── [id]/
        │           └── page.tsx                 -> Notification Inspector, Attempt Logs & Manual Retry
        ├── audit/
        │     ├── page.tsx                       -> Searchable Security Audit Log Explorer
        │     └── [id]/
        │           └── page.tsx                 -> Full Audit Event & JSON State Diff Inspector
        └── users/
              ├── page.tsx                       -> User Identity Directory (Role & Status Filters)
              └── [id]/
                    └── page.tsx                 -> User Inspector
```

---

## 8. Admin Layout Architecture

The administrative layout (`src/app/(admin)/layout.tsx`) decouples administrative workflows from customer experiences:
1. **`AdminLayout` Component**:
   - `AdminSidebar`: Fixed, collapsible navigation sidebar with semantic grouping:
     - *Overview*: Dashboard.
     - *Operations*: Payments, Investigations, Refunds, Payouts, Reconciliation.
     - *Accounting*: Ledger Journal, Accounts, Financial Adjustments.
     - *Platform Governance*: Audit Logs, Notifications, User Directory.
   - `AdminHeader`: Displays active operator email, role badge (`ROLE_ADMIN` in slate-emerald, `ROLE_SYSTEM` in slate-indigo), active correlation identifier toggle, and secure logout.
   - `AdminBreadcrumbs`: Accessible breadcrumb path reflecting current route hierarchy.
2. **Bundle Segregation**: Administrative components and icons are loaded exclusively inside `(admin)/*`, preventing customer dashboard bundle bloat.
3. **Accessibility**: Includes a `<a href="#admin-main-content" className="sr-only focus:not-sr-only">Skip to main content</a>` skip link.

---

## 9. API Architecture

A dedicated API client module `src/lib/api/endpoints/admin-api.ts` maps all 33 verified backend endpoints to strongly-typed TypeScript functions using `apiFetch()`:

```typescript
// Dashboard
export const getAdminDashboardSummary = (options?: RequestOptions): Promise<DashboardSummaryResponse> => ...;

// Payments & Investigations
export const listAdminPayments = (params?: PaymentQueryParams, options?: RequestOptions): Promise<Page<PaymentAdminResponse>> => ...;
export const getAdminPayment = (paymentId: string, options?: RequestOptions): Promise<PaymentAdminResponse> => ...;
export const getPaymentInvestigation = (paymentId: string, options?: RequestOptions): Promise<PaymentInvestigationTraceResponse> => ...;

// Ledger
export const listAdminLedgerTransactions = (params?: LedgerQueryParams, options?: RequestOptions): Promise<Page<LedgerTransactionAdminResponse>> => ...;
export const getAdminLedgerTransaction = (transactionId: string, options?: RequestOptions): Promise<LedgerTransactionAdminResponse> => ...;
export const listAccountLedgerEntries = (accountId: string, params?: PageableParams, options?: RequestOptions): Promise<Page<LedgerEntryAdminResponse>> => ...;

// Accounts & Governance
export const listAdminAccounts = (params?: AccountQueryParams, options?: RequestOptions): Promise<Page<AccountAdminResponse>> => ...;
export const getAdminAccount = (accountId: string, options?: RequestOptions): Promise<AccountAdminResponse> => ...;
export const getAccountBalanceSummary = (accountId: string, options?: RequestOptions): Promise<AccountBalanceSummaryResponse> => ...;
export const freezeAdminAccount = (accountId: string, payload: AccountLifecycleRequest, options?: RequestOptions): Promise<AccountAdminResponse> => ...;
export const unfreezeAdminAccount = (accountId: string, payload: AccountLifecycleRequest, options?: RequestOptions): Promise<AccountAdminResponse> => ...;

// Financial Adjustments
export const createFinancialAdjustment = (payload: FinancialAdjustmentCreateRequest, options?: RequestOptions): Promise<FinancialAdjustmentResponse> => ...;
export const getFinancialAdjustment = (adjustmentId: string, options?: RequestOptions): Promise<FinancialAdjustmentResponse> => ...;

// Refunds & Payouts
export const listAdminRefunds = (params?: RefundQueryParams, options?: RequestOptions): Promise<Page<RefundAdminResponse>> => ...;
export const getAdminRefund = (refundId: string, options?: RequestOptions): Promise<RefundAdminResponse> => ...;
export const listAdminPayouts = (params?: PayoutQueryParams, options?: RequestOptions): Promise<Page<PayoutAdminResponse>> => ...;
export const getAdminPayout = (payoutId: string, options?: RequestOptions): Promise<PayoutAdminResponse> => ...;

// Reconciliation
export const listAdminReconciliationCases = (params?: ReconciliationQueryParams, options?: RequestOptions): Promise<Page<ReconciliationCaseAdminResponse>> => ...;
export const getAdminReconciliationCase = (caseId: string, options?: RequestOptions): Promise<ReconciliationCaseDetailResponse> => ...;
export const triggerReconciliationCase = (caseId: string, options?: RequestOptions): Promise<ReconciliationCaseAdminResponse> => ...;
export const retryReconciliationCase = (caseId: string, options?: RequestOptions): Promise<ReconciliationCaseDetailResponse> => ...;
export const runReconciliationCycle = (options?: RequestOptions): Promise<number> => ...;
export const runLedgerConsistencyAudit = (options?: RequestOptions): Promise<LedgerAuditReport> => ...;
export const runBalanceConsistencyAudit = (options?: RequestOptions): Promise<BalanceAuditReport> => ...;

// Notifications
export const listAdminNotifications = (params?: NotificationQueryParams, options?: RequestOptions): Promise<Page<NotificationAdminResponse>> => ...;
export const getAdminNotificationDetail = (id: string, options?: RequestOptions): Promise<NotificationDetailResponse> => ...;
export const retryAdminNotification = (id: string, options?: RequestOptions): Promise<NotificationAdminResponse> => ...;
export const runNotificationWorkerBatch = (limit?: number, options?: RequestOptions): Promise<number> => ...;

// Audit Logs & Users
export const listAdminAuditLogs = (params?: AuditQueryParams, options?: RequestOptions): Promise<Page<AdminAuditLogResponse>> => ...;
export const getAdminAuditLog = (id: string, options?: RequestOptions): Promise<AdminAuditLogResponse> => ...;
export const listAdminUsers = (params?: UserQueryParams, options?: RequestOptions): Promise<Page<UserAdminResponse>> => ...;
export const getAdminUser = (userId: string, options?: RequestOptions): Promise<UserAdminResponse> => ...;
```

---

## 10. Type Architecture

New TypeScript interface definitions will reside in `src/types/admin.ts`:
- **Generic Pagination**: `Page<T>` mirroring Spring Data's JSON page structure (`content: T[]`, `totalElements: number`, `totalPages: number`, `size: number`, `number: number`, `first: boolean`, `last: boolean`).
- **Dashboard Types**: `DashboardSummaryResponse`.
- **Payment & Investigation Types**: `PaymentAdminResponse`, `PaymentInvestigationTraceResponse`, `OutboxEventSummary`, `KafkaAuditSummary`, `NotificationSummary`.
- **Ledger Types**: `LedgerTransactionAdminResponse`, `LedgerEntryAdminResponse`.
- **Account Types**: `AccountAdminResponse`, `AccountBalanceSummaryResponse`, `AccountLifecycleRequest`.
- **Adjustment Types**: `FinancialAdjustmentCreateRequest`, `FinancialAdjustmentResponse`.
- **Audit Types**: `AdminAuditLogResponse`.
- **Reconciliation Types**: `ReconciliationCaseAdminResponse`, `ReconciliationAttemptAdminResponse`, `ReconciliationCaseDetailResponse`, `DiscrepancyType`, `ReconciliationStatus`.
- **Notification Types**: `NotificationAdminResponse`, `NotificationDeliveryEntity`, `NotificationDetailResponse`.
- **User Types**: `UserAdminResponse`.

---

## 11. Query Architecture

TanStack Query v5 will manage all administrative data fetching and cache invalidation under the root key namespace `'admin'`:

| Query Key Factory | Target Endpoint | Cache `staleTime` | Invalidation Triggers |
| :--- | :--- | :--- | :--- |
| `adminKeys.dashboard()` | `GET /admin/dashboard/summary` | 15 seconds | Manual refresh |
| `adminKeys.payments(params)` | `GET /admin/payments` | 15 seconds | Manual refresh |
| `adminKeys.payment(id)` | `GET /admin/payments/{id}` | 30 seconds | Manual refresh |
| `adminKeys.investigation(id)` | `GET /admin/investigations/payments/{id}` | 15 seconds | Reconciliation retry |
| `adminKeys.ledgerTransactions(params)` | `GET /admin/ledger/transactions` | 15 seconds | Financial adjustment mutation |
| `adminKeys.ledgerTransaction(id)` | `GET /admin/ledger/transactions/{id}` | 60 seconds | Immutable |
| `adminKeys.accountEntries(id, params)` | `GET /admin/ledger/accounts/{id}/entries` | 15 seconds | Financial adjustment mutation |
| `adminKeys.accounts(params)` | `GET /admin/accounts` | 15 seconds | Freeze/unfreeze mutations |
| `adminKeys.account(id)` | `GET /admin/accounts/{id}` | 15 seconds | Freeze/unfreeze mutations |
| `adminKeys.balanceSummary(id)` | `GET /admin/accounts/{id}/balance-summary`| 5 seconds | Freeze/unfreeze, adjustment mutations |
| `adminKeys.adjustment(id)` | `GET /admin/adjustments/{id}` | 60 seconds | Immutable |
| `adminKeys.reconciliationCases(params)`| `GET /admin/reconciliation/cases` | 10 seconds | Case retry/trigger, worker run |
| `adminKeys.reconciliationCase(id)` | `GET /admin/reconciliation/cases/{id}` | 5 seconds | Case retry/trigger |
| `adminKeys.auditLogs(params)` | `GET /admin/audit-logs` | 15 seconds | Freeze, unfreeze, adjustment mutations |
| `adminKeys.notifications(params)` | `GET /admin/notifications` | 15 seconds | Notification retry, worker run |

---

## 12. Pagination Strategy

All administrative list views will consume Spring Data pagination:
1. **Paging Parameters**:
   - `page`: 0-indexed integer (default 0).
   - `size`: Clamped integer (default 20, max 100 enforced by `PageUtils.clamp`).
   - `sort`: String format `field,direction` (e.g., `createdAt,desc`).
2. **UI Controls**:
   - `AdminPagination` component renders:
     - Element range: "Showing 1 to 20 of 142 items".
     - Page navigation: "Previous", page number buttons with ellipsis for large ranges, and "Next".
     - Page size selector: Options 10, 20, 50, 100.
3. **No Unbounded Memory Allocation**: The UI will never attempt to load entire administrative tables into memory.

---

## 13. URL State Strategy

To support reproducible administrative investigations and link sharing between operators, all list views will synchronize filter state with URL search params:
- Keys: `?page=0&size=20&status=FAILED&sort=createdAt,desc&query=...`
- Managed via a reusable hook `useAdminTableParams()` wrapping Next.js `useRouter`, `usePathname`, and `useSearchParams`.
- When an operator changes a filter, `page` resets to 0 automatically.

---

## 14. Component Architecture

The following reusable UI components will be implemented under `src/features/admin/components` and `src/components/admin`:

| Component Name | Responsibility | Accessibility & UX Rules |
| :--- | :--- | :--- |
| `AdminLayout` | Shell layout containing sidebar, header, breadcrumbs, and main slot | Skip link, semantic `<nav>`, `<aside>`, `<main>` |
| `AdminDataTable` | Generic paginated data table | Semantic `<table>`, `<th>`, `aria-sort`, loading skeletons |
| `AdminFilterBar` | Filter dropdowns, search input, date range, and reset button | Form labels, accessible `<select>` and `<input>` |
| `AdminPagination` | Page navigation controls and page size selector | `aria-label="Pagination Navigation"`, disabled button states |
| `BalanceAuditCard` | Materialized vs authoritative ledger balance inspector | Green `CONSISTENT` or red pulsing `DISCREPANCY` badge |
| `ForensicTraceGraph` | Step-by-step visual pipeline of payment lifecycle | Ordered list semantics `<ol>`, status badges per step |
| `ActionConfirmDialog` | Reusable modal for destructive/sensitive operations | Focus trap, `aria-modal="true"`, mandatory reason textarea |
| `FinancialAdjustmentModal`| Two-step financial transfer form and review modal | Idempotency generation on review confirm, numeric inputs |
| `AuditDiffViewer` | Pretty-printed JSON before/after state diff presenter | Accessible code blocks, syntax highlight, copy button |
| `CorrelationIdBadge` | Click-to-copy correlation ID pill | `aria-label="Copy Correlation ID"`, toast feedback |

---

## 15. Hook Architecture

Feature-scoped custom hooks under `src/features/admin/hooks`:
1. `useAdminDashboard()`: Fetches dashboard summary.
2. `useAdminPayments(params)`: Queries paginated payments.
3. `usePaymentInvestigation(id)`: Fetches full forensic trace.
4. `useAdminLedger(params)`: Queries ledger transactions and account statements.
5. `useAdminAccounts(params)`: Queries paginated accounts.
6. `useAccountBalanceSummary(id)`: Real-time balance discrepancy auditor.
7. `useAccountLifecycle(id)`: Mutations for `freeze` and `unfreeze` with audit tracking.
8. `useFinancialAdjustment()`: Mutation posting compensating adjustment with client idempotency key.
9. `useReconciliationCases(params)`: Queries reconciliation queue.
10. `useReconciliationActions()`: Mutations for case `trigger`, `retry`, and worker cycle.
11. `useAdminAuditLogs(params)`: Queries audit log explorer.
12. `useAdminNotifications(params)`: Delivery queue query and retry mutations.
13. `useAdminUsers(params)`: User identity directory query.

---

## 16. Dashboard Implementation Plan

- **Path**: `src/app/(admin)/admin/dashboard/page.tsx`
- **Data Source**: `getAdminDashboardSummary()`
- **Layout**:
  - Grid of 6 KPI cards:
    1. *Total Payments / Settled Rate*: Volume and percentage settled.
    2. *Pending Reconciliation*: Prominent amber badge highlighting active recon cases.
    3. *Account Status*: Active vs Frozen account distribution.
    4. *System Discrepancies*: Open reconciliation cases count.
    5. *Notification Health*: Total notifications queued.
    6. *Registered Users*: Total system user accounts.
  - Quick Action Links: "Investigate Payment", "Audit Reconciliation", "View Ledger".
  - Auto-refetch on window focus, with manual "Refresh Dashboard" button.

---

## 17. Payment Operations Plan

- **Path**: `src/app/(admin)/admin/payments/page.tsx` and `[id]/page.tsx`
- **Data Source**: `listAdminPayments()`, `getAdminPayment()`
- **List Features**:
  - Filter by `PaymentStatus` (`CREATED`, `AUTHORIZED`, `SETTLED`, `FAILED`, `PENDING_RECONCILIATION`).
  - Filter by `payerAccountId` or `payeeAccountId`.
  - Column headers: Payment ID, Payer, Payee, Amount (`formatMinorUnits`), Status Badge, Idempotency Key, Created At, Actions.
- **Detail Features**:
  - Authoritative payment fields.
  - Dedicated "Forensic Investigation" primary action linking to `/admin/investigations/[paymentId]`.
  - Copyable Idempotency Key and Provider Reference.

---

## 18. Forensic Investigation Plan

- **Path**: `src/app/(admin)/admin/investigations/[paymentId]/page.tsx`
- **Data Source**: `getPaymentInvestigation(paymentId)`
- **Visual Forensic Graph**:
  1. **Stage 1: Ingress & Payment**: Payment ID, Idempotency Key, Payer Account, Payee Account, Status.
  2. **Stage 2: Ledger Settlement**: Ledger Transaction ID, Debit Entry (Payer), Credit Entry (Payee), Zero-Sum Check.
  3. **Stage 3: Outbox Publication**: Event Type (`PaymentSettled` / `PaymentFailed`), Topic, Outbox Status (`PUBLISHED`).
  4. **Stage 4: Kafka Event Audits**: Event IDs, Consumer Acknowledgments, Kafka Partition Offsets from `payment_event_audits`.
  5. **Stage 5: Reconciliation (if triggered)**: Case ID, Discrepancy Type, Lease Worker ID, Attempt Count.
  6. **Stage 6: Customer Notifications**: Notification Channel (`EMAIL` / `WEBHOOK`), Delivery Status, Redacted Recipient (`jo***@example.com`).

---

## 19. Ledger Plan

- **Paths**:
  - `/admin/ledger/transactions` (Journal overview)
  - `/admin/ledger/transactions/[id]` (Transaction detail)
  - `/admin/ledger/accounts/[accountId]` (Account statement)
- **Data Sources**: `listAdminLedgerTransactions()`, `getAdminLedgerTransaction()`, `listAccountLedgerEntries()`
- **Ledger Invariant Presentation**:
  - Journal transaction rows display `sourceReferenceType` (`PAYMENT`, `REFUND`, `PAYOUT`, `SYSTEM_ADJUSTMENT`).
  - Expanding a transaction renders its nested debit and credit entries.
  - Invariant validation banner:
    $$\sum \text{Debit Amount} = \sum \text{Credit Amount} \quad \text{(Balanced)}$$
  - Strictly read-only: No editing or deletion controls exist anywhere in the UI.

---

## 20. Account Governance Plan

- **Paths**: `/admin/accounts/page.tsx` and `/admin/accounts/[id]/page.tsx`
- **Data Sources**: `listAdminAccounts()`, `getAdminAccount()`, `getAccountBalanceSummary()`, `freezeAdminAccount()`, `unfreezeAdminAccount()`
- **Balance Consistency Inspector**:
  - Renders `BalanceAuditCard`:
    - Materialized Balance: `$1,250.00`
    - Authoritative Ledger Balance: `$1,250.00`
    - Discrepancy: `$0.00`
    - Badge: `CONSISTENT` (Green)
    - If discrepancy occurs: Red pulsing warning with exact minor unit difference and "Audit Ledger Entries" shortcut.
- **Freeze / Unfreeze UX**:
  - Triggered via `ActionConfirmDialog`.
  - Requires mandatory operator reason (`@Size(max=500)`).
  - On confirm: Submits POST request, updates cache, logs action to audit logs, and updates badge.

---

## 21. Financial Adjustment Plan

- **Path**: `/admin/adjustments/new/page.tsx` and `/admin/adjustments/page.tsx`
- **Data Sources**: `createFinancialAdjustment()`, `getFinancialAdjustment()`
- **Step-by-Step Financial Safety Lifecycle**:
  1. **Drafting**: Operator specifies `sourceAccountId`, `targetAccountId`, `amountMinor`, `currency`, and `reason`.
  2. **Validation**: Enforces `sourceAccountId !== targetAccountId`, `amountMinor >= 1`, non-blank reason.
  3. **Payload Freeze & Review**: Operator clicks "Review Adjustment". Modal presents exact transfer summary.
  4. **Idempotency Key Generation**: **Client generates UUID v4 idempotency key ONLY upon entering the review confirmation screen**, preserving it across any network retries of this exact intent.
  5. **Submission**: Single-flight submission with disabled buttons and spinner.
  6. **Ambiguous Outcome Recovery**: If network drops or HTTP 504 occurs, the same idempotency key is retained with an explicit "Re-check Submission" button; a new key is NEVER generated.
  7. **Receipt**: Renders `FinancialAdjustmentResponse` with `compensatingLedgerTransactionId` link.

---

## 22. Refund / Payout Plan

- **Paths**: `/admin/refunds`, `/admin/payouts`
- **Data Sources**: `listAdminRefunds()`, `listAdminPayouts()`
- **Oversight Features**:
  - Displays all refunds and payouts platform-wide.
  - Filtering by `status` and `paymentId` / `accountId`.
  - Links directly to associated Payment and Ledger records.
  - Read-only: Operators inspect status without bypassing provider settlement logic.

---

## 23. Reconciliation Plan

- **Path**: `/admin/reconciliation/page.tsx` and `[id]/page.tsx`
- **Data Sources**: `listAdminReconciliationCases()`, `getAdminReconciliationCase()`, `retryReconciliationCase()`, `runReconciliationCycle()`, `runLedgerConsistencyAudit()`, `runBalanceConsistencyAudit()`
- **Operational Controls**:
  - Case table displays: Discrepancy Type badge (`PROVIDER_SUCCESS_LOCAL_PENDING`, `PROVIDER_UNKNOWN`, etc.), Local Status, Provider Status, Attempt Count / Max (5).
  - Case detail renders complete attempt timeline from `reconciliation_attempts` table.
  - "Manual Retry" button triggers worker reconciliation attempt and logs action to audit log.
  - "Run Consistency Audits" button executes global ledger balance checks.

---

## 24. Notification Plan

- **Path**: `/admin/notifications/page.tsx` and `[id]/page.tsx`
- **Data Sources**: `listAdminNotifications()`, `getAdminNotificationDetail()`, `retryAdminNotification()`, `runNotificationWorkerBatch()`
- **Delivery Oversight**:
  - Queue view filterable by `NotificationStatus` (`PENDING`, `SENT`, `FAILED`).
  - Recipient destination displayed with PII masking (`jo***@example.com`).
  - Manual retry action for failed messages with operator confirmation.

---

## 25. Audit Log Plan

- **Path**: `/admin/audit/page.tsx` and `[id]/page.tsx`
- **Data Sources**: `listAdminAuditLogs()`, `getAdminAuditLog()`
- **Audit Explorer**:
  - Filter by `action` (`ACCOUNT_FREEZE`, `ACCOUNT_UNFREEZE`, `RECONCILIATION_RETRY`, etc.), `resourceType`, `resourceId`.
  - Table columns: Timestamp, Operator ID, Operator Role, Action, Target Resource, Reason, Correlation ID.
  - Detail view: Renders `AuditDiffViewer` displaying formatted JSON before/after state diffs.
  - Strictly read-only: No editing, deletion, or modification controls.

---

## 26. User Directory Plan

- **Path**: `/admin/users/page.tsx` and `[id]/page.tsx`
- **Data Sources**: `listAdminUsers()`, `getAdminUser()`
- **Identity Inspector**:
  - Filter by `role` (`CUSTOMER`, `MERCHANT`, `ADMIN`, `SYSTEM`), `status` (`ACTIVE`, `SUSPENDED`), and search by email substring.
  - User detail presents registered email, role, status, creation timestamp.
  - Password hashes, salt, and security tokens are excluded from backend DTOs and will never appear in UI.

---

## 27. Error Handling Plan

All admin endpoints return RFC 7807 problem details:
- **HTTP 400 Bad Request**: Form validation errors mapped to inline input error messages.
- **HTTP 401 Unauthorized**: Session expired; clears in-memory token, preserves target path, and redirects to `/login`.
- **HTTP 403 Forbidden**: Access restricted banner rendered by `ProtectedRoute`.
- **HTTP 404 Not Found**: Standard `AdminNotFound` card with "Return to Directory" link.
- **HTTP 409 Conflict**: Idempotency mismatch or duplicate in-flight operation notification.
- **HTTP 422 Unprocessable Entity**: Business rule violation (e.g. frozen account, insufficient funds) presented in high-contrast alert.
- **HTTP 500 / 503 / 504**: System error banner rendering correlation ID and request ID for support triage.

---

## 28. Loading / Empty / Error UX

Every administrative screen implements standardized states:
1. **Initial Loading**: Semantic skeleton tables and card placeholders matching exact table column counts.
2. **Background Refetch**: Subtle pulsing indicator in the header ("Updating data...") without tearing down existing table DOM.
3. **Empty Results**: `EmptyState` card with contextual icon, explanatory message, and "Clear Filters" action.
4. **Error State**: `InlineAlert` or `ErrorStateCard` rendering error message, RFC 7807 error code, and copyable correlation ID.
5. **Mutation Pending**: Submit buttons disable, show spinning loader, and change label to "Processing...".

---

## 29. Financial Safety Plan

1. **Integer Minor Units**: All monetary representations remain integer cents in TypeScript (`number`). Floating-point math is prohibited.
2. **No Client Calculations**: The browser formats values using `formatMinorUnits()` and never sums balances independently.
3. **Pessimistic UI**: State updates wait for HTTP 200/201 response confirmation.
4. **Discrepancy Alerts**: Balance inconsistencies trigger immediate visual alerts without attempting automated client corrections.

---

## 30. Idempotency Plan

For `POST /api/v1/admin/adjustments`:
1. The idempotency key is generated using `crypto.randomUUID()` **only when the operator confirms review**.
2. The key is attached as header `Idempotency-Key: <UUID>`.
3. If network disconnection occurs during submission:
   - The UI retains the generated key.
   - The operator is presented with a "Retry Submission" button using the **exact same key and payload**.
   - Generating a new key for the same intent is strictly blocked.

---

## 31. RBAC / IDOR Plan

1. **Frontend Role Guard**: `ProtectedRoute` verifies `user?.role === "ADMIN" || user?.role === "SYSTEM"`.
2. **Backend Authoritative Barrier**: Every endpoint is guarded by Spring Security `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`.
3. **Audit Trails**: Cross-tenant administrative access is mitigated by mandatory logging in `admin_audit_logs`.

---

## 32. Accessibility Plan (WCAG 2.2 AA)

1. **Focus Trap**: Modals and confirmation dialogs trap focus; `Escape` key closes dialogs and restores focus to trigger buttons.
2. **Keyboard Navigation**: All table rows, filters, and action buttons are accessible via `Tab` and `Enter` / `Space`.
3. **Screen Reader Announcements**: Asynchronous mutations and alert banners utilize `role="status"` with `aria-live="polite"`. Critical financial discrepancies use `role="alert"` with `aria-live="assertive"`.
4. **Color Independence**: All status badges combine text labels, distinctive icons, and border styles.

---

## 33. Performance Plan

1. **Pagination Limits**: Paging clamped to max 100 elements. Default page size is 20.
2. **Cache Policy**: `staleTime = 15_000` (15s) and `gcTime = 300_000` (5m) prevent duplicate network requests while preserving fresh operational data.
3. **Route Splitting**: Next.js App Router automatically splits `(admin)` chunks away from public and customer bundles.

---

## 34. Observability Plan

1. **Header Propagation**: Every admin API request includes `X-Correlation-ID: <UUID>`.
2. **Structured Client Logs**: `logger.info()` and `logger.error()` emit structured telemetry with correlation IDs, omitting PII.
3. **Operator Feedback**: Correlation IDs are displayed on all receipts, detail cards, and error screens for cross-referencing in logs.

---

## 35. Testing Strategy

| Test Level | Target Scope | Framework | Coverage Target |
| :--- | :--- | :--- | :--- |
| **Unit** | DTO parsers, formatters, idempotency key managers | Vitest | 100% of formatting & error logic |
| **Component** | `AdminDataTable`, `BalanceAuditCard`, `ActionConfirmDialog`, `FinancialAdjustmentModal` | React Testing Library | All interaction & modal states |
| **Integration** | Query and mutation hooks with MSW mocked backend | Vitest + MSW | Cache invalidation, error handling |
| **Security** | Role rejection for `CUSTOMER` navigating to `/admin/*` | Vitest + Playwright | 100% access control paths |
| **E2E** | Full operational journeys in headless browser | Playwright | All 12 admin modules |

---

## 36. E2E Strategy

Two primary Playwright E2E suites under `tests/e2e/admin/`:
1. **`admin-investigation.spec.ts`**:
   - Admin logs in $\to$ navigates to `/admin/dashboard` $\to$ selects Payment $\to$ opens Forensic Trace $\to$ inspects balanced ledger entries $\to$ inspects outbox and Kafka audit records.
2. **`admin-governance.spec.ts`**:
   - Admin logs in $\to$ navigates to Account $\to$ verifies `BalanceAuditCard` $\to$ clicks "Freeze Account" $\to$ inputs reason $\to$ submits $\to$ verifies status changed to `FROZEN` $\to$ navigates to `/admin/audit` $\to$ confirms audit log entry recorded $\to$ unfreezes account.

---

## 37. Documentation Plan

Following F7 implementation, the following documentation will be updated:
1. `docs/phase-reports/PHASE-F7-FINAL.md`: Phase closure report.
2. `README.md`: Update operational navigation guide and admin credentials documentation.
3. `docs/architecture/ADMIN-OPERATIONS.md`: Deep architectural overview of forensic investigation and adjustment safety.

---

## 38. Task Breakdown

The implementation is broken down into **16 sequential, independently reviewable tasks (F7-A through F7-P)**:

### Task F7-A: Admin Foundation & Security Boundary
- **Objective**: Establish `src/types/admin.ts`, enhance `ProtectedRoute` to support `allowedRoles`, and implement `src/app/(admin)/layout.tsx` with `AdminNav` and `AdminSidebar`.
- **Files to Create**: `src/types/admin.ts`, `src/app/(admin)/layout.tsx`, `src/components/admin/admin-nav.tsx`, `src/components/admin/admin-sidebar.tsx`.
- **Files to Modify**: `src/components/layout/protected-route.tsx`.
- **Files NOT to Modify**: F0–F6 customer features (`src/features/payments`, `src/features/accounts`, etc.).
- **Tests**: `tests/unit/admin-route-guard.spec.ts`.
- **Gate**: Zero TypeScript errors; customer role rejected from `/admin/*`.

### Task F7-B: Admin API Client & Query Infrastructure
- **Objective**: Implement `src/lib/api/endpoints/admin-api.ts` covering all 33 endpoints and query key factories in `src/features/admin/hooks/query-keys.ts`.
- **Files to Create**: `src/lib/api/endpoints/admin-api.ts`, `src/features/admin/hooks/query-keys.ts`.
- **Gate**: 100% endpoint typing verified.

### Task F7-C: Operations Dashboard
- **Objective**: Implement `src/app/(admin)/admin/dashboard/page.tsx` with KPI overview cards and `useAdminDashboard` hook.
- **Files to Create**: `src/app/(admin)/admin/dashboard/page.tsx`, `src/features/admin/hooks/use-admin-dashboard.ts`, `src/features/admin/components/dashboard-kpi-card.tsx`.
- **Gate**: Dashboard renders system summary from verified API.

### Task F7-D: Shared Data Table & Filter Infrastructure
- **Objective**: Implement reusable `AdminDataTable`, `AdminFilterBar`, and `AdminPagination` components with URL state synchronization.
- **Files to Create**: `src/components/admin/admin-data-table.tsx`, `src/components/admin/admin-filter-bar.tsx`, `src/components/admin/admin-pagination.tsx`, `src/hooks/use-admin-table-params.ts`.
- **Gate**: Pagination and sorting verified with server clamping.

### Task F7-E: Payment Operations & Inspection
- **Objective**: Implement `/admin/payments` list and `/admin/payments/[id]` detail views.
- **Files to Create**: `src/app/(admin)/admin/payments/page.tsx`, `src/app/(admin)/admin/payments/[id]/page.tsx`, `src/features/admin/hooks/use-admin-payments.ts`.
- **Gate**: Status filters and detail inspection verified.

### Task F7-F: Forensic Payment Investigation Trace
- **Objective**: Implement `/admin/investigations/[paymentId]` rendering the 6-stage lifecycle trace graph.
- **Files to Create**: `src/app/(admin)/admin/investigations/[paymentId]/page.tsx`, `src/features/admin/components/forensic-trace-graph.tsx`, `src/features/admin/hooks/use-payment-investigation.ts`.
- **Gate**: Complete payment-to-ledger trace graph rendered without data fabrication.

### Task F7-G: Double-Entry Ledger Journal & Account Statements
- **Objective**: Implement `/admin/ledger/transactions`, transaction detail, and `/admin/ledger/accounts/[accountId]` entry statement.
- **Files to Create**: `src/app/(admin)/admin/ledger/transactions/page.tsx`, `src/app/(admin)/admin/ledger/transactions/[id]/page.tsx`, `src/app/(admin)/admin/ledger/accounts/[accountId]/page.tsx`, `src/features/admin/hooks/use-admin-ledger.ts`.
- **Gate**: Balanced debit/credit entries rendered.

### Task F7-H: Account Governance & Balance Consistency Audit
- **Objective**: Implement `/admin/accounts`, `/admin/accounts/[id]`, `BalanceAuditCard`, and freeze/unfreeze modals.
- **Files to Create**: `src/app/(admin)/admin/accounts/page.tsx`, `src/app/(admin)/admin/accounts/[id]/page.tsx`, `src/features/admin/components/balance-audit-card.tsx`, `src/components/admin/action-confirm-dialog.tsx`, `src/features/admin/hooks/use-admin-accounts.ts`.
- **Gate**: Freeze/unfreeze mutations verified with mandatory audit reason.

### Task F7-I: Financial Adjustments & Idempotency Lifecycle
- **Objective**: Implement `/admin/adjustments` directory and `/admin/adjustments/new` compensating adjustment form.
- **Files to Create**: `src/app/(admin)/admin/adjustments/page.tsx`, `src/app/(admin)/admin/adjustments/new/page.tsx`, `src/features/admin/components/financial-adjustment-modal.tsx`, `src/features/admin/hooks/use-financial-adjustments.ts`.
- **Gate**: Idempotency key generated only upon review confirmation; zero floating-point math.

### Task F7-J: Refund & Payout Oversight
- **Objective**: Implement `/admin/refunds` and `/admin/payouts` directories and detail views.
- **Files to Create**: `src/app/(admin)/admin/refunds/page.tsx`, `src/app/(admin)/admin/refunds/[id]/page.tsx`, `src/app/(admin)/admin/payouts/page.tsx`, `src/app/(admin)/admin/payouts/[id]/page.tsx`, `src/features/admin/hooks/use-admin-refunds-payouts.ts`.
- **Gate**: Read-only oversight verified.

### Task F7-K: Reconciliation Case Management & Consistency Audits
- **Objective**: Implement `/admin/reconciliation` queue, detail with attempt history, manual retry action, and consistency audit triggers.
- **Files to Create**: `src/app/(admin)/admin/reconciliation/page.tsx`, `src/app/(admin)/admin/reconciliation/[id]/page.tsx`, `src/features/admin/hooks/use-admin-reconciliation.ts`.
- **Gate**: Manual retry classified as financially sensitive; attempt history rendered.

### Task F7-L: Notification Oversight & Worker Trigger
- **Objective**: Implement `/admin/notifications` queue, detail, retry action, and worker batch trigger.
- **Files to Create**: `src/app/(admin)/admin/notifications/page.tsx`, `src/app/(admin)/admin/notifications/[id]/page.tsx`, `src/features/admin/hooks/use-admin-notifications.ts`.
- **Gate**: Recipient PII masked (`jo***@example.com`).

### Task F7-M: Security Audit Log Explorer
- **Objective**: Implement `/admin/audit` log search and `/admin/audit/[id]` diff inspector with `AuditDiffViewer`.
- **Files to Create**: `src/app/(admin)/admin/audit/page.tsx`, `src/app/(admin)/admin/audit/[id]/page.tsx`, `src/features/admin/components/audit-diff-viewer.tsx`, `src/features/admin/hooks/use-admin-audit-logs.ts`.
- **Gate**: Strictly read-only; JSON diffs safely rendered without `dangerouslySetInnerHTML`.

### Task F7-N: User Identity Directory
- **Objective**: Implement `/admin/users` directory and user inspector.
- **Files to Create**: `src/app/(admin)/admin/users/page.tsx`, `src/app/(admin)/admin/users/[id]/page.tsx`, `src/features/admin/hooks/use-admin-users.ts`.
- **Gate**: Password hashes strictly excluded.

### Task F7-O: Cross-Module Integration, Telemetry & Hardening
- **Objective**: Wire cross-links (e.g. from payment detail to investigation, from account to ledger statements, from adjustments to audit logs). Verify correlation propagation.
- **Gate**: Zero broken internal routes or links.

### Task F7-P: Full Verification Suite & Final Freeze
- **Objective**: Execute Vitest unit tests, Playwright E2E tests, accessibility scans, linting, and typecheck.
- **Gate**: All verification commands exit with code 0.

---

## 39. Intermediate Freeze Gates

| Gate ID | Checkpoint Milestone | Required Passing Checks |
| :--- | :--- | :--- |
| **GATE-F7-A** | Foundation & Shell | `tsc --noEmit`, Route guard unit tests pass |
| **GATE-F7-E** | Payments & Forensic Trace | Payment list, detail & trace rendering tests pass |
| **GATE-F7-H** | Ledger & Account Governance | Balance audit card & freeze/unfreeze tests pass |
| **GATE-F7-I** | Financial Adjustments | Idempotency lifecycle & review modal tests pass |
| **GATE-F7-K** | Reconciliation & Audit | Reconciliation retry & audit diff tests pass |
| **GATE-F7-N** | Complete Views | All 12 admin modules render without console errors |

---

## 40. Final Freeze Gate

The final F7 freeze gate (`frontend-f7-ready`) requires:
1. `npm run typecheck` $\to$ Exit code 0 (Zero TypeScript errors).
2. `npm run lint` $\to$ Exit code 0 (Zero ESLint warnings or errors).
3. `npm run test` $\to$ 100% of unit & component tests pass.
4. `npm run build` $\to$ Successful Next.js production build with route splitting.
5. `npx playwright test` $\to$ 100% E2E tests pass (Admin journeys and security checks).
6. `.\scripts\security\check-secrets.ps1` $\to$ Zero secrets detected.
7. `.\scripts\verification\verify-repo.ps1` $\to$ Clean working tree.

---

## 41. Verification Commands

The following commands must be run to validate each milestone:
```powershell
# Typecheck
npm run typecheck

# Linting
npm run lint

# Unit & Component Tests
npm run test

# Production Build
npm run build

# Playwright E2E Tests
npx playwright test

# Security & Secret Audit
powershell -ExecutionPolicy Bypass -File .\scripts\security\check-secrets.ps1

# Repository Integrity Verification
powershell -ExecutionPolicy Bypass -File .\scripts\verification\verify-repo.ps1
```

---

## 42. Git / Release Strategy

Implementation commits will follow strict semantic commit boundaries:
- `feat(admin): F7-A establish admin foundation and route guard`
- `feat(admin): F7-B implement admin API client and query keys`
- `feat(admin): F7-C deliver operations dashboard`
- `feat(admin): F7-D implement reusable data table and pagination`
- `feat(admin): F7-E deliver payment operations`
- `feat(admin): F7-F deliver forensic payment investigation trace`
- `feat(admin): F7-G deliver double-entry ledger journal and statements`
- `feat(admin): F7-H deliver account governance and balance audit`
- `feat(admin): F7-I deliver financial adjustments with idempotency`
- `feat(admin): F7-J deliver refund and payout oversight`
- `feat(admin): F7-K deliver reconciliation case management`
- `feat(admin): F7-L deliver notification oversight`
- `feat(admin): F7-M deliver audit log explorer`
- `feat(admin): F7-N deliver user directory`
- `feat(admin): F7-O complete cross-module integration`
- `test(admin): F7-P complete E2E test suite and finalize F7`

**Final Release Checkpoint**:
- Recommended Tag: `frontend-f7-ready`

---

## 43. Risks & Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Accidental Financial Mutation Duplication** | Critical | Idempotency key generated only upon review confirmation; preserved across retries; buttons disabled in-flight. |
| **Customer Traversal into Admin Portal** | Critical | `ProtectedRoute` blocks non-admin roles client-side; backend Spring Security rejects requests with HTTP 403. |
| **Client-Side Balance Inaccuracies** | High | Zero client arithmetic; display backend values verbatim; prominent discrepancy warning on difference. |
| **Unbounded Admin Data Queries** | Medium | Server-side pagination clamped to max 100 items per request; default page size 20. |
| **PII / Secret Exposure** | High | Backend DTOs exclude credentials; email masking preserved in forensic trace; console logging sanitized. |

---

## 44. Backend Blockers

The following capabilities are **BLOCKED BY FROZEN BACKEND**:
1. **Direct Ledger Entry Editing**: Prohibited by immutable double-entry accounting principles.
2. **Arbitrary Payment Hard Deletion**: Prohibited by financial state machine rules.
3. **Admin Direct User Registration**: User registration occurs via public authentication flows.
4. **Customer-Facing Ledger Views**: Retains frozen F4/F6 blocker status.

---

## 45. Explicit Out-of-Scope

The following items are strictly **OUT OF SCOPE** for Phase F7:
- Modifying backend code, services, or SQL migrations.
- Creating mock financial datasets or synthetic balance simulations.
- Exposing administrative endpoints to customer route groups.
- Modifying frozen F0–F6 frontend source code (except the planned backward-compatible `ProtectedRoute` role extension).
- Phase F8 (Production Hardening) and Phase F9 (Deployment).

---

## 46. Final F7 Implementation Readiness

### F7 Decision
**Status**:  
$$\mathbf{F7\_IMPLEMENTATION\_PLAN\_READY}$$

### Implementable Scope
- All 12 administrative operational modules covering all 33 verified backend endpoints.

### Blocked Scope
- Arbitrary ledger entry modification, customer-accessible transaction history, and direct admin user creation.

### Unverified Scope
- **None** (all endpoints verified directly against compiled Java source code).

### Backend Changes Required
- **NONE**. The frozen backend satisfies 100% of F7 requirements.

### Frontend Changes Allowed After Approval
- Creation of administrative components under `src/features/admin/**`, `src/app/(admin)/**`, `src/components/admin/**`, `src/types/admin.ts`, and `tests/e2e/admin/**`.
- Backward-compatible enhancement of `ProtectedRoute` for multi-role support (`allowedRoles`).

### Explicitly Forbidden
- Backend modifications, mock financial data, customer route contamination, client-side balance synthesis, unconfirmed financial mutations, and unauthorized commits.

### Freeze Gate
- Successful execution of all verification commands (TypeScript, ESLint, Vitest, Playwright, Secret scan).

---

F7 IMPLEMENTATION PLAN COMPLETE

Status: F7_IMPLEMENTATION_PLAN_READY

Implementation: NOT STARTED

Backend Modified: NO

Frontend Source Modified: NO
