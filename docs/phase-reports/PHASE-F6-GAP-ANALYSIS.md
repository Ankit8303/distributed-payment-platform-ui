# Phase F6 Gap Analysis Report: Reconciliation Architecture & Scope Assessment

**Document ID**: `PHASE-F6-GAP-ANALYSIS`  
**Target Milestone**: Phase F6 — Reconciliation  
**Platform**: Distributed Payment & Ledger Platform UI  
**Target Repositories**:
- Frontend: `distributed-payment-platform-ui-complete-agent-kit` (Commit: `685ec6e`, Tag: `frontend-f5-ready`)
- Backend: `payment-ledger-platform-complete-agent-kit` (**FROZEN**)  
**Status**: `F6_PARTIALLY_BLOCKED` / `F6_FRONTEND_BLOCKED_BY_FROZEN_BACKEND`

---

## 1. Executive Summary

A comprehensive architectural and forensic source code investigation was conducted on the frozen Spring Boot backend (`payment-ledger-platform-complete-agent-kit`) to determine whether any legitimate customer- or merchant-accessible reconciliation endpoints, data transfer objects, or workflows exist to support Phase F6 ("Reconciliation").

### Key Findings:

1. **Reconciliation Case Infrastructure is Strictly Admin-Only**:
   The backend implements a full asynchronous reconciliation engine comprising `AdminReconciliationController`, `ReconciliationService`, `ReconciliationWorker`, and PostgreSQL tables `reconciliation_cases` and `reconciliation_attempts`. However, every single endpoint under `/api/v1/admin/reconciliation/**` is explicitly guarded by:
   ```java
   @PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")
   ```
   Authenticated customer (`ROLE_CUSTOMER`) and merchant (`ROLE_MERCHANT`) tokens attempting to invoke these endpoints receive **HTTP 403 Forbidden** via Spring Security's `EnableMethodSecurity` boundary.

2. **Zero Dedicated Customer/Merchant Reconciliation APIs Exist**:
   There are **no customer- or merchant-scoped reconciliation endpoints** anywhere in the backend:
   - `GET /api/v1/reconciliation/**` — **DOES NOT EXIST**
   - `GET /api/v1/customers/me/reconciliation/**` — **DOES NOT EXIST**
   - `POST /api/v1/reconciliation/**` — **DOES NOT EXIST**
   - `GET /api/v1/merchants/reconciliation/**` — **DOES NOT EXIST**

3. **Reconciliation Visibility is Entity-Embedded and Fully Delivered in F3 & F5**:
   The backend's design embeds reconciliation status directly within the authoritative state machines of primary financial entities (`PaymentEntity`, `RefundEntity`, `ReversalEntity`, and `PayoutEntity`) as the state `PENDING_RECONCILIATION`.
   - Payment status `PENDING_RECONCILIATION` via `GET /api/v1/payments/{paymentId}` was **fully implemented in Phase F3**.
   - Refund status `PENDING_RECONCILIATION` via `GET /api/v1/refunds/{refundId}` was **fully implemented in Phase F5**.
   - Reversal status `PENDING_RECONCILIATION` via `GET /api/v1/reversals/{reversalId}` was **fully implemented in Phase F5**.
   - Payout status `PENDING_RECONCILIATION` via `GET /api/v1/payouts/{payoutId}` was **fully implemented in Phase F5**.

4. **Zero Implementable New Scope for Customer Frontend**:
   Because:
   - All dedicated reconciliation cases, list queries, audit triggers, and manual retry actions are strictly admin-only,
   - The frozen backend forbids admin endpoint consumption from customer UI,
   - The frontend is strictly prohibited from inventing speculative customer APIs or modifying the backend,
   - All customer-accessible reconciliation visibility (`PENDING_RECONCILIATION` banners, status badges, live bounded polling coordinators, timeout fallbacks) is already 100% implemented, verified, and frozen in F3 and F5,

   **there are zero new customer-facing frontend screens, components, or API calls to implement for Phase F6**.

---

## 2. Verified Backend Reconciliation Contracts

An exhaustive audit of the backend repository (`com.paymentledger.reconciliation.*` and related packages) identified seven distinct reconciliation endpoints, all located in `AdminReconciliationController.java`.

### 2.1 Backend Controller Inventory

