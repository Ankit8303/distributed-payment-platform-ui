# PHASE F4 — FRONTEND-ONLY SCOPE CORRECTION & ASSESSMENT
**Distributed Payment & Ledger Platform UI**

**Document**: `docs/phase-reports/PHASE-F4-FRONTEND-ASSESSMENT.md`  
**Phase**: F4 — Transactions + Ledger + Payment Trace  
**Date**: 2026-09-26  
**Final Status**: **F4_FRONTEND_BLOCKED_BY_FROZEN_BACKEND**  

---

## 1. Executive Summary

This assessment re-evaluates **Phase F4 (Transactions + Ledger + Payment Trace)** strictly from the **frontend perspective** under the non-negotiable invariant that the **Spring Boot backend is completely frozen**.

- **No backend changes** will be implemented.
- **The F4-B backend contract proposal is rejected and unapproved** for implementation.
- **No speculative or mock financial data** will be fabricated by the frontend.
- **No administrative endpoints** (`/api/v1/admin/**`) will be called by customer sessions.

A rigorous audit of the existing customer-accessible backend APIs against the frozen frontend implementation confirms that:
1. Everything supported by the customer backend (`GET /api/v1/accounts/{id}` and `GET /api/v1/payments/{id}`) is already fully implemented, tested, and frozen in Phases F2 and F3.
2. The remaining requested capabilities of Phase F4 (customer transaction lists, account statements, double-entry ledger views, and payment-to-ledger settlement tracing) have **zero customer-facing API support** in the frozen backend.
3. Inventing synthetic financial records or calling admin endpoints would directly violate core platform invariants (financial authority, zero-trust frontend, and RBAC security boundaries).

**Conclusion**: There is no legitimate frontend implementation work remaining for Phase F4. Phase F4 is officially marked **`F4_FRONTEND_BLOCKED_BY_FROZEN_BACKEND`**, and the project should transition to the next customer-accessible frontend phase (e.g. Phase F5 — Refunds, Reversals & Payouts).

---

## 2. What Phase F4 Requested

Phase F4 originally requested:
1. **Customer Transaction Views**: A paginated, searchable, and filterable history of past transactions for the authenticated customer.
2. **Transaction Detail**: Authoritative presentation of transaction metadata, amounts, counterparty, status, and timestamps.
3. **Ledger Transaction Detail**: Presentation of the double-entry accounting transaction envelope.
4. **Ledger Entries**: Detailed presentation of individual double-entry ledger legs (debits and credits).
5. **Payment $\rightarrow$ Ledger Traceability**: An end-to-end audit trace linking a commercial payment to its posted double-entry ledger transaction.
6. **Financial Presentation**: Integer minor-unit formatting, debit/credit polarity indicators, and ISO currency display.
7. **Status & Reference Presentation**: Status badges, idempotency keys, and correlation identifiers.
8. **UI State Model**: Loading skeletons, empty states, RFC 7807 error presentations, and network recovery.

---

## 3. What the Existing Backend Actually Provides for Customers

An exhaustive forensic audit of all 18 controllers in the frozen backend (`payment-ledger-platform-complete-agent-kit`) reveals exactly **three** customer-accessible endpoints:

