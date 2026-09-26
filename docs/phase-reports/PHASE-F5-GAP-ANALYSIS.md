# PHASE F5 GAP ANALYSIS — REFUNDS, REVERSALS & PAYOUTS
**Distributed Payment & Ledger Platform UI**

**Document**: `docs/phase-reports/PHASE-F5-GAP-ANALYSIS.md`  
**Phase**: F5 — Refunds, Reversals & Payouts  
**Date**: 2026-09-26  
**Backend Reference**: `payment-ledger-platform-complete-agent-kit` (Frozen Spring Boot Core)  
**Final Status**: **F5_PARTIALLY_BLOCKED**  

---

## 1. Backend Contract Inventory

A comprehensive forensic audit of `payment-ledger-platform-complete-agent-kit` was conducted across all controllers, entities, repositories, and exception handlers related to refunds, reversals, and payouts.

### Summary Table of Endpoints

| Endpoint | HTTP Method | Allowed Roles / Ownership | Controller & Line | Customer / Merchant Usable? |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/payments/{paymentId}/refunds` | `POST` | Authenticated; caller must own payer or payee account | `RefundController.java:28` | ✅ **Yes** (Payee or Payer owner) |
| `/api/v1/refunds/{refundId}` | `GET` | Authenticated; caller must own payer or payee account | `RefundController.java:42` | ✅ **Yes** (Payee or Payer owner) |
| `/api/v1/payments/{paymentId}/reversal` | `POST` | Authenticated; caller must own payer or payee account | `RefundController.java:52` | ✅ **Yes** (Payee or Payer owner) |
| `/api/v1/reversals/{reversalId}` | `GET` | Authenticated; caller must own payer or payee account | `RefundController.java:65` | ✅ **Yes** (Payee or Payer owner) |
| `/api/v1/payouts` | `POST` | Authenticated; caller must own origin account | `PayoutController.java:26` | ✅ **Yes** (Account owner) |
| `/api/v1/payouts/{payoutId}` | `GET` | Authenticated; caller must own origin account | `PayoutController.java:39` | ✅ **Yes** (Account owner) |
| `/api/v1/admin/refunds` | `GET` | `ADMIN`, `SYSTEM` | `AdminRefundController.java:29` | ❌ **Admin Only** |
| `/api/v1/admin/refunds/{refundId}` | `GET` | `ADMIN`, `SYSTEM` | `AdminRefundController.java:49` | ❌ **Admin Only** |
| `/api/v1/admin/payouts` | `GET` | `ADMIN`, `SYSTEM` | `AdminPayoutController.java:29` | ❌ **Admin Only** |
| `/api/v1/admin/payouts/{payoutId}` | `GET` | `ADMIN`, `SYSTEM` | `AdminPayoutController.java:49` | ❌ **Admin Only** |

---

## 2. Refund Analysis

### 2.1 Initiation & Access
- **Who can create refunds?**: Any authenticated user who owns either the **payee account** (merchant/receiver) OR the **payer account** (customer/sender).
- **Backend Verification** (`RefundService.java:152-154`):
  ```java
  AccountEntity payerAccount = accountRepository.findById(payment.getPayerAccountId()).orElseThrow();
  AccountEntity payeeAccount = accountRepository.findById(payment.getPayeeAccountId()).orElseThrow();

  if (!actorId.equals(payeeAccount.getOwnerId()) && !actorId.equals(payerAccount.getOwnerId())) {
      throw new RefundDomainException(ErrorCode.UNAUTHORIZED_FINANCIAL_OPERATION, "Unauthorized to refund this payment");
  }
  ```
- **Unauthorized Request Behavior**: Returns HTTP `403 Forbidden` with RFC 7807 problem details (`ErrorCode.UNAUTHORIZED_FINANCIAL_OPERATION`).

### 2.2 Preconditions & Eligibility
- **Payment Status**: Payment must be in **`SETTLED`** status (`RefundService.java:156`). If in any other state, returns HTTP `400 Bad Request` (`ErrorCode.REFUND_NOT_ELIGIBLE`).
- **No Existing Reversal**: If the payment has already been reversed, returns HTTP `400 Bad Request` (`ErrorCode.REFUND_NOT_ELIGIBLE`).
- **Merchant Account Status**: Merchant account must be in `ACTIVE` status (`LedgerService.java:252`). If frozen, returns HTTP `422 Unprocessable Entity` (`ErrorCode.ACCOUNT_FROZEN`).
- **Merchant Ledger Balance**: Merchant must have sufficient authoritative ledger balance for the refund amount (`LedgerService.java:259`). If insufficient, returns HTTP `422 Unprocessable Entity` (`ErrorCode.INSUFFICIENT_FUNDS`).

### 2.3 Amount Rules & Partial vs. Full Refunds
- **Positive Integer Minor Units**: Request requires `@NotNull` and `@Min(1)` on `amountMinor`.
- **Authoritative Balance Calculation**: `sumSettledAndProcessingRefundsForPayment(paymentId)` is computed under a pessimistic lock on the payment record (`RefundService.java:232-237`).
- **Remaining Refundable Constraint**:
  $$\text{amountMinor} \le \text{originalAmountMinor} - \sum \text{Settled/Processing Refunds}$$
  If exceeded, returns HTTP `422 Unprocessable Entity` (`ErrorCode.REFUND_AMOUNT_EXCEEDS_PAYMENT`).
- **Multiple Partial Refunds**: A payment can be partially refunded multiple times until the remaining refundable amount reaches 0.

### 2.4 Idempotency & Concurrency
- **Mandatory Header**: `Idempotency-Key` (required string header).
- **Hash Computation**: SHA-256 of `amountMinor|reason`.
- **Duplicate Behavior**:
  - `IDEMPOTENCY_CONCURRENT_REQUEST` (HTTP 409): Concurrent request in-flight.
  - `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH` (HTTP 409): Key reused with different payload.
  - `COMPLETED`: Returns cached HTTP 201/202 response body from `idempotency_records`.

### 2.5 Lifecycle & State Transitions
- **Status Enum (`RefundStatus.java`)**: `REQUESTED`, `PROCESSING`, `SETTLED`, `FAILED`, `PENDING_RECONCILIATION`.
- **Gateway Integration**: Calls external `PaymentProvider.refund()`.
  - Gateway Timeout: Transitions to `PENDING_RECONCILIATION` and returns **HTTP 202 Accepted**.
  - Gateway Declined: Transitions to `FAILED` and throws HTTP `503 Service Unavailable`.
  - Gateway Success: Atomically settles compensating double-entry ledger transaction (`DEBIT` Merchant, `CREDIT` Customer), transitions to `SETTLED`, and returns **HTTP 201 Created**.
- **Compensating Ledger Reference**: Settle updates `compensating_ledger_transaction_id` (`UUID`) on `RefundEntity`, which is directly returned in `RefundResponse`.

---

## 3. Reversal Analysis

### 3.1 Endpoint & Protocol
- **Endpoint**: `POST /api/v1/payments/{paymentId}/reversal`
- **Retrieval**: `GET /api/v1/reversals/{reversalId}`
- **Controller**: `RefundController.java:52`, `RefundController.java:65`
- **Authentication**: Bearer JWT.
- **Allowed Roles**: Authenticated caller must own `payerAccountId` or `payeeAccountId` (`RefundService.java:304`).

### 3.2 Financial & Accounting Semantics
- **Full Reversal Only**: `ReversalCreateRequest` accepts only a mandatory `reason` (`@NotBlank`, max 500 chars). It does **not** accept an amount; it strictly reverses the **full original payment amount** (`reversal.amountMinor = payment.amountMinor`).
- **Exclusion with Refunds**: If any refund exists on the payment (`alreadyRefunded > 0`), reversal is rejected with HTTP `400 Bad Request` (`ErrorCode.REFUND_NOT_ELIGIBLE`: "Cannot reverse payment with existing refunds").
- **Exclusion with Previous Reversal**: If already reversed, returns HTTP `409 Conflict` (`ErrorCode.REVERSAL_ALREADY_EXISTS`).
- **Internal Ledger Compensating Transaction**: Unlike refunds, reversals do **not** invoke external payment provider APIs. They post an internal double-entry compensating ledger adjustment (`SYSTEM_ADJUSTMENT`) directly in PostgreSQL:
  - `DEBIT` payee (merchant) for `payment.amountMinor`
  - `CREDIT` payer (customer) for `payment.amountMinor`
- **Reversal Statuses (`ReversalStatus.java`)**: `COMPLETED`, `FAILED`, `PENDING_RECONCILIATION`.
- **Response**: `ReversalResponse` containing `reversalId`, `paymentId`, `amountMinor`, `currency`, `status`, `compensatingLedgerTransactionId`, and `createdAt`.

---

## 4. Payout Analysis

### 4.1 Initiation & Access
- **Endpoint**: `POST /api/v1/payouts`
- **Retrieval**: `GET /api/v1/payouts/{payoutId}`
- **Controller**: `PayoutController.java:26`, `PayoutController.java:39`
- **Authentication**: Bearer JWT.
- **Ownership**: Caller must be the verified owner of `accountId` (`originAccount.getOwnerId().equals(actorId)`).
- **Unauthorized Behavior**: Throws HTTP `403 Forbidden` (`ErrorCode.UNAUTHORIZED_FINANCIAL_OPERATION`).

### 4.2 Financial Semantics & Balance Constraints
- **Request Body (`PayoutCreateRequest`)**:
  - `accountId` (`UUID`, non-null)
  - `amountMinor` (`Long`, non-null, strictly $\ge 1$)
  - `currency` (`String`, non-null, 3-letter ISO code)
- **Account Eligibility**:
  - Account must be `ACTIVE`. If frozen, returns HTTP `422 Unprocessable Entity` (`ErrorCode.ACCOUNT_FROZEN`).
  - Account currency must match requested currency.
- **Authoritative Ledger Balance Check**:
  `PayoutService` calculates authoritative ledger balance:
  ```java
  long authoritativeBalance = ledgerEntryRepository.calculateLedgerBalanceMinor(accountId);
  if (authoritativeBalance < amountMinor) {
      throw new PayoutDomainException(ErrorCode.PAYOUT_INSUFFICIENT_FUNDS, "Insufficient ledger balance for payout");
  }
  ```
  If balance is insufficient, returns HTTP `422 Unprocessable Entity` (`ErrorCode.PAYOUT_INSUFFICIENT_FUNDS`).

### 4.3 Payout Execution & Ledger Posting
- **Provider Dispatch**: Calls `PaymentProvider.payout()`.
  - Gateway Timeout: Marks `PENDING_RECONCILIATION` and returns **HTTP 202 Accepted**.
  - Gateway Declined: Marks `FAILED` and returns HTTP `503 Service Unavailable`.
  - Gateway Success: Posts double-entry transaction:
    - `DEBIT` Origin Account for `amountMinor`
    - `CREDIT` Internal Settlement Account (`INTERNAL_SETTLEMENT`) for `amountMinor`
    - Returns **HTTP 201 Created**.
- **Payout Statuses (`PayoutStatus.java`)**: `REQUESTED`, `PROCESSING`, `SETTLED`, `FAILED`, `PENDING_RECONCILIATION`.

---

## 5. Authorization Matrix

| Capability | Endpoint | CUSTOMER | MERCHANT | ADMIN | Frontend Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Create Refund** | `POST /api/v1/payments/{id}/refunds` | ✅ Yes (as Payer) | ✅ Yes (as Payee) | ✅ Yes | **SUPPORTED** |
| **Get Refund Detail** | `GET /api/v1/refunds/{id}` | ✅ Yes (if party) | ✅ Yes (if party) | ✅ Yes | **SUPPORTED** |
| **List Refunds** | `GET /api/v1/admin/refunds` | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ Yes | 🚫 **BLOCKED (Admin Only)** |
| **Create Reversal** | `POST /api/v1/payments/{id}/reversal` | ✅ Yes (as Payer) | ✅ Yes (as Payee) | ✅ Yes | **SUPPORTED** |
| **Get Reversal Detail** | `GET /api/v1/reversals/{id}` | ✅ Yes (if party) | ✅ Yes (if party) | ✅ Yes | **SUPPORTED** |
| **Create Payout** | `POST /api/v1/payouts` | ✅ Yes (owned acc) | ✅ Yes (owned acc) | ✅ Yes | **SUPPORTED** |
| **Get Payout Detail** | `GET /api/v1/payouts/{id}` | ✅ Yes (owned acc) | ✅ Yes (owned acc) | ✅ Yes | **SUPPORTED** |
| **List Payouts** | `GET /api/v1/admin/payouts` | ❌ 403 Forbidden | ❌ 403 Forbidden | ✅ Yes | 🚫 **BLOCKED (Admin Only)** |

---

## 6. Financial Invariants

1. **PostgreSQL Authoritative Source of Truth**: The frontend never computes available balance, remaining refundable amount, or fee deductions.
2. **Integer Minor Units**: All monetary values are integer `amountMinor` (cents). No floating-point math is used.
3. **Compensating Transactions**:
   - Refunds and reversals do not mutate or delete existing payments or ledger entries. They post brand-new compensating transactions.
   - Payouts credit the internal platform settlement account and debit the user account.
4. **Authoritative Status**: Status values (`REQUESTED`, `PROCESSING`, `SETTLED`, `FAILED`, `PENDING_RECONCILIATION`) are rendered strictly from backend DTOs.
5. **No Speculative Financial Truth**: If a refund or payout returns `202 ACCEPTED` (`PENDING_RECONCILIATION`), the UI must display reconciliation state, not success or failure.

---

## 7. Idempotency Model

For all three mutations (`POST /payments/{id}/refunds`, `POST /payments/{id}/reversal`, `POST /payouts`):
1. **Header Requirement**: `Idempotency-Key` (UUIDv4) is mandatory.
2. **Client Generation**: A fresh RFC 4122 v4 UUID is generated when the user opens the confirmation dialog or mounts the form.
3. **Double-Click Protection**: Form submit buttons are locked during in-flight requests.
4. **Payload Freezing**: The idempotency key is tightly bound to the payload hash. Modifying amount or reason regenerates a new key.
5. **Ambiguous Network Recovery**: If a request times out, retrying with the *identical* idempotency key retrieves the persisted result without re-executing the transfer.

---

## 8. Current Frontend Reuse Opportunities

The frontend baseline from Phases F0–F3 provides high-value reusable modules:

| Existing Asset | Location | Phase F5 Reuse |
| :--- | :--- | :--- |
| **API Client** | `src/lib/api/client.ts` | Bearer token attachment, correlation ID propagation, RFC 7807 error parsing. |
| **Money Formatter** | `src/features/payments/utils/money-parser.ts` | Deterministic `formatMoney(amountMinor, currency)` and integer string parsing. |
| **Error Alert Component** | `src/features/payments/components/payment-error-state.tsx` | RFC 7807 problem details presentation with correlation tracking. |
| **Reconciliation Banner** | `src/features/payments/components/payment-reconciliation-banner.tsx` | Reusable for `PENDING_RECONCILIATION` in refunds and payouts. |
| **Confirmation Dialog** | `src/features/payments/components/payment-confirm-dialog.tsx` | Accessible WCAG 2.1 AA focus-trapped confirmation modal. |
| **Auth Context** | `src/features/auth/auth-context.tsx` | In-memory token management, user role, and session state. |

---

## 9. Legitimate F5 Frontend Scope

The frontend can legitimately implement the following end-to-end capabilities using existing backend APIs:

1. **Payment Refund Workflow**:
   - On the Authoritative Payment Detail page (`/payments/[id]`), if `status === "SETTLED"`, render an "Issue Refund" action button.
   - Accessible **Refund Confirmation Dialog** (`amountMinor` input, reason text, double-click protection).
   - TanStack Query mutation hook `useCreateRefund(paymentId)` calling `POST /api/v1/payments/{paymentId}/refunds`.
   - Dedicated Authoritative **Refund Detail Page** (`/refunds/[id]`) calling `GET /api/v1/refunds/{id}`.
   - Status badge and reconciliation banner if refund enters `PENDING_RECONCILIATION`.
2. **Payment Reversal Workflow**:
   - On `/payments/[id]`, if `status === "SETTLED"` and no refunds exist, render a "Request Reversal" button.
   - Dedicated confirmation modal requiring mandatory reason.
   - TanStack Query mutation hook `useCreateReversal(paymentId)` calling `POST /api/v1/payments/{paymentId}/reversal`.
   - Dedicated Authoritative **Reversal Detail Page** (`/reversals/[id]`) calling `GET /api/v1/reversals/{id}`.
3. **Account Payout Workflow**:
   - On the Customer Account view (`/accounts/[id]`), render a "Request Payout" action button.
   - Dedicated **Payout Creation Route** (`/accounts/[id]/payouts/new` or `/payouts/new`).
   - Accessible **Payout Form** (`amountMinor`, currency matching account, confirmation dialog).
   - TanStack Query mutation hook `useCreatePayout()` calling `POST /api/v1/payouts`.
   - Dedicated Authoritative **Payout Detail Page** (`/payouts/[id]`) calling `GET /api/v1/payouts/{id}`.

---

## 10. Blocked Capabilities

The following capabilities are **BLOCKED** by the frozen backend:

| Blocked Capability | Reason for Blocker | Consequence for Frontend |
| :--- | :--- | :--- |
| **Refund History / Listing** | `GET /api/v1/admin/refunds` is guarded by `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`. | No `/refunds` list table can be implemented for customers. Refunds are accessible only via direct link or after creation. |
| **Payout History / Listing** | `GET /api/v1/admin/payouts` is guarded by `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`. | No `/payouts` list table can be implemented for customers. Payouts are accessible only via direct link or after creation. |
| **Remaining Refundable Pre-Fetch** | There is no dedicated endpoint `GET /payments/{id}/remaining-refundable`. | Frontend cannot pre-display the exact remaining balance before submission; it relies on backend validation (`REFUND_AMOUNT_EXCEEDS_PAYMENT` 422). |

---

## 11. Route Proposal

| Proposed Route | Purpose | Backend Endpoint Used | Role |
| :--- | :--- | :--- | :--- |
| `/payments/[id]` *(Enhanced)* | Added "Request Refund" and "Request Reversal" actions on settled payments | `GET /api/v1/payments/{id}` | Customer / Merchant |
| `/refunds/[id]` | Authoritative refund receipt and reconciliation status | `GET /api/v1/refunds/{refundId}` | Customer / Merchant |
| `/reversals/[id]` | Authoritative reversal receipt | `GET /api/v1/reversals/{reversalId}` | Customer / Merchant |
| `/payouts/new` | Payout request form for owned account | `POST /api/v1/payouts` | Account Owner |
| `/payouts/[id]` | Authoritative payout receipt and reconciliation status | `GET /api/v1/payouts/{payoutId}` | Account Owner |

*Excluded*: No `/refunds` or `/payouts` list index routes.

---

## 12. Component Proposal

1. **`RefundModal` / `RefundForm`**:
   - Props: `payment: PaymentResponse`, `isOpen: boolean`, `onClose: () => void`.
   - Handles integer minor amount, reason, idempotency key generation.
2. **`ReversalModal`**:
   - Props: `payment: PaymentResponse`, `isOpen: boolean`, `onClose: () => void`.
   - Requires mandatory reason; explains full payment reversal semantics.
3. **`RefundStatusCard`**:
   - Displays `refundId`, `paymentId`, `amountMinor`, `status`, `compensatingLedgerTransactionId`, and `createdAt`.
4. **`PayoutForm`**:
   - Selects origin account, inputs payout amount in minor units, validates currency match.
5. **`PayoutStatusCard`**:
   - Displays `payoutId`, `accountId`, `amountMinor`, `status`, `providerReference`, `compensatingLedgerTransactionId`.

---

## 13. Testing Requirements

- **Unit Tests**:
  - Zod schema validation for `RefundCreateRequest`, `ReversalCreateRequest`, and `PayoutCreateRequest`.
  - Amount validation: strictly positive, integer minor units.
  - Idempotency key generation and state transition mapping.
- **Component Tests**:
  - `RefundModal`: Form input, validation errors, submission double-click disable.
  - `PayoutForm`: Account selection, currency matching, amount validation.
  - `RefundStatusCard` & `PayoutStatusCard`: Authoritative display of IDs, statuses, and copy buttons.
- **Integration Tests**:
  - `refunds-api.test.ts`: Verify headers (`Idempotency-Key`, `X-Correlation-ID`), 201 Created, 202 Accepted, and 400/403/422 errors.
  - `payouts-api.test.ts`: Verify 201 Created, 202 Accepted, 422 `PAYOUT_INSUFFICIENT_FUNDS`, and 422 `ACCOUNT_FROZEN`.
- **Accessibility Tests**:
  - Focus trap in refund and reversal dialogs.
  - Semantic alerts (`role="status"`, `role="alert"`).
  - Screen reader announcements for currency amounts.
- **E2E Playwright Tests**:
  - End-to-end payment creation $\rightarrow$ settlement $\rightarrow$ partial refund creation $\rightarrow$ view refund receipt.
  - End-to-end payout creation $\rightarrow$ view payout receipt.

---

## 14. Accessibility (WCAG 2.1 AA)

- **Focus Trap**: All modals (`RefundModal`, `ReversalModal`) trap keyboard focus (`Tab` / `Shift+Tab`) and close on `Escape`.
- **Polite & Assertive Live Regions**:
  - Form validation errors announce via `role="alert"`.
  - Polling updates on `PENDING_RECONCILIATION` announce via polite live region (`aria-live="polite"`).
- **High Contrast Focus Rings**: Focusable elements have visible focus rings (`focus-visible:ring-2 focus-visible:ring-primary-500`).

---

## 15. Security

1. **Anti-IDOR Enforcement**: The backend verifies caller account ownership on both write and read. An unauthorized caller receives HTTP 403 or 404.
2. **Zero In-Memory Credential Leakage**: No financial account secrets or credentials are held in browser storage.
3. **Idempotency Protection**: Every mutation generates an isolated UUIDv4 key to eliminate duplicate debit or credit risks.
4. **Output Sanitization**: All user reasons and provider references are rendered via standard React JSX text nodes to avoid XSS vulnerabilities.

---

## 16. Performance

- **Bundle Budget**: All new modals and detail pages must adhere to the Phase F0 performance budget (< 145 kB First Load JS).
- **Query Caching**: Settled refunds, reversals, and payouts are immutable; `staleTime` can be set to $\infty$ or `5 minutes`.
- **Polling Strategy**: If a refund or payout is in `PENDING_RECONCILIATION`, bounded exponential backoff polling (max 5 attempts, interval $1.5 \times$, cap 10s) with `AbortController` cancellation on unmount.

---

## 17. Documentation Requirements

- `docs/phases/PHASE-F5.md`: Phase scope and delivery roadmap.
- `docs/refunds/refund-architecture.md`: Financial flow of refunds, reversals, and payouts.
- `docs/phase-reports/PHASE-F5-IMPLEMENTATION-PLAN.md`: Detailed file-by-file implementation plan.

---

## 18. Strict Scope Exclusions

- ❌ **No Admin Refund or Payout Listing**: `/api/v1/admin/**` endpoints will not be called.
- ❌ **No Customer List Views**: No speculative `/refunds` or `/payouts` index tables.
- ❌ **No Balance Derivation**: The frontend will not compute or display synthetic account balances.
- ❌ **No Backend Modifications**: Spring Boot code remains completely frozen.

---

## 19. Final Readiness Decision

### FINAL STATUS:

# **F5_PARTIALLY_BLOCKED**

### Decision Rationale:
1. **Creation and Detail Workflows are READY**:
   - `POST /api/v1/payments/{paymentId}/refunds` and `GET /api/v1/refunds/{refundId}` are fully supported and customer-accessible.
   - `POST /api/v1/payments/{paymentId}/reversal` and `GET /api/v1/reversals/{reversalId}` are fully supported and customer-accessible.
   - `POST /api/v1/payouts` and `GET /api/v1/payouts/{payoutId}` are fully supported and customer-accessible.
2. **Listing / History Workflows are BLOCKED**:
   - Listing past refunds or payouts is not supported by any customer-facing endpoint; existing list endpoints reside strictly under `/api/v1/admin/**` and reject non-admin users with HTTP 403 Forbidden.
3. **Verdict**:
   Phase F5 can proceed to **Implementation Planning** for the single-resource creation and detail flows (from the payment detail and account dashboard routes), with list/index routes strictly excluded from scope.
