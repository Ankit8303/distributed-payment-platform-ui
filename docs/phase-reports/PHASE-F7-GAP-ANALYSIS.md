# Phase F7 Gap Analysis Report: Admin / Operations UI Architecture & Scope Assessment

**Document ID**: `PHASE-F7-GAP-ANALYSIS`  
**Target Milestone**: Phase F7 — Admin / Operations UI  
**Platform**: Distributed Payment & Ledger Platform UI  
**Target Repositories**:
- Frontend: `distributed-payment-platform-ui-complete-agent-kit` (Branch: `main`, Tag: `frontend-f6-blocked`, Commit: `ee14074`)
- Backend: `payment-ledger-platform-complete-agent-kit` (**FROZEN**)  
**Status**: `F7_READY_FOR_IMPLEMENTATION` (with explicit blocked boundaries)

---

## 1. Executive Summary

A forensic source code audit and architectural assessment of the frozen Spring Boot backend (`payment-ledger-platform-complete-agent-kit`) was conducted across all administrative controllers, domain entities, repositories, security interceptors, audit services, and database schemas.

### Primary Conclusions:
1. **Authoritative Admin API Surface is 100% Implemented and Hardened**:
   Unlike customer transactions (F4) and customer reconciliation (F6) which lacked customer-facing endpoints, the frozen backend contains **12 production-grade administrative REST controllers** exposing **33 distinct endpoints**. All endpoints reside under `/api/v1/admin/**` and are guarded at the class and method levels by Spring Security's `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`.
2. **Comprehensive Operational Capabilities Verified**:
   The frozen backend provides complete administrative coverage across:
   - System dashboard metrics (`/api/v1/admin/dashboard/summary`)
   - Payment inspection and filtering (`/api/v1/admin/payments`)
   - Distributed forensic payment-to-ledger trace (`/api/v1/admin/investigations/payments/{paymentId}`)
   - Double-entry ledger inspection (`/api/v1/admin/ledger/transactions` and `/accounts/{id}/entries`)
   - Account governance and balance-consistency verification (`/api/v1/admin/accounts`, `/balance-summary`, `/freeze`, `/unfreeze`)
   - Compensating financial adjustments with mandatory double-entry ledger settlement and idempotency (`/api/v1/admin/adjustments`)
   - Append-only administrative audit log querying (`/api/v1/admin/audit-logs`)
   - User identity directory (`/api/v1/admin/users`)
   - Notification delivery tracking and manual retry (`/api/v1/admin/notifications`)
   - Comprehensive reconciliation lifecycle management (`/api/v1/admin/reconciliation/cases`, `/trigger`, `/retry`, `/run`, `/audit/ledger`, `/audit/balances`)
   - Refund and payout oversight (`/api/v1/admin/refunds`, `/api/v1/admin/payouts`)
3. **No Backend Changes Required**:
   The existing backend APIs fully satisfy the requirements for a comprehensive, secure, and production-grade Admin / Operations portal. Zero backend code changes, migrations, or speculative endpoints are needed.
4. **Implementation Readiness**:
   Phase F7 is designated **`F7_READY_FOR_IMPLEMENTATION`** for its verified administrative scope, while explicitly maintaining frozen blockers on arbitrary ledger modifications, client-side balance synthesis, and customer route crossover.

---

## 2. Phase Metadata

| Attribute | Specification |
| :--- | :--- |
| **Phase Identifier** | `PHASE-F7` |
| **Phase Title** | Admin / Operations UI Gap Analysis |
| **Document Date** | September 26, 2026 |
| **Assessment Type** | Forensic Gap Analysis & Architecture Specification (Zero Code Modification) |
| **Author** | Principal Frontend Architect, Security Engineer & QA Lead |
| **Target Audience** | Enterprise Architecture Review Board, Security Audit, Development Team |
| **Security Clearance** | Platform Administrator (`ROLE_ADMIN`, `ROLE_SYSTEM`) |
| **Evaluated Backend Commit** | `payment-ledger-platform-complete-agent-kit` (`HEAD`, Frozen) |
| **Evaluated Frontend Commit** | `distributed-payment-platform-ui-complete-agent-kit` (`ee14074`, Clean) |

---

## 3. Repository State

### 3.1 Frontend Baseline
The frontend codebase is clean, fully typed in TypeScript strict mode, and frozen through prior milestones:

| Phase | Delivered Scope | Baseline Verification |
| :--- | :--- | :--- |
| **F0** | Next.js 14 App Router, Tailwind CSS design system, TanStack Query v5, Zod schemas, Vitest + Playwright test harnesses. | **FROZEN** |
| **F1** | Stateless JWT authentication (`/login`, `/register`), in-memory access token isolation, tab-scoped refresh storage with single-flight mutex, `ProtectedRoute`, automatic Bearer attachment. | **FROZEN** |
| **F2** | Customer dashboard shell (`/dashboard`), navigation (`CustomerNav`, `CustomerSidebar`), authoritative account retrieval (`GET /api/v1/accounts/{id}`), `AccountCard`, `AccountStatusBadge`. | **FROZEN** |
| **F3** | Payment creation form (`/payments/new`), idempotency key management, RFC 7807 error presentation, bounded polling coordinator with `AbortController`, authoritative payment detail (`/payments/[id]`), `PENDING_RECONCILIATION` handling. | **FROZEN** |
| **F4** | Customer transaction history & payment-to-ledger trace assessment. | **CLOSED** (`F4_FRONTEND_BLOCKED_BY_FROZEN_BACKEND`) |
| **F5** | Refund creation/detail, Reversal creation/detail, Payout creation/detail. | **FROZEN** (`frontend-f5-ready`) |
| **F6** | Customer reconciliation gap analysis. | **CLOSED** (`frontend-f6-blocked`) |

### 3.2 Pre-existing Admin Route Placeholders
The directory `src/app/(admin)/admin` already exists in the repository structure with placeholder directories:
- `src/app/(admin)/admin/accounts`
- `src/app/(admin)/admin/audit`
- `src/app/(admin)/admin/dashboard`
- `src/app/(admin)/admin/ledger`
- `src/app/(admin)/admin/payments`
- `src/app/(admin)/admin/reconciliation`
- `src/app/(admin)/admin/users`

All contain only `.gitkeep` and have zero implementation code.

---

## 4. Backend Contract Verification

Verification was executed via direct inspection of Java source files in `com.paymentledger.*`.