```
Controller: com.paymentledger.reconciliation.api.AdminReconciliationController
Base Path:  /api/v1/admin/reconciliation
Class Security: Method-level @PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')") on all endpoints
```

| HTTP Method | Exact Endpoint Path | Authorization Rule | Request DTO / Params | Response DTO | Error Codes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/reconciliation/cases` | `hasAnyRole('ADMIN', 'SYSTEM')` | `@RequestParam(required = false) ReconciliationStatus status`, `Pageable pageable` | `Page<ReconciliationCaseEntity>` | `401 Unauthorized`<br>`403 Forbidden` |
| `GET` | `/api/v1/admin/reconciliation/cases/{id}` | `hasAnyRole('ADMIN', 'SYSTEM')` | `@PathVariable UUID id` | `CaseDetailResponse` (unwrapped `caseDetails` + `attempts`) | `401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |
| `POST` | `/api/v1/admin/reconciliation/cases/{id}/trigger` | `hasAnyRole('ADMIN', 'SYSTEM')` | `@PathVariable UUID id` | `ReconciliationCaseEntity` | `401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |
| `POST` | `/api/v1/admin/reconciliation/cases/{id}/retry` | `hasAnyRole('ADMIN', 'SYSTEM')` | `@PathVariable UUID id`, `Authentication`, `HttpServletRequest` | `CaseDetailResponse` | `401 Unauthorized`<br>`403 Forbidden`<br>`404 Not Found` |
| `POST` | `/api/v1/admin/reconciliation/run` | `hasAnyRole('ADMIN', 'SYSTEM')` | None | `Integer` (processed case count) | `401 Unauthorized`<br>`403 Forbidden` |
| `POST` | `/api/v1/admin/reconciliation/audit/ledger` | `hasAnyRole('ADMIN', 'SYSTEM')` | None | `LedgerConsistencyAuditor.AuditReport` | `401 Unauthorized`<br>`403 Forbidden` |
| `POST` | `/api/v1/admin/reconciliation/audit/balances` | `hasAnyRole('ADMIN', 'SYSTEM')` | None | `BalanceConsistencyAuditor.BalanceReport` | `401 Unauthorized`<br>`403 Forbidden` |

### 2.2 Backend Domain Entities & Enums

#### 1. `ReconciliationCaseEntity` (`reconciliation_cases` table)
- `id` (`UUID`, PK)
- `operationType` (`ReconciliationOperationType`: `PAYMENT`, `REFUND`, `PAYOUT`, `REVERSAL`)
- `operationId` (`UUID`, non-null)
- `providerReference` (`String`, nullable)
- `localStatus` (`String`, non-null, e.g. `"PENDING_RECONCILIATION"`)
- `providerStatus` (`String`, nullable)
- `discrepancyType` (`DiscrepancyType`, nullable)
- `reconciliationStatus` (`ReconciliationStatus`: `OPEN`, `IN_PROGRESS`, `RETRY_REQUIRED`, `RESOLVED`, `MANUAL_REVIEW`)
- `resolution` (`String`, nullable, max 500)
- `attemptCount` (`int`, default 0)
- `maxAttempts` (`int`, default 5)
- `nextAttemptAt` (`Instant`, non-null)
- `leaseWorkerId` (`String`, nullable, max 100)
- `leaseExpiresAt` (`Instant`, nullable)
- `lastError` (`String`, nullable, max 1000)
- `createdAt` (`Instant`, non-null, immutable)
- `updatedAt` (`Instant`, non-null)
- `resolvedAt` (`Instant`, nullable)
- `correlationId` (`String`, nullable, max 100)

#### 2. `ReconciliationAttemptEntity` (`reconciliation_attempts` table)
- `id` (`UUID`, PK)
- `reconciliationCaseId` (`UUID`, non-null)
- `attemptNumber` (`int`, non-null)
- `workerId` (`String`, non-null, max 100)
- `providerStatus` (`String`, nullable, max 50)
- `discrepancyType` (`DiscrepancyType`, nullable)
- `actionTaken` (`String`, non-null, max 100)
- `status` (`String`, non-null, max 50)
- `errorMessage` (`String`, nullable, max 1000)
- `createdAt` (`Instant`, non-null)

#### 3. `DiscrepancyType` Enum
- `PROVIDER_SUCCESS_LOCAL_PENDING`
- `PROVIDER_FAILURE_LOCAL_PENDING`
- `PROVIDER_UNKNOWN`
- `PROVIDER_MISMATCH`
- `LOCAL_FINANCIAL_STATE_MISSING`
- `LEDGER_STATE_MISMATCH`
- `DUPLICATE_OPERATION`
- `ALREADY_RESOLVED`
- `NON_RECONCILABLE`

#### 4. `ReconciliationStatus` Enum
- `OPEN` — Candidate enrolled; awaiting worker claim
- `IN_PROGRESS` — Claimed by worker under lease (`leaseExpiresAt`)
- `RETRY_REQUIRED` — Ambiguous outcome encountered; exponential backoff scheduled
- `RESOLVED` — Provider confirmed terminal state; local ledger settled/failed
- `MANUAL_REVIEW` — Maximum attempts (5) exhausted or catastrophic mismatch detected

### 2.3 Automated Candidate Ingestion & Execution Engine
`ReconciliationService.scanAndEnrolCandidates()` automatically queries financial repositories for:
1. `paymentRepository.findByStatus(PaymentStatus.PENDING_RECONCILIATION)`
2. `refundRepository.findByStatus(RefundStatus.PENDING_RECONCILIATION)`
3. `payoutRepository.findByStatus(PayoutStatus.PENDING_RECONCILIATION)`

When candidates are discovered, an `OPEN` case is created with optimistic lease locks.
`ReconciliationWorker` periodically runs every 5,000ms (configured via `app.reconciliation.poll-interval-ms`):
- External queries to `PaymentProvider.queryOperationStatus()` occur **outside** database transactions to avoid PostgreSQL connection starvation.
- Upon receiving `SUCCESS`:
  - `Payment`: `ledgerService.settlePaymentWithLedger()`, status $\rightarrow$ `SETTLED`.
  - `Refund`: `ledgerService.settleRefundWithLedger()`, status $\rightarrow$ `SETTLED`.
  - `Payout`: `ledgerService.settlePayoutWithLedger()`, status $\rightarrow$ `SETTLED`.
- Upon receiving `FAILED`:
  - Entity marked `FAILED`, failure event emitted to Kafka outbox.
- Upon receiving `UNKNOWN`:
  - Exponential backoff ($2^{\text{attemptCount}}$ seconds, capped at 60s). Escalates to `MANUAL_REVIEW` after 5 failed attempts.

---

## 3. Endpoint Authorization Matrix

Every reconciliation-related endpoint and candidate customer endpoint is classified below:

| Endpoint Path | HTTP Method | Target Audience | Allowed Roles | Enforcement Mechanism | Classification |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/admin/reconciliation/cases` | `GET` | Platform Administrators | `ROLE_ADMIN`, `ROLE_SYSTEM` | Method Security `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/reconciliation/cases/{id}` | `GET` | Platform Administrators | `ROLE_ADMIN`, `ROLE_SYSTEM` | Method Security `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/reconciliation/cases/{id}/trigger` | `POST` | Platform Administrators | `ROLE_ADMIN`, `ROLE_SYSTEM` | Method Security `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/reconciliation/cases/{id}/retry` | `POST` | Platform Administrators | `ROLE_ADMIN`, `ROLE_SYSTEM` | Method Security `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/reconciliation/run` | `POST` | Platform Administrators / Cron | `ROLE_ADMIN`, `ROLE_SYSTEM` | Method Security `@PreAuthorize` | **Admin-only / System-only** |
| `/api/v1/admin/reconciliation/audit/ledger` | `POST` | Platform Administrators | `ROLE_ADMIN`, `ROLE_SYSTEM` | Method Security `@PreAuthorize` | **Admin-only** |
| `/api/v1/admin/reconciliation/audit/balances` | `POST` | Platform Administrators | `ROLE_ADMIN`, `ROLE_SYSTEM` | Method Security `@PreAuthorize` | **Admin-only** |
| `/api/v1/reconciliation/**` | Any | Customers / Merchants | N/A | Spring MVC Route Mapping | **Nonexistent** |
| `/api/v1/customers/me/reconciliation/**` | Any | Customers | N/A | Spring MVC Route Mapping | **Nonexistent** |
| `/api/v1/payments/{paymentId}` | `GET` | Customer / Merchant / Admin | Authenticated; Owner of Payer/Payee Account | Owner-matching in `PaymentService` | **Customer-accessible** (F3 Frozen) |
| `/api/v1/refunds/{refundId}` | `GET` | Customer / Merchant / Admin | Authenticated; Owner of Payer/Payee Account | Owner-matching in `RefundService` | **Customer-accessible** (F5 Frozen) |
| `/api/v1/reversals/{reversalId}` | `GET` | Customer / Merchant / Admin | Authenticated; Owner of Payer/Payee Account | Owner-matching in `RefundService` | **Customer-accessible** (F5 Frozen) |
| `/api/v1/payouts/{payoutId}` | `GET` | Merchant / Account Owner | Authenticated; Owner of Origin Account | Owner-matching in `PayoutService` | **Merchant-accessible** (F5 Frozen) |