| Endpoint | HTTP Method | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/accounts/{id}` | `GET` | `CUSTOMER`, `MERCHANT`, `ADMIN` | Returns single `AccountResponse` (ID, number, type, currency, status, createdAt). **Contains no transaction list or ledger entries.** |
| `/api/v1/payments` | `POST` | `CUSTOMER` | Creates a payment using integer minor units, idempotency key, and payment method token. |
| `/api/v1/payments/{id}` | `GET` | `CUSTOMER`, `MERCHANT`, `ADMIN` | Returns single `PaymentResponse` for caller's owned account. **Contains no `ledgerTransactionId` and no transaction list.** |

### Missing Customer Endpoints (Contract Facts):
- `GET /api/v1/transactions` $\rightarrow$ **NOT AVAILABLE IN CURRENT BACKEND**
- `GET /api/v1/accounts/{id}/transactions` $\rightarrow$ **NOT AVAILABLE IN CURRENT BACKEND**
- `GET /api/v1/accounts/{id}/entries` $\rightarrow$ **NOT AVAILABLE FOR CUSTOMERS** (Admin only)
- `GET /api/v1/payments` $\rightarrow$ **NOT AVAILABLE FOR CUSTOMERS** (Admin only)
- `GET /api/v1/ledger/**` $\rightarrow$ **NOT AVAILABLE FOR CUSTOMERS** (Admin only)
- `GET /api/v1/payments/{id}/trace` $\rightarrow$ **NOT AVAILABLE IN CURRENT BACKEND**

---

## 4. What Phase F3 Already Implemented

Every legitimate customer capability supported by the backend was already implemented, audited, tested, and frozen in Phase F3:

1. **Payment Detail Presentation** (`src/app/(customer)/payments/[id]/page.tsx`):
   - Consumes `GET /api/v1/payments/{id}` via TanStack Query hook `usePayment(id)`.
   - Full authoritative display: Payment ID, Payer Account ID, Payee Account ID, Amount, Fee, Currency, Status, Provider Reference, Idempotency Key, Correlation ID, and Creation Timestamp.
   - One-click clipboard copy actions with visual confirmation for all financial UUIDs.
2. **Payment Lifecycle State Machine** (`src/features/payments/components/payment-status-badge.tsx`):
   - Maps and renders all 9 backend payment statuses (`CREATED`, `AUTHORIZING`, `AUTHORIZED`, `CAPTURING`, `SETTLED`, `DECLINED`, `FAILED`, `EXPIRED`, `PENDING_RECONCILIATION`).
   - Accessible WCAG 2.1 AA `role="status"` and explicit `aria-label` text.
3. **Ambiguous Outcome Recovery & Reconciliation** (`src/features/payments/components/payment-reconciliation-banner.tsx`):
   - Polite live region alert with bounded exponential backoff polling coordinator.
   - Wired `AbortController` cancellation on component unmount.
   - Manual "Check Status" fallback for degraded network conditions.
4. **Financial Formatting** (`src/features/payments/utils/money-parser.ts`):
   - Deterministic integer minor-unit parsing and formatting without floating-point math.
5. **RFC 7807 Error Presentation** (`src/features/payments/components/payment-error-state.tsx`):
   - Assertive live alerts for 400, 401, 403, 404, 409, 422, 429, and 500 error responses with correlation tracking.
6. **Layered Verification**:
   - 122/122 Vitest unit and integration tests passing.
   - 12/12 Playwright E2E tests passing.
   - Clean Next.js production build conforming to budget (< 145 kB First Load JS).

---

## 5. What Cannot Be Implemented in Frontend

The following cannot be implemented without violating platform invariants:

1. **Customer Transaction History / Activity Table**:
   - The backend does not expose an endpoint to retrieve past transactions or payments for a customer or account.
   - Creating a client-side transaction table would require either inventing fake mock records or calling unauthorized admin endpoints. Both are strictly prohibited.
2. **Customer Double-Entry Ledger View**:
   - Ledger transactions and double-entry journals are not exposed to customer accounts.
   - Customers cannot view raw balancing legs (`DEBIT == CREDIT`).
3. **Customer Payment-to-Ledger Settlement Trace**:
   - `PaymentResponse` does not include `ledgerTransactionId`.
   - There is no customer endpoint that correlates a payment to its ledger transaction.

---

## 6. Why Implementing These Requires Backend Changes

- **PostgreSQL is the Sole Financial Source of Truth**: The frontend cannot store, calculate, or synthesize financial records. Financial history must originate from the authoritative database via an authentic backend REST endpoint.
- **Zero Speculative APIs**: The platform rules strictly forbid inventing speculative frontend routes or mock handlers that do not correspond to frozen Spring Boot endpoints.
- **Data Model Discrepancy**: To provide a customer transaction history, the backend would need to expose an account-scoped query (such as `GET /api/v1/accounts/{accountId}/transactions`). Since the backend is frozen and cannot be modified, this capability cannot be provided.

---

## 7. Why Admin Endpoints Cannot Be Used

The backend repository contains administrative controllers:
- `AdminLedgerController` (`/api/v1/admin/ledger/**`)
- `AdminPaymentController` (`/api/v1/admin/payments/**`)
- `AdminInvestigationController` (`/api/v1/admin/investigations/**`)

These controllers cannot be utilized by the customer frontend for two decisive reasons:
1. **Spring Security RBAC (`403 Forbidden`)**:
   Every admin endpoint is guarded by `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`. When a customer (`ROLE_CUSTOMER`) calls any admin path, Spring Security immediately throws `AccessDeniedException`, resulting in an RFC 7807 HTTP 403 Forbidden response.
2. **Data Isolation & Multi-Tenant Leakage**:
   Administrative ledger endpoints expose raw double-entry accounting records, including internal platform fee account IDs (`SYSTEM_FEE_ACCOUNT`), transit accounts, Kafka offsets, and internal reconciliation cases. Exposing internal platform accounts to retail customers violates financial security and data confidentiality standards.

---

## 8. Legitimate Frontend Work Remaining in F4

An audit of the frontend codebase reveals that:
- Navigation between existing views (Customer Sidebar $\rightarrow$ Accounts, Payments) is already wired in Phase F2 and F3.
- Authoritative payment detail presentation is already fully delivered in `src/app/(customer)/payments/[id]/page.tsx`.
- Formatting, accessibility, error states, and responsive cards are already hardened and frozen in F3.

**There is zero remaining legitimate frontend work for Phase F4.** Creating synthetic components, placeholder tables, or empty pages with no backend backing would introduce dead code and violate architectural integrity.

---

## 9. Next Steps: Move to Phase F5

Because Phase F4 has no remaining legitimate frontend scope under the frozen backend, the frontend platform should **not linger on Phase F4**.

### Next Phase: **Phase F5 — Refunds, Reversals & Payouts**
The backend already provides existing, customer- and merchant-accessible endpoints for subsequent lifecycle phases:
- `POST /api/v1/payments/{paymentId}/refunds` (`RefundController.java:28`)
- `GET /api/v1/refunds/{refundId}` (`RefundController.java:42`)
- `POST /api/v1/payouts` (`PayoutController.java:26`)
- `GET /api/v1/payouts/{payoutId}` (`PayoutController.java:39`)

Proceeding to Phase F5 allows the frontend to implement verified, existing backend capabilities without encountering architectural dead ends.

---

## 10. Final Status

# **F4_FRONTEND_BLOCKED_BY_FROZEN_BACKEND**

- **Summary**: All frontend capabilities supported by existing customer payment and account APIs (`GET /api/v1/accounts/{id}`, `POST /api/v1/payments`, `GET /api/v1/payments/{id}`) are already fully completed, tested, and frozen in Phases F2 and F3. Customer transaction history, ledger views, and payment trace cannot be implemented because the corresponding customer APIs do not exist in the frozen Spring Boot backend. Zero source code or backend files were modified. The project should transition directly to the next frontend capability phase.