### 4.1 Security & Method Interception
- Spring Security configuration (`com.paymentledger.auth.config.SecurityConfig.java:23`) explicitly enables method-level security:
  ```java
  @Configuration
  @EnableWebSecurity
  @EnableMethodSecurity
  public class SecurityConfig { ... }
  ```
- Every administrative controller enforces:
  ```java
  @PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")
  ```
- Any token without `ROLE_ADMIN` or `ROLE_SYSTEM` produces HTTP `403 Forbidden` with RFC 7807 problem details:
  ```json
  {
    "type": "about:blank",
    "title": "Forbidden",
    "status": 403,
    "detail": "Access Denied"
  }
  ```

### 4.2 Pagination & Clamping Mechanics
- `com.paymentledger.admin.api.dto.PageUtils.java` enforces strict server-side paging:
  - `DEFAULT_PAGE_SIZE = 20`
  - `MAX_PAGE_SIZE = 100`
  - Requests with `size > 100` are clamped to 100 to prevent unbounded memory allocation and denial-of-service.
  - Sorting parameters follow Spring Data `Sort` conventions (`sort=createdAt,desc`).

---

## 5. Verified Admin Endpoints

The complete inventory of **33 verified backend admin endpoints** across all 12 controllers is detailed below:

### 5.1 Dashboard Controller (`AdminDashboardController.java`)
- **`GET /api/v1/admin/dashboard/summary`**
  - **Auth**: `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`
  - **Response**: `DashboardSummaryResponse`
    - `totalUsers`, `totalAccounts`, `activeAccounts`, `frozenAccounts`
    - `totalPayments`, `settledPayments`, `failedPayments`, `pendingReconciliationPayments`
    - `openReconciliationCases`, `totalNotifications`

### 5.2 Payment Oversight Controller (`AdminPaymentController.java`)
- **`GET /api/v1/admin/payments`**
  - **Params**: `status` (`PaymentStatus`), `payerAccountId` (`UUID`), `payeeAccountId` (`UUID`), `Pageable`
  - **Response**: `Page<PaymentAdminResponse>`
- **`GET /api/v1/admin/payments/{paymentId}`**
  - **Params**: `@PathVariable UUID paymentId`
  - **Response**: `PaymentAdminResponse` (includes `amountMinor`, `feeMinor`, `idempotencyKey`, `providerReference`, timestamps)

### 5.3 Forensic Investigation Controller (`AdminInvestigationController.java`)
- **`GET /api/v1/admin/investigations/payments/{paymentId}`**
  - **Response**: `PaymentInvestigationTraceResponse`
    - `payment`: `PaymentAdminResponse`
    - `payerAccount`: `AccountAdminResponse`
    - `payeeAccount`: `AccountAdminResponse`
    - `ledgerTransaction`: `LedgerTransactionAdminResponse` (including complete list of double-entry `LedgerEntryAdminResponse` rows)
    - `outboxEvents`: `List<OutboxEventSummary>` (event type, aggregate, status, topic, publication timestamp)
    - `kafkaAudits`: `List<KafkaAuditSummary>` (event audits queried from `payment_event_audits` table)
    - `reconciliationCases`: `List<ReconciliationCaseAdminResponse>`
    - `notifications`: `List<NotificationSummary>` (recipient PII masked: `jo***@example.com`)

### 5.4 Refund Controller (`AdminRefundController.java`)
- **`GET /api/v1/admin/refunds`**
  - **Params**: `paymentId` (`UUID`), `status` (`RefundStatus`), `Pageable`
  - **Response**: `Page<RefundAdminResponse>`
- **`GET /api/v1/admin/refunds/{refundId}`**
  - **Response**: `RefundAdminResponse`

### 5.5 Payout Controller (`AdminPayoutController.java`)
- **`GET /api/v1/admin/payouts`**
  - **Params**: `accountId` (`UUID`), `status` (`PayoutStatus`), `Pageable`
  - **Response**: `Page<PayoutAdminResponse>`
- **`GET /api/v1/admin/payouts/{payoutId}`**
  - **Response**: `PayoutAdminResponse`

### 5.6 Ledger Controller (`AdminLedgerController.java`)
- **`GET /api/v1/admin/ledger/transactions`**
  - **Params**: `sourceReferenceType` (`String`), `Pageable`
  - **Response**: `Page<LedgerTransactionAdminResponse>` (each transaction includes nested `entries`)
- **`GET /api/v1/admin/ledger/transactions/{transactionId}`**
  - **Response**: `LedgerTransactionAdminResponse` with all debit/credit entry pairs
- **`GET /api/v1/admin/ledger/accounts/{accountId}/entries`**
  - **Params**: `@PathVariable UUID accountId`, `Pageable`
  - **Response**: `Page<LedgerEntryAdminResponse>` (sequence numbers, directions, amounts, currencies)

### 5.7 Account Governance Controller (`AdminAccountController.java`)
- **`GET /api/v1/admin/accounts`**
  - **Params**: `ownerId` (`UUID`), `accountType` (`AccountType`), `status` (`AccountStatus`), `Pageable`
  - **Response**: `Page<AccountAdminResponse>`
- **`GET /api/v1/admin/accounts/{accountId}`**
  - **Response**: `AccountAdminResponse`
- **`GET /api/v1/admin/accounts/{accountId}/balance-summary`**
  - **Response**: `AccountBalanceSummaryResponse`
    - Compares cached `materializedBalanceMinor` against authoritative `ledgerEntryRepository.calculateLedgerBalanceMinor(accountId)`.
    - Exposes `differenceMinor` and boolean `isConsistent`.
- **`POST /api/v1/admin/accounts/{accountId}/freeze`**
  - **Body**: `AccountLifecycleRequest` (`reason`)
  - **Audit**: Automatically records audit entry via `AdminAuditService`.
  - **Response**: `AccountAdminResponse` (status `FROZEN`)
- **`POST /api/v1/admin/accounts/{accountId}/unfreeze`**
  - **Body**: `AccountLifecycleRequest` (`reason`)
  - **Audit**: Automatically records audit entry via `AdminAuditService`.
  - **Response**: `AccountAdminResponse` (status `ACTIVE`)

### 5.8 Financial Adjustment Controller (`AdminAdjustmentController.java`)
- **`POST /api/v1/admin/adjustments`**
  - **Headers**: Mandatory `Idempotency-Key`, optional `X-Correlation-ID`
  - **Body**: `FinancialAdjustmentCreateRequest`
    - `sourceAccountId` (`UUID`, non-null)
    - `targetAccountId` (`UUID`, non-null, must be distinct from source)
    - `amountMinor` (`Long`, $\ge 1$)
    - `currency` (`String`, 3-letter ISO code)
    - `reason` (`String`, non-blank, max 500 chars)
  - **Financial Action**: Posts double-entry `SYSTEM_ADJUSTMENT` ledger transaction atomically.
  - **Response**: `FinancialAdjustmentResponse` (HTTP 201 Created)