### Strict Boundary Enforcement:
- If a customer token (`ROLE_CUSTOMER`) is used to request `/api/v1/admin/reconciliation/**`, Spring Security's `AuthorizationFilter` immediately intercepts the request and produces:
  ```json
  {
    "type": "about:blank",
    "title": "Forbidden",
    "status": 403,
    "detail": "Access Denied",
    "instance": "/api/v1/admin/reconciliation/cases"
  }
  ```
- **Architectural Rule**: The customer UI **MUST NEVER** request `/api/v1/admin/*`. Doing so introduces runtime security violations, exposes internal tenant architecture, and breaks multi-tenant segregation.

---

## 4. Existing Frontend Reuse

The frontend codebase (`distributed-payment-platform-ui-complete-agent-kit`) already possesses complete, mature, and verified infrastructure to handle all legitimate reconciliation states exposed by the backend:

| Subsystem | Existing Implementation File | Reconciliation Capability Handled | Verification State |
| :--- | :--- | :--- | :--- |
| **Payment Status Presentation** | `src/features/payments/components/payment-status-card.tsx` | Renders dedicated amber banner with `role="status"`, `aria-live="polite"`, explaining gateway delay and asynchronous reconciliation for `PENDING_RECONCILIATION`. | **FROZEN** (F3) |
| **Payment Polling Coordinator** | `src/features/payments/hooks/use-payment.ts` | Bounded polling with interval timer (2000ms), max attempts (15), automatic termination on terminal state (`SETTLED`, `FAILED`), and timeout banner with manual "Check Status". | **FROZEN** (F3) |
| **Refund Status Presentation** | `src/features/refunds/components/refund-status-card.tsx` | Full status mapping, amber badge, and reconciliation guidance card for `RefundStatus === "PENDING_RECONCILIATION"`. | **FROZEN** (F5) |
| **Refund Polling Coordinator** | `src/features/refunds/hooks/use-refund.ts` | Polling coordinator actively tracking `PENDING_RECONCILIATION` until settled/failed. | **FROZEN** (F5) |
| **Reversal Status Presentation** | `src/features/refunds/components/reversal-status-card.tsx` | Reconciliation notification card and badge for `ReversalStatus === "PENDING_RECONCILIATION"`. | **FROZEN** (F5) |
| **Reversal Polling Coordinator** | `src/features/refunds/hooks/use-reversal.ts` | Polling coordinator tracking reversal status transitions. | **FROZEN** (F5) |
| **Payout Status Presentation** | `src/features/payouts/components/payout-status-card.tsx` | Amber badge and reconciliation warning card for `PayoutStatus === "PENDING_RECONCILIATION"`. | **FROZEN** (F5) |
| **Payout Polling Coordinator** | `src/features/payouts/hooks/use-payout.ts` | Polling coordinator actively checking settlement from provider. | **FROZEN** (F5) |
| **Type Definitions** | `src/types/payment.ts`<br>`src/types/refund.ts`<br>`src/types/reversal.ts`<br>`src/types/payout.ts`<br>`src/types/financial.ts` | Exhaustive union types containing `"PENDING_RECONCILIATION"`, status helpers `isReconciliationPending()`, `getPaymentStatusConfig()`, `getRefundStatusConfig()`. | **FROZEN** (F3, F5) |
| **HTTP Client & Interceptors** | `src/lib/api-client.ts` | Preserves `X-Correlation-ID`, attaches Bearer JWT, handles RFC 7807 problem details, parses `Retry-After`. | **FROZEN** (F1) |