- **`GET /api/v1/admin/adjustments/{adjustmentId}`**
  - **Response**: `FinancialAdjustmentResponse`

### 5.9 Audit Log Controller (`AdminAuditController.java`)
- **`GET /api/v1/admin/audit-logs`**
  - **Params**: `action` (`String`), `resourceType` (`String`), `resourceId` (`String`), `Pageable`
  - **Response**: `Page<AdminAuditLogResponse>`
- **`GET /api/v1/admin/audit-logs/{id}`**
  - **Response**: `AdminAuditLogResponse` (includes `actorUserId`, `actorRole`, `beforeState`, `afterState`, `correlationId`, `requestId`)

### 5.10 User Directory Controller (`AdminUserController.java`)
- **`GET /api/v1/admin/users`**
  - **Params**: `role` (`Role`), `status` (`UserStatus`), `email` (`String`), `Pageable`
  - **Response**: `Page<UserAdminResponse>` (safely excludes password hashes)
- **`GET /api/v1/admin/users/{userId}`**
  - **Response**: `UserAdminResponse`

### 5.11 Notification Oversight Controller (`AdminNotificationController.java`)
- **`GET /api/v1/admin/notifications`**
  - **Params**: `status` (`NotificationStatus`), `Pageable`
  - **Response**: `Page<NotificationEntity>`
- **`GET /api/v1/admin/notifications/{id}`**
  - **Response**: `NotificationDetailResponse` (notification entity + delivery attempt history)
- **`POST /api/v1/admin/notifications/{id}/retry`**
  - **Audit**: Records audit log for manual retry.
  - **Response**: `NotificationEntity`
- **`POST /api/v1/admin/notifications/run-worker`**
  - **Params**: `limit` (default 25)
  - **Response**: `Integer` (processed notifications count)

### 5.12 Reconciliation Controller (`AdminReconciliationController.java`)
- **`GET /api/v1/admin/reconciliation/cases`**
  - **Params**: `status` (`ReconciliationStatus`), `Pageable`
  - **Response**: `Page<ReconciliationCaseEntity>`
- **`GET /api/v1/admin/reconciliation/cases/{id}`**
  - **Response**: `CaseDetailResponse` (unwrapped `caseDetails` + `attempts`)
- **`POST /api/v1/admin/reconciliation/cases/{id}/trigger`**
  - **Response**: `ReconciliationCaseEntity`
- **`POST /api/v1/admin/reconciliation/cases/{id}/retry`**
  - **Audit**: Records audit log for manual retry.
  - **Response**: `CaseDetailResponse`
- **`POST /api/v1/admin/reconciliation/run`**
  - **Response**: `Integer` (processed cases count)
- **`POST /api/v1/admin/reconciliation/audit/ledger`**
  - **Response**: `LedgerConsistencyAuditor.AuditReport`
- **`POST /api/v1/admin/reconciliation/audit/balances`**
  - **Response**: `BalanceConsistencyAuditor.BalanceReport`

---

## 6. Endpoint Authorization Matrix