---

## 5. Supported F6 Capabilities

The following capabilities are mathematically and architecturally **SUPPORTED** by the backend contracts:

| Capability | Backend Endpoint | Status | Evidence & Implementation Location |
| :--- | :--- | :--- | :--- |
| **Reconciliation Status on Payment** | `GET /api/v1/payments/{paymentId}` | **SUPPORTED** | Returns `PaymentResponse` with `status: "PENDING_RECONCILIATION"`. Supported by `PaymentController.java:62`. Fully implemented in frontend at `src/features/payments/components/payment-status-card.tsx`. |
| **Reconciliation Status on Refund** | `GET /api/v1/refunds/{refundId}` | **SUPPORTED** | Returns `RefundResponse` with `status: "PENDING_RECONCILIATION"`. Supported by `RefundController.java:42`. Fully implemented in frontend at `src/features/refunds/components/refund-status-card.tsx`. |
| **Reconciliation Status on Reversal** | `GET /api/v1/reversals/{reversalId}` | **SUPPORTED** | Returns `ReversalResponse` with `status: "PENDING_RECONCILIATION"`. Supported by `RefundController.java:65`. Fully implemented in frontend at `src/features/refunds/components/reversal-status-card.tsx`. |
| **Reconciliation Status on Payout** | `GET /api/v1/payouts/{payoutId}` | **SUPPORTED** | Returns `PayoutResponse` with `status: "PENDING_RECONCILIATION"`. Supported by `PayoutController.java:39`. Fully implemented in frontend at `src/features/payouts/components/payout-status-card.tsx`. |