| Endpoint Path | HTTP Method | Target Audience | Allowed Roles | Enforcement Mechanism | Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/admin/dashboard/summary` | `GET` | Admin Operations | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/payments` | `GET` | Compliance / Support | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/payments/{id}` | `GET` | Compliance / Support | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/investigations/payments/{id}` | `GET` | Fraud / Audit / Ops | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/refunds` | `GET` | Ops / Finance | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/refunds/{id}` | `GET` | Ops / Finance | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/payouts` | `GET` | Ops / Finance | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/payouts/{id}` | `GET` | Ops / Finance | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/ledger/transactions` | `GET` | Accounting / Audit | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/ledger/transactions/{id}` | `GET` | Accounting / Audit | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/ledger/accounts/{id}/entries` | `GET` | Accounting / Audit | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/accounts` | `GET` | Risk / Ops | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/accounts/{id}` | `GET` | Risk / Ops | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/accounts/{id}/balance-summary`| `GET` | Risk / Ops | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/accounts/{id}/freeze` | `POST` | Risk / Compliance | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/accounts/{id}/unfreeze` | `POST` | Risk / Compliance | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/adjustments` | `POST` | Senior Finance / Ops | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/adjustments/{id}` | `GET` | Senior Finance / Ops | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/audit-logs` | `GET` | Security / Audit | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/audit-logs/{id}` | `GET` | Security / Audit | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/users` | `GET` | User Administration | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/users/{id}` | `GET` | User Administration | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/notifications` | `GET` | Platform Support | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/notifications/{id}` | `GET` | Platform Support | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/notifications/{id}/retry` | `POST` | Platform Support | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/notifications/run-worker` | `POST` | Platform Support | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/reconciliation/cases` | `GET` | Settlement / Ops | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/reconciliation/cases/{id}` | `GET` | Settlement / Ops | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/reconciliation/cases/{id}/trigger` | `POST` | Settlement / Ops | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/reconciliation/cases/{id}/retry` | `POST` | Settlement / Ops | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/reconciliation/run` | `POST` | Settlement / Ops | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/reconciliation/audit/ledger` | `POST` | Chief Financial Auditor | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/reconciliation/audit/balances` | `POST` | Chief Financial Auditor | `ROLE_ADMIN`, `ROLE_SYSTEM` | `@PreAuthorize` | **Admin-only** |

---

## 7. Admin Capability Matrix

| Operational Capability | Backend Support | HTTP Route | Frontend Feasibility | Status |
| :--- | :--- | :--- | :--- | :--- |
| **System Health & Metric Cards** | Verified | `GET /api/v1/admin/dashboard/summary` | Dashboard KPI overview card grid | **SUPPORTED** |
| **Payment Inspection & Query** | Verified | `GET /api/v1/admin/payments` | Paginated data table with status filtering | **SUPPORTED** |
| **Payment Detail Inspection** | Verified | `GET /api/v1/admin/payments/{id}` | Authoritative payment attribute viewer | **SUPPORTED** |
| **Forensic End-to-End Payment Trace** | Verified | `GET /api/v1/admin/investigations/payments/{id}` | Multi-stage lifecycle visualizer (Payment $\to$ Ledger $\to$ Outbox $\to$ Kafka $\to$ Notification) | **SUPPORTED** |
| **Double-Entry Ledger Journal Query** | Verified | `GET /api/v1/admin/ledger/transactions` | Paginated transaction list with nested entry view | **SUPPORTED** |
| **Ledger Transaction Detail** | Verified | `GET /api/v1/admin/ledger/transactions/{id}` | Balanced debit/credit entries viewer | **SUPPORTED** |
| **Account Ledger Statement** | Verified | `GET /api/v1/admin/ledger/accounts/{id}/entries` | Chronological ledger entry ledger statement | **SUPPORTED** |
| **Account Governance Directory** | Verified | `GET /api/v1/admin/accounts` | Filterable account list (status, type, owner) | **SUPPORTED** |
| **Account Balance-Consistency Audit** | Verified | `GET /api/v1/admin/accounts/{id}/balance-summary` | Real-time comparison card (Materialized vs Ledger) | **SUPPORTED** |
| **Account Freeze Mutation** | Verified | `POST /api/v1/admin/accounts/{id}/freeze` | Destructive action dialog with mandatory reason | **SUPPORTED** |
| **Account Unfreeze Mutation** | Verified | `POST /api/v1/admin/accounts/{id}/unfreeze` | Operational action dialog with mandatory reason | **SUPPORTED** |
| **Financial Compensating Adjustment** | Verified | `POST /api/v1/admin/adjustments` | Idempotent double-entry transfer form with reason | **SUPPORTED** |
| **Adjustment Receipt Viewer** | Verified | `GET /api/v1/admin/adjustments/{id}` | Adjustment confirmation & ledger reference receipt | **SUPPORTED** |
| **Security & Administrative Audit Logs**| Verified | `GET /api/v1/admin/audit-logs` | Filterable audit event viewer with state diffs | **SUPPORTED** |
| **Audit Log Detail Viewer** | Verified | `GET /api/v1/admin/audit-logs/{id}` | Full JSON before/after state diff inspector | **SUPPORTED** |
| **User Directory Query** | Verified | `GET /api/v1/admin/users` | Identity directory with email and role filtering | **SUPPORTED** |
| **Notification Oversight & Retry** | Verified | `GET /api/v1/admin/notifications`, `POST /{id}/retry` | Delivery tracking table & manual retry trigger | **SUPPORTED** |
| **Reconciliation Case Oversight** | Verified | `GET /api/v1/admin/reconciliation/cases` | Filterable case table with discrepancy badges | **SUPPORTED** |
| **Reconciliation Case Detail & History**| Verified | `GET /api/v1/admin/reconciliation/cases/{id}` | Case inspector with complete attempt timeline | **SUPPORTED** |
| **Reconciliation Manual Retry** | Verified | `POST /api/v1/admin/reconciliation/cases/{id}/retry` | Action button triggering worker retry + audit | **SUPPORTED** |
| **Consistency Auditor Triggers** | Verified | `POST /api/v1/admin/reconciliation/audit/*` | Global ledger/balance consistency check triggers | **SUPPORTED** |
| **Refunds & Payouts Oversight** | Verified | `GET /api/v1/admin/refunds`, `GET /api/v1/admin/payouts` | Filterable administrative transaction tables | **SUPPORTED** |
| **Arbitrary Ledger Entry Modification** | **None** | *None (Immutable by Design)* | Prohibited by Double-Entry Accounting | **BLOCKED** |
| **Manual User Registration via Admin** | **None** | *None (Auth Flow Only)* | Only customer self-registration exists | **BLOCKED** |
| **Direct DB Query Injection / SQL** | **None** | *None (Security Vulnerability)* | Prohibited by Principle of Least Privilege | **BLOCKED** |

---

## 8. Read-Only vs Mutation Classification

Every verified capability is classified into operational categories:

### 8.1 READ_ONLY (24 Endpoints)
These endpoints perform queries only, with zero state mutations or financial side-effects:
1. `GET /api/v1/admin/dashboard/summary`
2. `GET /api/v1/admin/payments`
3. `GET /api/v1/admin/payments/{id}`
4. `GET /api/v1/admin/investigations/payments/{id}`
5. `GET /api/v1/admin/refunds`
6. `GET /api/v1/admin/refunds/{id}`
7. `GET /api/v1/admin/payouts`
8. `GET /api/v1/admin/payouts/{id}`
9. `GET /api/v1/admin/ledger/transactions`
10. `GET /api/v1/admin/ledger/transactions/{id}`
11. `GET /api/v1/admin/ledger/accounts/{id}/entries`
12. `GET /api/v1/admin/accounts`
13. `GET /api/v1/admin/accounts/{id}`
14. `GET /api/v1/admin/accounts/{id}/balance-summary`
15. `GET /api/v1/admin/adjustments/{id}`
16. `GET /api/v1/admin/audit-logs`
17. `GET /api/v1/admin/audit-logs/{id}`
18. `GET /api/v1/admin/users`
19. `GET /api/v1/admin/users/{id}`
20. `GET /api/v1/admin/notifications`
21. `GET /api/v1/admin/notifications/{id}`
22. `GET /api/v1/admin/reconciliation/cases`
23. `GET /api/v1/admin/reconciliation/cases/{id}`
24. *(Actuator / Metrics endpoints)*

### 8.2 SAFE_OPERATIONAL_ACTION (3 Endpoints)
Operational actions that do not change balances directly but trigger asynchronous background workers:
1. `POST /api/v1/admin/notifications/run-worker` — Triggers notification batch processing.
2. `POST /api/v1/admin/reconciliation/run` — Triggers candidate scan and batch claims.
3. `POST /api/v1/admin/reconciliation/cases/{id}/trigger` — Immediately triggers reconciliation check.

### 8.3 SENSITIVE_OPERATION (3 Endpoints)
Non-financial mutations that affect system operations, user access, or communication delivery:
1. `POST /api/v1/admin/accounts/{id}/freeze` — Transitions account to `FROZEN`, preventing outgoing debits. Mandatory confirmation required.
2. `POST /api/v1/admin/accounts/{id}/unfreeze` — Transitions account to `ACTIVE`. Mandatory confirmation required.
3. `POST /api/v1/admin/notifications/{id}/retry` — Retries a failed notification to an external recipient.

### 8.4 FINANCIAL_MUTATION (2 Endpoints)
Directly posts immutable double-entry ledger transactions affecting account balances:
1. `POST /api/v1/admin/adjustments` — Creates compensating double-entry ledger transaction between two distinct accounts. Mandatory `Idempotency-Key` and mandatory audit reason.
2. `POST /api/v1/admin/reconciliation/cases/{id}/retry` — Ingests external provider outcome; if provider succeeded, triggers atomic ledger settlement (`settlePaymentWithLedger`).

### 8.5 SYSTEM_OPERATION (2 Endpoints)
Consistency audit verification triggers that evaluate platform ledger health:
1. `POST /api/v1/admin/reconciliation/audit/ledger` — Executes `ledgerAuditor.auditLedgerConsistency()`.
2. `POST /api/v1/admin/reconciliation/audit/balances` — Executes `balanceAuditor.auditBalanceConsistency()`.

---

## 9. Financial Safety Analysis

The platform's non-negotiable financial rules govern the administrative frontend:

### 9.1 Immutable Double-Entry Accounting
- **No Direct Balance Editing**: Administrators **cannot** directly set or modify an account's balance. Account balances are strictly the sum of all historical debit and credit ledger entries:
  $$\text{Authoritative Balance} = \sum \text{Credits} - \sum \text{Debits}$$
- **Compensating Adjustments Only**: Corrections must be performed through `POST /api/v1/admin/adjustments`, which records both a debit entry on the source account and a credit entry on the target account, preserving system-wide zero-sum balance conservation.

### 9.2 Real-time Balance Consistency Verification
- `AdminAccountController.getBalanceSummary` computes:
  $$\text{differenceMinor} = \text{materializedBalanceMinor} - \text{authoritativeLedgerBalanceMinor}$$
- The UI must display both values with explicit visual badges:
  - If `differenceMinor == 0`: Green badge (`CONSISTENT`).
  - If `differenceMinor != 0`: Pulsing Red alert (`BALANCE_DISCREPANCY_DETECTED`) with exact minor unit difference.

### 9.3 Idempotency Enforcement for Financial Mutations
- `POST /api/v1/admin/adjustments` requires an `Idempotency-Key` header.
- The frontend must generate a client UUID v4 idempotency key when the adjustment modal opens and retain it across retries of the same user intent.
- Duplicate clicks must be disabled while a request is in-flight.

---

## 10. Security Gap Analysis

A comprehensive security review across OWASP Top 10 and enterprise payment standards was performed:

| Security Vector | Assessment | Backend Protection | Frontend Requirement |
| :--- | :--- | :--- | :--- |
| **Authentication** | Critical | Stateless Bearer JWT with 15-minute expiration | In-memory token storage; automated refresh via `useAuth` |
| **Role-Based Access Control (RBAC)** | Critical | Spring Security `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")` | `ProtectedRoute requiredRole="ADMIN"`, rendering `Access Restricted` alert for non-admins |
| **Customer/Admin Isolation** | Critical | Admin endpoints reside strictly under `/api/v1/admin/*` | Dedicated Next.js Route Group `(admin)` with dedicated layout and navigation |
| **IDOR Protection** | High | Admin role overrides customer ownership checks, but access is fully audited | All mutations record `actorId`, `actorRole`, `resourceId`, and `correlationId` |
| **CSRF Defense** | Medium | Stateless JWT architecture with disabled cookies (`SessionCreationPolicy.STATELESS`) | Not applicable for Bearer header tokens; CORS whitelist enforced |
| **Cross-Site Scripting (XSS)** | High | Backend HTML/SQL escaping, parameter binding | React automatic JSX escaping; forbid `dangerouslySetInnerHTML` |
| **PII & Sensitive Data Leakage** | High | `AdminInvestigationController` redacts notification recipient emails (`jo***@example.com`) | Display masked PII; do not log user emails or payment details to console |
| **Credential Exposure** | Critical | `AdminUserController` excludes password hashes from `UserAdminResponse` | Never request or display credential data |
| **Audit Trail Tampering** | Critical | `AdminAuditLogEntity` has no update or delete endpoints (append-only) | UI is strictly read-only for audit logs |

---

## 11. IDOR / RBAC Analysis

### 11.1 Administrative Privilege Scope
- In customer workflows (F2, F3, F5), object-level security strictly checks account ownership:
  ```java
  if (!actorId.equals(account.getOwnerId())) throw new AccessDeniedException();
  ```
- In administrative workflows (F7), operators holding `ROLE_ADMIN` or `ROLE_SYSTEM` have global operational clearance across all tenant accounts and payments.
- **Compensating Security Control**: Because administrators possess cross-tenant visibility, **every state-changing administrative action is immutably recorded** in `admin_audit_logs`:
  ```java
  adminAuditService.recordAudit(
      actorId, actorRole, "ACCOUNT_FREEZE", "ACCOUNT", accountId.toString(),
      reason, correlationId, requestId, "ACTIVE", "FROZEN", null
  );
  ```

### 11.2 Frontend Route Boundary Guard
The frontend must prevent customer tokens from accidentally navigating to admin URLs:
- Root admin layout `src/app/(admin)/layout.tsx` must wrap all sub-routes with:
  ```tsx
  <ProtectedRoute requiredRole="ADMIN">
    <AdminLayout>{children}</AdminLayout>
  </ProtectedRoute>
  ```
- If a customer (`ROLE_CUSTOMER`) enters `/admin/dashboard`, `ProtectedRoute` intercepts rendering and displays a prominent restriction notice without triggering backend requests.

---

## 12. Admin Information Architecture Proposal

The verified backend capabilities map cleanly to an operational information architecture under `/admin`:

```
/admin
  ├── /dashboard                      -> System KPI Summary, Activity Overview
  ├── /payments                       -> Global Payment Directory & Status Filters
  │     └── /[id]                     -> Payment Inspector & Forensic Trace View
  ├── /investigations/[paymentId]     -> Forensic Lifecycle Graph (Ledger, Outbox, Kafka, Recon)
  ├── /ledger
  │     ├── /transactions             -> Double-Entry Ledger Journal
  │     │     └── /[id]               -> Balanced Debit/Credit Entry Inspector
  │     └── /accounts/[accountId]     -> Account Ledger Statement
  ├── /accounts                       -> Account Directory & Status Governance
  │     └── /[id]                     -> Account Inspector, Balance Audit & Freeze/Unfreeze
  ├── /adjustments                    -> Compensating Adjustment History
  │     └── /new                      -> Double-Entry Adjustment Initiation Form
  ├── /refunds                        -> Global Refund Directory
  ├── /payouts                        -> Global Payout Directory
  ├── /reconciliation                 -> Discrepancy & Reconciliation Cases
  │     └── /[id]                     -> Case Inspector, Timeline & Manual Retry
  ├── /audit                          -> System Audit Log Search & State Diff Inspector
  ├── /notifications                  -> Notification Delivery Queue & Retry
  └── /users                          -> User Directory & Role Inspector
```

---

## 13. Route-by-Route Gap Analysis

| Route | Verified Backend API | Read/Write | Sensitive Fields | Implementation Status |
| :--- | :--- | :--- | :--- | :--- |
| **`/admin/dashboard`** | `GET /api/v1/admin/dashboard/summary` | Read-only | Aggregate platform volume | **IMPLEMENTABLE** |
| **`/admin/payments`** | `GET /api/v1/admin/payments` | Read-only | Account IDs, amounts | **IMPLEMENTABLE** |
| **`/admin/payments/[id]`** | `GET /api/v1/admin/payments/{id}` | Read-only | Provider references, idempotency keys | **IMPLEMENTABLE** |
| **`/admin/investigations/[paymentId]`**| `GET /api/v1/admin/investigations/payments/{id}` | Read-only | Redacted recipient emails | **IMPLEMENTABLE** |
| **`/admin/ledger/transactions`** | `GET /api/v1/admin/ledger/transactions` | Read-only | Internal settlement account IDs | **IMPLEMENTABLE** |
| **`/admin/ledger/transactions/[id]`** | `GET /api/v1/admin/ledger/transactions/{id}` | Read-only | Sequence numbers, debit/credit entries | **IMPLEMENTABLE** |
| **`/admin/ledger/accounts/[id]`** | `GET /api/v1/admin/ledger/accounts/{id}/entries` | Read-only | Historical financial entries | **IMPLEMENTABLE** |
| **`/admin/accounts`** | `GET /api/v1/admin/accounts` | Read-only | Account numbers, owner UUIDs | **IMPLEMENTABLE** |
| **`/admin/accounts/[id]`** | `GET /api/v1/admin/accounts/{id}`<br>`GET /balance-summary`<br>`POST /freeze`, `POST /unfreeze` | Read + Mutation | Materialized vs Ledger balances | **IMPLEMENTABLE** |
| **`/admin/adjustments`** | `POST /api/v1/admin/adjustments`<br>`GET /api/v1/admin/adjustments/{id}` | Mutation + Read | Financial amounts, justification reason | **IMPLEMENTABLE** |
| **`/admin/refunds`** | `GET /api/v1/admin/refunds` | Read-only | Refund amounts, provider references | **IMPLEMENTABLE** |
| **`/admin/payouts`** | `GET /api/v1/admin/payouts` | Read-only | Payout amounts, settlement accounts | **IMPLEMENTABLE** |
| **`/admin/reconciliation`** | `GET /api/v1/admin/reconciliation/cases`<br>`POST /run`<br>`POST /audit/ledger`, `/audit/balances` | Read + Safe Action | Discrepancy types, lease worker IDs | **IMPLEMENTABLE** |
| **`/admin/reconciliation/[id]`** | `GET /api/v1/admin/reconciliation/cases/{id}`<br>`POST /trigger`, `POST /retry` | Read + Mutation | Attempt counts, error traces | **IMPLEMENTABLE** |
| **`/admin/audit`** | `GET /api/v1/admin/audit-logs`<br>`GET /api/v1/admin/audit-logs/{id}` | Read-only | Actor UUIDs, state diffs, correlation IDs | **IMPLEMENTABLE** |
| **`/admin/notifications`** | `GET /api/v1/admin/notifications`<br>`POST /{id}/retry`, `POST /run-worker` | Read + Action | Redacted recipient destinations | **IMPLEMENTABLE** |
| **`/admin/users`** | `GET /api/v1/admin/users`<br>`GET /api/v1/admin/users/{id}` | Read-only | User email addresses, roles | **IMPLEMENTABLE** |

---

## 14. Admin Table Requirements

All administrative list views share standardized data-table requirements:
1. **Server-Side Pagination**:
   - Query parameters `page` (0-indexed) and `size` (default 20, max 100).
   - Display current page, total pages, and total elements from Spring Data `Page<T>`.
2. **URL State Synchronization**:
   - Filter states (`status`, `role`, `query`) must synchronize with URL search params (`useSearchParams`) to enable bookmarking and link sharing among operators.
3. **Lossless Financial Formatting**:
   - Monetary values must be formatted via `formatMinorUnits()` using integer arithmetic.
4. **Stale Data Invalidation**:
   - TanStack Query cache `staleTime` set to 15 seconds for admin tables, with a manual "Refresh" button on every table header.

---

## 15. Admin Detail Requirements

Detail views must clearly differentiate between:
- **Authoritative Backend Data**: Entity ID, status, amount in minor units, currency, immutable timestamps (`createdAt`), compensating transaction IDs.
- **Frontend Presentation Layer**: Relative time indicators ("5 minutes ago"), localized currency formatting, color-coded status badges.
- **Audit Metadata**: Correlation ID, request ID, operator ID, and link to the relevant audit log entry.

---

## 16. Admin Mutation UX Requirements

Every administrative mutation must adhere to strict UX safety standards:

| Mutation | Action Trigger | Confirmation Requirement | Idempotency | Post-Mutation Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Account Freeze** | "Freeze Account" button | Modal dialog requiring explicit justification reason (`@Size(max=500)`) | Backend audit-tracked | Invalidate account query cache; display amber warning banner |
| **Account Unfreeze** | "Unfreeze Account" button | Modal dialog requiring explicit justification reason | Backend audit-tracked | Invalidate account query cache; restore green active badge |
| **Financial Adjustment** | "Post Adjustment" submit | Two-step review modal summarizing source, target, amount, and reason | Mandatory client-generated `Idempotency-Key` (UUID v4) | Route to adjustment receipt; invalidate ledger & account caches |
| **Reconciliation Retry** | "Retry Reconciliation" button | Confirmation dialog indicating external provider will be re-queried | Backend worker lease lock | Optimistic loading state; display updated attempt count |
| **Notification Retry** | "Retry Delivery" button | Inline confirmation prompt | Backend audit-tracked | Update notification delivery attempt timeline |

---

## 17. Traceability Analysis

The backend's `AdminInvestigationController` provides complete, verified distributed traceability:

```
[ HTTP Request (X-Correlation-ID) ]
               │
               ▼
       [ Payment Record ]  (AdminPaymentController: GET /api/v1/admin/payments/{id})
               │
               ├─────────────────────────────────────────┐
               ▼                                         ▼
   [ Ledger Transaction ]                       [ Outbox Event ]
(AdminLedgerController: tx.getId())       (AggregateType="PAYMENT", Status=PUBLISHED)
               │                                         │
               ▼                                         ▼
   [ 2x Ledger Entries ]                         [ Kafka Topic ]
(DEBIT Payer, CREDIT Payee)             (payment.events -> Consumer Audit Log)
               │                                         │
               ▼                                         ▼
[ Balance Consistency Check ]                 [ Notification Delivery ]
(calculateLedgerBalanceMinor)              (AdminNotificationController: Delivery Log)
```

The frontend can visualize this entire pipeline in a single unified **Forensic Investigation View** at `/admin/investigations/[paymentId]`.

---

## 18. Auditability Analysis

- Every mutating administrative controller interacts with `AdminAuditService.recordAudit()`.
- The `admin_audit_logs` table persists:
  - `actor_user_id` (`UUID`)
  - `actor_role` (`ROLE_ADMIN` / `ROLE_SYSTEM`)
  - `action` (`ACCOUNT_FREEZE`, `ACCOUNT_UNFREEZE`, `RECONCILIATION_RETRY`, `NOTIFICATION_RETRY`, etc.)
  - `resource_type` and `resource_id`
  - `reason` (mandatory operator text)
  - `correlation_id` and `request_id`
  - `before_state` and `after_state` (JSON / string diffs)
  - `created_at` (immutable PostgreSQL timestamp)
- The frontend exposes this through the **Audit Log Explorer** (`/admin/audit`), allowing compliance officers to trace any administrative intervention to an individual operator.

---

## 19. Error Handling Analysis

All admin APIs return standard RFC 7807 problem details:
```json
{
  "type": "https://api.paymentledger.com/errors/RESOURCE_NOT_FOUND",
  "title": "Not Found",
  "status": 404,
  "detail": "Payment not found: 3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "errorCode": "PAYMENT_NOT_FOUND",
  "correlationId": "c4b9d072-98e3-4f51-b847-a82f3ef8b931",
  "timestamp": "2026-09-26T10:35:00Z"
}
```
The frontend's existing `ApiError` class in `src/lib/api/client.ts` automatically parses this payload. Admin screens will render the standard `InlineAlert` or `ErrorState` card with the backend correlation ID prominently displayed for operational support.

---

## 20. Accessibility Analysis (WCAG 2.2 AA)

1. **Focus Management**:
   - Modals and confirmation dialogs must trap focus using standard dialog semantics (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`). Focus must return to the trigger button upon closure.
2. **Keyboard Navigation**:
   - All data table rows must support keyboard navigation (`Tab`, `Enter` to open detail).
3. **Screen Reader Status Announcements**:
   - Asynchronous mutation spinners and balance inconsistency alerts must utilize `role="status"` with `aria-live="polite"` or `role="alert"` with `aria-live="assertive"` for critical financial discrepancies.
4. **Color Independence**:
   - Status badges must combine distinct text labels, icons (e.g. `CheckCircle`, `AlertTriangle`, `XCircle`), and borders, ensuring information is accessible without relying solely on color.

---

## 21. Performance Analysis

1. **Pagination Clamping**:
   - Tables strictly bind to server-side page clamps (default 20, max 100), preventing large JSON transfers.
2. **Query Caching Strategy**:
   - Admin read queries configure `staleTime: 15_000` (15 seconds) and `gcTime: 300_000` (5 minutes).
   - Mutations immediately trigger `queryClient.invalidateQueries()` on affected keys.
3. **Code Splitting**:
   - All admin routes are dynamically bundled inside the `(admin)` route group, ensuring customer-facing bundles are not bloated by administrative dependencies.

---

## 22. Observability Analysis

1. **Correlation Propagation**:
   - Every administrative HTTP request generates or propagates an `X-Correlation-ID` header via `apiFetch()`.
2. **Structured Operational Logging**:
   - Frontend logger (`src/lib/telemetry/logger.ts`) emits structured JSON client events for admin navigation, mutation attempts, and API errors, strictly omitting PII.
3. **Audit Visibility**:
   - Action confirmation dialogs render the active `correlationId` so the operator can cross-reference logs in Grafana/Loki.

---

## 23. Testing Gap Analysis

| Test Category | Target Scope | Risk Covered | Planned Tool |
| :--- | :--- | :--- | :--- |
| **Unit** | DTO parsers, money formatters, audit diff formatters | Data truncation, floating-point math errors | Vitest |
| **Component** | Admin data tables, action confirmation dialogs, balance cards | Focus trap failure, disabled submit state | Vitest + React Testing Library |
| **Integration** | Admin query hooks, mutation hooks with cache invalidation | Stale data display, error boundary failure | Vitest + MSW |
| **Security** | `ProtectedRoute` blocking `ROLE_CUSTOMER` from `/admin/*` | Unauthorized route traversal | Vitest + Playwright |
| **E2E** | Full admin journey: Login as Admin $\to$ Freeze Account $\to$ Post Adjustment $\to$ Verify Audit Log | Broken operational flows | Playwright |
| **Accessibility** | Axe-core accessibility audit on all admin views | WCAG 2.2 AA violations | Playwright + axe-core |

---

## 24. Reusable Frontend Components

The following existing components will be reused directly without modification:
- `src/lib/api/client.ts` (`apiFetch`, `ApiError`, `generateCorrelationId`)
- `src/features/auth/auth-context.tsx` (`useAuth`, session management)
- `src/components/layout/protected-route.tsx` (`ProtectedRoute` with `requiredRole="ADMIN"`)
- `src/lib/formatting/money.ts` (`formatMinorUnits`, `getCurrencyDecimals`)
- `src/lib/telemetry/logger.ts` (`logger.info`, `logger.error`)

---

## 25. New Components Potentially Required

The following components will be created under `src/features/admin/components` or `src/components/admin`:
1. `AdminNav` / `AdminSidebar`: Dedicated administrative navigation shell.
2. `AdminDataTable`: Reusable paginated table with sorting headers, search bar, and empty/loading states.
3. `BalanceAuditCard`: Real-time balance consistency inspector displaying materialized vs ledger comparison.
4. `ForensicTraceGraph`: Multi-step visualizer for payment investigation lifecycle.
5. `ActionConfirmDialog`: High-risk confirmation dialog requiring mandatory justification reason.
6. `AdjustmentForm`: Double-entry adjustment modal with idempotency management.
7. `AuditDiffViewer`: JSON before/after state diff presenter for audit logs.

---

## 26. New Hooks Potentially Required

Under `src/features/admin/hooks`:
1. `useAdminDashboard`: Fetches `/api/v1/admin/dashboard/summary`.
2. `useAdminPayments`: Paginated query for `/api/v1/admin/payments`.
3. `usePaymentInvestigation`: Fetches `/api/v1/admin/investigations/payments/{id}`.
4. `useAdminAccounts`: Paginated query for `/api/v1/admin/accounts`.
5. `useAccountBalanceSummary`: Queries `/api/v1/admin/accounts/{id}/balance-summary`.
6. `useAccountLifecycle`: Mutations for freeze and unfreeze.
7. `useAdminLedger`: Queries transactions and account entries.
8. `useFinancialAdjustment`: Mutation for `/api/v1/admin/adjustments`.
9. `useAdminAuditLogs`: Paginated query for `/api/v1/admin/audit-logs`.
10. `useAdminReconciliation`: Queries cases, retry mutation, and consistency auditors.

---

## 27. New API Client Methods Potentially Required

Under `src/lib/api/endpoints/admin-api.ts`:
- All 33 verified admin endpoints mapped to typed TypeScript functions utilizing `apiFetch()`.

---

## 28. Backend Blockers

The following items are **BLOCKED BY FROZEN BACKEND**:
1. **Arbitrary Ledger Entry Editing**: The backend provides no endpoint to edit or delete posted ledger entries (immutable double-entry invariant).
2. **Customer Self-Service Reconciliation**: Customer reconciliation case management remains blocked (F6 frozen).
3. **Direct User Creation via Admin**: No administrative user creation endpoint exists (users register through the public auth flow).
4. **Arbitrary Payment Deletion / Hard Cancellation**: Settled payments cannot be deleted or forced to failed status outside of reconciliation.

---

## 29. Unverified Capabilities

**None**. All 33 administrative endpoints evaluated in this report were verified directly from compiled Java source code and Spring Security annotations in `payment-ledger-platform-complete-agent-kit`.

---

## 30. Explicit Out-of-Scope Items

The following are strictly **OUT OF SCOPE** for Phase F7:
- Modifying backend source code or Flyway migrations.
- Creating speculative customer-facing ledger endpoints.
- Generating synthetic or simulated balance calculations in the browser.
- Exposing admin endpoints to customer or merchant route groups.
- Modifying existing frozen F0–F6 frontend source files.
- Implementing Phase F8 (Production Hardening) or Phase F9 (Deployment).

---

## 31. F7 Implementation Scope

The approved scope for Phase F7 implementation consists exclusively of:
1. **Admin Layout & Navigation**: Protected by `ProtectedRoute requiredRole="ADMIN"`.
2. **Admin Dashboard**: System metrics from `/api/v1/admin/dashboard/summary`.
3. **Payment Oversight & Forensic Investigation**: Listing, detail, and complete payment-to-ledger trace.
4. **Ledger Journal & Account Statements**: Double-entry journal queries.
5. **Account Governance**: Account directory, real-time balance audit, freeze, and unfreeze.
6. **Financial Adjustments**: Idempotent compensating ledger adjustment form and receipts.
7. **Reconciliation Oversight**: Discrepancy case directory, timeline inspector, manual retries, and audit triggers.
8. **Audit Log Explorer**: Searchable security audit log viewer with state diffs.
9. **User & Notification Oversight**: User directory and notification retry console.

---

## 32. Recommended Implementation Order

1. **Step 1: Admin Types & API Client**: Implement typed DTOs and API methods for verified endpoints.
2. **Step 2: Admin Navigation Shell & Route Protection**: Build `AdminNav`, `AdminSidebar`, and layout guarding `/admin/*`.
3. **Step 3: Admin Dashboard**: Deliver KPI cards and platform summary.
4. **Step 4: Payment Oversight & Forensic Trace**: Implement payment list, detail, and investigation graph.
5. **Step 5: Ledger Journal & Account Governance**: Implement ledger tables, account directory, balance audit card, and freeze/unfreeze modals.
6. **Step 6: Financial Adjustments**: Implement double-entry adjustment modal with idempotency.
7. **Step 7: Reconciliation & Audit Logs**: Implement reconciliation case management, audit log explorer, user directory, and notification console.
8. **Step 8: Automated Test Suite & Freeze Gate**: Vitest unit/component tests and Playwright E2E tests for the full admin suite.

---

## 33. Freeze / Gate Criteria

Before Phase F7 implementation can be declared frozen and tagged:
1. Zero TypeScript compilation errors (`tsc --noEmit`).
2. Zero ESLint violations (`pnpm lint`).
3. 100% of existing unit tests (F0–F5) pass without regression.
4. Comprehensive unit & component tests added for all new admin views.
5. Playwright E2E tests validating:
   - Admin access granted to `ROLE_ADMIN`.
   - Admin access denied to `ROLE_CUSTOMER`.
   - Successful account freeze/unfreeze with audit trail confirmation.
   - Successful financial adjustment with ledger reference.
   - Forensic payment trace visualization.
6. Zero sensitive credentials or PII leaked in logs or UI.

---

## 34. Final F7 Determination

### F7 Decision

**Status**:  
$$\mathbf{F7\_READY\_FOR\_IMPLEMENTATION}$$

### Implementable Scope
- All 33 verified administrative endpoints spanning Dashboard, Payments, Forensic Investigations, Ledger, Accounts, Adjustments, Audit Logs, Users, Notifications, and Reconciliation.

### Blocked Scope
- Arbitrary ledger entry modification (immutable ledger invariant).
- Customer-accessible ledger views or reconciliation cases (retains F4 & F6 frozen blockers).
- Admin direct user creation without auth flow.

### Unverified Scope
- **None** (all endpoints verified from source).

### Backend Changes Required
- **NONE**. The frozen backend satisfies 100% of the F7 Admin UI requirements.

### Frontend Changes Allowed After Approval
- Creation of new files under `src/app/(admin)/**`, `src/features/admin/**`, `src/components/admin/**`, `src/types/admin.ts`, `src/lib/api/endpoints/admin-api.ts`, and `tests/**`.
- Zero modifications to existing F0–F6 customer components.

### Explicitly Forbidden
- Modification of backend code.
- Modification of existing frozen F0–F6 source code.
- Ingestion of admin APIs from customer routes.
- Client-side balance calculation or simulation.
- Committing without approval.

### Freeze Gate
- Successful execution of TypeScript check, ESLint, unit test suite, and E2E test suite.