All four supported capabilities **have already been completely built, tested, and frozen** in Phases F3 and F5.

---

## 6. Blocked F6 Capabilities

The following reconciliation capabilities are **BLOCKED BY FROZEN BACKEND**:

| Capability | Target Endpoint Evaluated | Status | Detailed Architectural Reason |
| :--- | :--- | :--- | :--- |
| **Customer Reconciliation Case List** | `GET /api/v1/reconciliation/cases` (Nonexistent)<br>`GET /api/v1/admin/reconciliation/cases` (Admin Only) | **BLOCKED_BY_FROZEN_BACKEND** | No customer-facing endpoint exists. Admin endpoint returns HTTP `403 Forbidden` to customer JWTs. The entity contains internal infrastructure fields (`leaseWorkerId`, `leaseExpiresAt`, `discrepancyType`) that cannot be exposed to customers. |
| **Customer Reconciliation Case Detail** | `GET /api/v1/reconciliation/cases/{id}` (Nonexistent)<br>`GET /api/v1/admin/reconciliation/cases/{id}` (Admin Only) | **BLOCKED_BY_FROZEN_BACKEND** | No customer-facing endpoint exists. Admin endpoint returns HTTP `403 Forbidden`. Attempt history contains worker IDs and raw gateway error diagnostics. |
| **Customer Reconciliation Actions (Trigger/Retry)** | `POST /api/v1/admin/reconciliation/cases/{id}/retry`<br>`POST /api/v1/admin/reconciliation/cases/{id}/trigger` | **BLOCKED_BY_FROZEN_BACKEND** | No customer-facing action endpoint exists. Customer manual retries are forbidden; the reconciliation worker operates autonomously under exponential backoff leases. |
| **Merchant Reconciliation Workflows** | `GET /api/v1/merchants/reconciliation/**` (Nonexistent) | **BLOCKED_BY_FROZEN_BACKEND** | No merchant-accessible reconciliation batch, case list, or discrepancy reporting API exists in the backend. |
| **Admin Reconciliation Workflows in Customer UI** | `/api/v1/admin/reconciliation/**` | **BLOCKED_FOR_CUSTOMER_UI** | Prohibited by project constraints. Customer application must not access admin routes or display admin capabilities. |
| **Ledger & Balance Consistency Audit Triggers** | `POST /api/v1/admin/reconciliation/audit/ledger`<br>`POST /api/v1/admin/reconciliation/audit/balances` | **BLOCKED_BY_FROZEN_BACKEND** | Admin/System only (`@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`). Evaluates system-wide double-entry ledger balance invariants. |

---

## 7. Financial Invariant Analysis

In a distributed financial platform, reconciliation governs the convergence of asynchronous local state with external banking/payment provider reality.

### Invariant Rules:
1. **Double-Entry Atomicity**:
   - When an operation is in `PENDING_RECONCILIATION`, **no speculative ledger entries are posted**.
   - Settlement occurs exclusively in `ReconciliationService.resolvePayment()` or `resolveRefund()` under `@Transactional` using `LedgerService.settlePaymentWithLedger()`.
   - The UI must never display speculative balances or assume settlement before `status === "SETTLED"`.
2. **Terminal State Immutability**:
   - Once a financial operation reaches `SETTLED` or `FAILED`, it is terminal.
   - `ReconciliationCaseEntity.isClaimable()` strictly rejects claims for cases in `RESOLVED` or `MANUAL_REVIEW`.
   - The frontend's polling coordinators correctly halt all polling when a terminal state is reached.
3. **Compensating Action Separation**:
   - Reversals never invoke external provider gateways (`resolveReversal` verifies existing local state).
   - Refunds and Payouts verify authoritative merchant/origin ledger balances prior to settlement.
   - The UI does not synthesize financial balance adjustments during reconciliation.

---

## 8. Security / IDOR Analysis

### Insecure Direct Object Reference (IDOR) Protection:
- The backend's `reconciliation_cases` table has **no tenant isolation field** (`customer_id` or `account_id` does not exist on `ReconciliationCaseEntity`). Cases are keyed solely by `operation_id` (`UUID`) and `operation_type`.
- If `GET /api/v1/admin/reconciliation/cases` were improperly exposed to customers:
  - Any customer could view all reconciliation incidents across the entire platform.
  - A malicious actor could inspect internal provider references, internal worker IDs, and gateway error dumps.
- **Spring Security Protection**:
  The backend correctly restricts the entire controller with `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`.
- In customer endpoints (`/api/v1/payments/{id}`, `/api/v1/refunds/{id}`, `/api/v1/payouts/{id}`), IDOR protection is strictly enforced by asserting that `actorId` equals the owner of the involved accounts.

---

## 9. State Machine Analysis

The backend operates two tightly coupled state machines:

```
[ Financial Entity State Machine ]
  CREATED / REQUESTED ──> PROCESSING ──> [ Gateway Timeout / Ambiguity ] ──> PENDING_RECONCILIATION
                                                                                    │
                                   ┌────────────────────────────────────────────────┴──────────────────┐
                                   ▼                                                                   ▼
                                SETTLED                                                             FAILED
                      (via Reconciliation Worker)                                         (via Reconciliation Worker)

[ Reconciliation Case State Machine ]
  Candidate Ingested ──> OPEN ──> [ Worker Claim ] ──> IN_PROGRESS
                                                            │
                         ┌──────────────────────────────────┼─────────────────────────────────┐
                         ▼                                  ▼                                 ▼
                     RESOLVED                        RETRY_REQUIRED                     MANUAL_REVIEW
           (Provider SUCCESS/FAILED)              (Provider UNKNOWN)               (Max Attempts 5 Exceeded
                                                  [Exp. Backoff Leases]             or Local State Missing)
```

The customer UI only observes the **Financial Entity State Machine** (`PENDING_RECONCILIATION` $\rightarrow$ `SETTLED` or `FAILED`). The internal case state machine (`OPEN`, `IN_PROGRESS`, `RETRY_REQUIRED`, `MANUAL_REVIEW`) is invisible to the customer by design.

---

## 10. Polling / Timeout Analysis

The frontend currently uses bounded polling coordinators:

| Domain | Polling Interval | Max Attempts | Max Elapsed Time | Abort Handling | Timeout Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Payments** (`use-payment.ts`) | 2,000ms | 15 attempts | 30 seconds | `AbortController.abort()` on unmount or manual cancellation | Halts polling, displays "Polling timed out" banner, enables manual "Check Status" button |
| **Refunds** (`use-refund.ts`) | 2,500ms | 12 attempts | 30 seconds | `AbortController` cleanup | Halts polling, displays timeout notification, retains receipt |
| **Reversals** (`use-reversal.ts`) | 2,000ms | 10 attempts | 20 seconds | `AbortController` cleanup | Halts polling, displays timeout notification |
| **Payouts** (`use-payout.ts`) | 3,000ms | 10 attempts | 30 seconds | `AbortController` cleanup | Halts polling, displays timeout notification |

Because the backend `ReconciliationWorker` runs periodically on a 5-second interval and applies exponential backoff for unknown provider responses (2s, 4s, 8s, 16s, 32s, 60s), reconciliation may outlast a 30-second client polling window. The frontend's timeout banner correctly instructs the customer:
> *"The transaction is being reconciled asynchronously with the payment network. You may safely navigate away; status will update upon completion."*

---

## 11. Accessibility Considerations

All existing reconciliation UI elements strictly comply with WCAG 2.1 AA standards:
1. **Screen Reader Notification**:
   - Reconciliation status banners use `role="status"` and `aria-live="polite"`.
   - Avoids `aria-live="assertive"` to prevent interrupting screen reader announcements during background polling updates.
2. **Color Contrast**:
   - Status badges use curated Tailwind tokens: `bg-amber-50`, `text-amber-800`, `border-amber-200`, achieving a contrast ratio $> 4.5:1$ against white backgrounds.
3. **Focus Management**:
   - Manual "Check Status" retry buttons are fully keyboard navigable (`Tab` order preserved, distinct `:focus-visible` rings).

---

## 12. Performance Considerations

1. **Zero Client Polling Storms**:
   - Polling requests are single-flight (subsequent intervals await resolution of in-flight requests).
   - If the user switches tabs or unmounts the component, `AbortController` immediately terminates pending HTTP connections.
2. **Stateless Backend Protection**:
   - Polling queries hit indexed primary key lookups (`paymentRepository.findById(id)`).
   - Customers cannot trigger backend reconciliation cycles or external provider queries directly; external provider queries are throttled through the background `ReconciliationWorker`.

---

## 13. Testing Implications

Existing tests in the frontend repository validate all supported reconciliation behaviors:
- **Unit & Component Tests** (`src/features/payments`, `src/features/refunds`, `src/features/payouts`):
  - 131 tests passing (`pnpm test:unit`).
  - Verifies rendering of `PENDING_RECONCILIATION` badges, explanation text, and polling timeouts.
- **End-to-End Tests** (`tests/e2e/*.spec.ts`):
  - 14 tests passing (`pnpm test:e2e`).
  - Validates gateway timeout simulation transitioning to `PENDING_RECONCILIATION` and polling cessation on terminal status.

No new tests are required because no new frontend features can be built.

---

## 14. Strict Scope Exclusions

The following areas are strictly **EXCLUDED** from Phase F6:

1. **Admin Reconciliation UI**: Calling `/api/v1/admin/reconciliation/**` from customer UI is strictly forbidden.
2. **Synthetic / Mock Reconciliation Cases**: No client-side mock data, fake case lists, or simulated worker logs.
3. **Speculative Backend Endpoints**: No hypothetical customer endpoints (e.g. `/api/v1/customer/reconciliation`).
4. **Backend Source Code Modifications**: The backend repository remains 100% frozen.
5. **Modification of Frozen Modules**: F0, F1, F2, F3, F4, and F5 frontend source files remain untouched.

---

## 15. Final F6 Status

### Determination:

From an architectural and implementation assessment:

1. **Platform Capability Perspective**:
   $$\mathbf{F6\_PARTIALLY\_BLOCKED}$$
   *Rationale*: The distributed platform supports observing reconciliation state on primary financial entities (`Payment`, `Refund`, `Reversal`, `Payout`) through customer-accessible endpoints. However, dedicated reconciliation case listing, attempt history inspection, manual retry execution, and consistency auditing are strictly restricted to administrative roles.

2. **Frontend Scope Implementation Perspective**:
   $$\mathbf{F6\_FRONTEND\_BLOCKED\_BY\_FROZEN\_BACKEND}$$
   *Rationale*: All four supported customer reconciliation capabilities (`PENDING_RECONCILIATION` handling on Payments, Refunds, Reversals, and Payouts) **were already 100% implemented, verified, and frozen in Phases F3 and F5**. There are **zero new legitimate customer-facing reconciliation APIs** on the frozen backend. Consequently, no new frontend code can or should be implemented for Phase F6 without modifying the backend or violating security boundaries by calling admin endpoints.

### Recommended Action:
Do **not** implement any code or modify any source files. Mark Phase F6 as **`F6_PARTIALLY_BLOCKED`** (platform view) / **`F6_FRONTEND_BLOCKED_BY_FROZEN_BACKEND`** (new customer UI view), preserving the integrity of the frozen codebase.
