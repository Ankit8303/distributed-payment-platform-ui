# Phase F4 Gap Analysis — Transactions, Ledger & Payment Trace

**Phase**: F4 — Transactions + Ledger + Payment Trace  
**Date**: 2026-09-26  
**Author**: Antigravity Engineering Agent  
**Status**: BLOCKED  

---

## 1. Executive Summary

Phase F4 addresses **Customer Transaction Views, Transaction Detail, Ledger Transaction Detail, Ledger Entries, and Payment-to-Ledger Traceability** for the Distributed Payment & Ledger Platform UI.

Phases F0 (Foundation & Tooling), F1 (Authentication & Session Security), F2 (Customer Dashboard & Account Presentation), and F3 (Payment Creation, Idempotency & Lifecycle) are **COMPLETED AND FROZEN**. All existing code in F0–F3 remains uncompromised and untouched.

A forensic source code inspection of the actual frozen Spring Boot backend (`payment-ledger-platform-complete-agent-kit`) was conducted across all controllers, domain entities, JPA repositories, Flyway migrations, and Spring Security configurations. 

### Critical Findings:
1. **Zero Customer Transaction Endpoints**: The backend provides **no customer-facing endpoint** to list transactions (`GET /api/v1/transactions` or `GET /api/v1/accounts/{id}/transactions` **DO NOT EXIST**).
2. **Ledger APIs Are Strictly Admin-Only**: All ledger transaction queries (`/api/v1/admin/ledger/transactions`) and account ledger entry queries (`/api/v1/admin/ledger/accounts/{accountId}/entries`) are implemented exclusively in `com.paymentledger.admin.api.AdminLedgerController` and are guarded by `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`. An authenticated customer (`ROLE_CUSTOMER`) calling these endpoints receives **HTTP 403 Forbidden**.
3. **No Customer Payment-to-Ledger Trace**: `PaymentResponse` (`com.paymentledger.payment.api.dto.PaymentResponse`) contains **no `ledgerTransactionId`** field. The `payments` table has no foreign key to `ledger_transactions`. The only component in the backend that performs the forensic trace (`payment` → `ledger_transaction` → `ledger_entries`) is `AdminInvestigationController` (`GET /api/v1/admin/investigations/payments/{paymentId}`), which is also guarded by `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`.
4. **Scope Constraint**: Phase F4 explicitly prohibits admin operations, admin investigations, speculative APIs, and backend modifications.

Because the customer-facing endpoints required for Phase F4 **do not exist** in the frozen backend, and the frontend is strictly forbidden from creating speculative endpoints or calling unauthorized admin APIs, Phase F4 implementation for customer transactions, ledger views, and payment trace is **BLOCKED**.

---

## 2. Current Frontend State

The frontend baseline is fully frozen across Phases F0, F1, F2, and F3:

| Phase | Delivered Scope | Frozen Verification Status |
| :--- | :--- | :--- |
| **F0** | Next.js 14 App Router, TypeScript strict mode, Tailwind CSS design system, TanStack Query v5, Zod schemas, Vitest + Playwright harnesses, PowerShell verification scripts. | **FROZEN** (Zero errors) |
| **F1** | Stateless JWT authentication (`/login`, `/register`), in-memory access token isolation, tab-scoped refresh storage with single-flight mutex, `ProtectedRoute`, automatic Bearer attachment. | **FROZEN** (Zero errors) |
| **F2** | Customer dashboard shell (`/dashboard`), navigation (`CustomerNav`, `CustomerSidebar`), authoritative account retrieval (`GET /api/v1/accounts/{id}`), `AccountCard`, `AccountStatusBadge`. | **FROZEN** (Zero errors) |
| **F3** | Payment creation form (`/payments/new`), idempotency key management, RFC 7807 error presentation, bounded polling coordinator with `AbortController`, authoritative payment detail (`/payments/[id]`), `PENDING_RECONCILIATION` handling. | **READY_FOR_FREEZE** (Vitest 122/122, E2E 12/12) |

**Integrity Guarantee**: Phase F4 gap analysis introduces zero code modifications to any existing F0, F1, F2, or F3 modules.

---

## 3. Backend Contract Inventory

An exhaustive inspection of `com.paymentledger.*` in `payment-ledger-platform-complete-agent-kit` reveals the following complete controller inventory:

| Controller Class | Base Path | Allowed Roles | Method & Route | Customer Accessible? |
| :--- | :--- | :--- | :--- | :--- |
| `AccountController` | `/api/v1/accounts` | `CUSTOMER`, `MERCHANT`, `ADMIN` | `GET /{id}` | ✅ **Yes** (Owner only) |
| `PaymentController` | `/api/v1/payments` | `CUSTOMER` | `POST /` | ✅ **Yes** (Customer only) |
| `PaymentController` | `/api/v1/payments` | `CUSTOMER`, `MERCHANT`, `ADMIN` | `GET /{id}` | ✅ **Yes** (Payer/Payee owner) |
| `PayoutController` | `/api/v1/payouts` | `MERCHANT` | `POST /`, `GET /{payoutId}` | ⚠️ Merchant only |
| `RefundController` | `/api/v1` | `MERCHANT`, `ADMIN` | `POST /payments/{id}/refunds` | ⚠️ Merchant/Admin only |
| `RefundController` | `/api/v1` | `MERCHANT`, `CUSTOMER`, `ADMIN` | `GET /refunds/{refundId}` | ✅ **Yes** (Owner only) |
| `RefundController` | `/api/v1` | `ADMIN` | `POST /payments/{id}/reversal` | ❌ Admin only |
| `RefundController` | `/api/v1` | `ADMIN` | `GET /reversals/{reversalId}` | ❌ Admin only |
| `AuthController` | `/api/v1/auth` | Anonymous | `POST /register`, `login`, `refresh` | ✅ Public |
| `WebhookSubscriptionController` | `/api/v1/webhooks/subscriptions` | `MERCHANT`, `ADMIN` | `POST`, `GET`, `DELETE` | ❌ Merchant/Admin only |
| `AdminLedgerController` | `/api/v1/admin/ledger` | `ADMIN`, `SYSTEM` | `GET /transactions` | ❌ **ADMIN ONLY** |
| `AdminLedgerController` | `/api/v1/admin/ledger` | `ADMIN`, `SYSTEM` | `GET /transactions/{transactionId}` | ❌ **ADMIN ONLY** |
| `AdminLedgerController` | `/api/v1/admin/ledger` | `ADMIN`, `SYSTEM` | `GET /accounts/{accountId}/entries` | ❌ **ADMIN ONLY** |
| `AdminPaymentController` | `/api/v1/admin/payments` | `ADMIN`, `SYSTEM` | `GET /`, `GET /{paymentId}` | ❌ **ADMIN ONLY** |
| `AdminInvestigationController` | `/api/v1/admin/investigations` | `ADMIN`, `SYSTEM` | `GET /payments/{paymentId}` | ❌ **ADMIN ONLY** |
| `AdminAccountController` | `/api/v1/admin/accounts` | `ADMIN`, `SYSTEM` | `GET /`, `GET /{id}`, `balance-summary` | ❌ **ADMIN ONLY** |
| `AdminAdjustmentController` | `/api/v1/admin/adjustments` | `ADMIN`, `SYSTEM` | `POST /`, `GET /{id}` | ❌ **ADMIN ONLY** |
| `AdminAuditController` | `/api/v1/admin/audit-logs` | `ADMIN`, `SYSTEM` | `GET /`, `GET /{id}` | ❌ **ADMIN ONLY** |
| `AdminDashboardController` | `/api/v1/admin/dashboard` | `ADMIN`, `SYSTEM` | `GET /summary` | ❌ **ADMIN ONLY** |
| `AdminNotificationController` | `/api/v1/admin/notifications` | `ADMIN`, `SYSTEM` | `GET`, `POST /retry`, `run-worker` | ❌ **ADMIN ONLY** |
| `AdminReconciliationController`| `/api/v1/admin/reconciliation` | `ADMIN`, `SYSTEM` | `GET /cases`, `POST /run`, audit | ❌ **ADMIN ONLY** |
| `AdminUserController` | `/api/v1/admin/users` | `ADMIN`, `SYSTEM` | `GET /`, `GET /{userId}` | ❌ **ADMIN ONLY** |

---

## 4. Transaction API Analysis

### 4.1 Customer Transaction History Endpoint: `NOT AVAILABLE IN CURRENT BACKEND`
- **Candidate Paths Checked**:
  - `GET /api/v1/transactions` — **DOES NOT EXIST**
  - `GET /api/v1/accounts/{accountId}/transactions` — **DOES NOT EXIST**
  - `GET /api/v1/payments` (Customer) — **DOES NOT EXIST**
- **Evidence**: `AccountController.java` contains exactly one method: `getAccount(@PathVariable UUID id)`. There are no child mapping methods for `/transactions` or `/history`.
- **Admin Alternative**: `AdminPaymentController.java:28` exposes `GET /api/v1/admin/payments` (paginated, filtering by `status`, `payerAccountId`, `payeeAccountId`), but is guarded by `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`.
- **Verdict**: A customer has **no endpoint** to list their past transactions.

### 4.2 Single Transaction / Payment Retrieval: `GET /api/v1/payments/{id}`
- **Source**: `PaymentController.java:62`
- **HTTP Method**: `GET`
- **Exact Path**: `/api/v1/payments/{id}`
- **Authentication**: `Authorization: Bearer <JWT>`
- **Authorization Behavior**: `PaymentService.java:181-197` checks whether the authenticated caller is the owner of the `payerAccountId` or the `payeeAccountId`. If not (and not `ADMIN`/`SYSTEM`), it throws `PaymentNotFoundException("Payment not found or access denied")` to avoid IDOR enumeration.
- **Request Parameters**: Path variable `id` (UUID format).
- **Request Body**: None.
- **Response Schema (`PaymentResponse.java`)**:
  ```json
  {
    "paymentId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "payerAccountId": "11111111-1111-1111-1111-111111111111",
    "payeeAccountId": "22222222-2222-2222-2222-222222222222",
    "amountMinor": 5000,
    "feeAmountMinor": 150,
    "currency": "USD",
    "status": "SETTLED",
    "providerReference": "ch_mock_1234567890",
    "correlationId": "c4b3a987-e21b-4f90-8b65-685b882312a0",
    "createdAt": "2026-09-26T12:00:00Z",
    "message": null,
    "pollUrl": null
  }
  ```
- **Nullable / Optional Fields**:
  - `providerReference`: Nullable (null during `CREATED` / `AUTHORIZING`).
  - `feeAmountMinor`: 0 if no platform fee applied.
  - `correlationId`: Nullable if not provided during creation.
  - `message`: Present only when `status == "PENDING_RECONCILIATION"`.
  - `pollUrl`: Present only when `status == "PENDING_RECONCILIATION"`.
- **Enum Values (`PaymentStatus.java`)**:
  `CREATED`, `AUTHORIZING`, `AUTHORIZED`, `CAPTURING`, `SETTLED`, `DECLINED`, `FAILED`, `EXPIRED`, `PENDING_RECONCILIATION`.
- **Error Responses**:
  - `401 UNAUTHORIZED`: Invalid/expired token.
  - `404 NOT_FOUND`: Resource does not exist or caller is not owner (anti-IDOR).
  - `500 INTERNAL_SERVER_ERROR`: Unhandled backend failure.

---

## 5. Ledger API Analysis

All ledger endpoints in the backend exist **only** in `AdminLedgerController.java` (`com.paymentledger.admin.api.AdminLedgerController`).

### 5.1 List Ledger Transactions: `GET /api/v1/admin/ledger/transactions`
- **Customer Facing**: ❌ **NO (ADMIN ONLY)**
- **HTTP Method**: `GET`
- **Path**: `/api/v1/admin/ledger/transactions`
- **Security**: `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`
- **Customer Behavior**: Returns HTTP `403 Forbidden` (`ErrorCode.FORBIDDEN`).
- **Request Parameters**:
  - `sourceReferenceType` (optional string, e.g., `"PAYMENT"`, `"PAYOUT"`, `"REFUND"`)
  - `page` (int, 0-indexed, default 0)
  - `size` (int, default 20, clamped max 100 via `PageUtils.clamp`)
  - `sort` (Spring Data sort string, e.g. `createdAt,desc`)
- **Response Schema (`Page<LedgerTransactionAdminResponse>`)**:
  ```json
  {
    "content": [
      {
        "id": "uuid",
        "sourceReferenceId": "uuid",
        "sourceReferenceType": "PAYMENT",
        "description": "Settlement of payment ...",
        "createdAt": "iso8601",
        "entries": [
          {
            "id": "uuid",
            "accountId": "uuid",
            "direction": "DEBIT",
            "amountMinor": 5000,
            "currency": "USD",
            "sequenceNumber": 1,
            "createdAt": "iso8601"
          },
          {
            "id": "uuid",
            "accountId": "uuid",
            "direction": "CREDIT",
            "amountMinor": 4850,
            "currency": "USD",
            "sequenceNumber": 1,
            "createdAt": "iso8601"
          },
          {
            "id": "uuid",
            "accountId": "uuid",
            "direction": "CREDIT",
            "amountMinor": 150,
            "currency": "USD",
            "sequenceNumber": 1,
            "createdAt": "iso8601"
          }
        ]
      }
    ],
    "totalElements": 1,
    "totalPages": 1,
    "size": 20,
    "number": 0
  }
  ```

### 5.2 Single Ledger Transaction: `GET /api/v1/admin/ledger/transactions/{transactionId}`
- **Customer Facing**: ❌ **NO (ADMIN ONLY)**
- **Security**: `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`
- **Customer Behavior**: Returns HTTP `403 Forbidden`.
- **Response Schema**: Single `LedgerTransactionAdminResponse`.

### 5.3 Account Ledger Entries: `GET /api/v1/admin/ledger/accounts/{accountId}/entries`
- **Customer Facing**: ❌ **NO (ADMIN ONLY)**
- **Security**: `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`
- **Customer Behavior**: Returns HTTP `403 Forbidden`.
- **Response Schema**: `Page<LedgerEntryAdminResponse>` (paginated list of double-entry rows for the account).

### 5.4 Customer Ledger APIs: `NOT AVAILABLE IN CURRENT BACKEND`
- Neither `GET /api/v1/accounts/{id}/entries` nor `GET /api/v1/ledger/...` exists for customers.

---

## 6. Payment-to-Ledger Trace Analysis

### 6.1 Backend Forensic Trace Implementation
In the backend repository, a payment relates to a ledger transaction as follows:
- When a payment is settled (`LedgerService.java:108-165`), `LedgerService` instantiates a `LedgerTransactionEntity`:
  ```java
  new LedgerTransactionEntity(
      LedgerTransactionType.PAYMENT,
      payment.getId(),      // sourceReferenceId
      "PAYMENT",            // sourceReferenceType
      payment.getCurrency(),
      "Settlement of payment " + payment.getId()
  );
  ```
- Entries are posted to debited payer, credited payee, and fee account, upholding `debitSum == creditSum`.
- **Crucial Schema Fact**: `PaymentEntity` does **not** store `ledgerTransactionId`. The relationship is stored backwards: `ledger_transactions.source_reference_id = payments.id`.
- Furthermore, `PaymentResponse` (`PaymentResponse.java`) does **not** serialize `ledgerTransactionId`.

### 6.2 Existing Trace Endpoint
The only endpoint that joins a payment to its ledger transaction and entries is:
- **Path**: `GET /api/v1/admin/investigations/payments/{paymentId}`
- **Controller**: `AdminInvestigationController.java:64`
- **Security**: `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`
- **Response**: `PaymentInvestigationTraceResponse` (contains payment details, payer/payee account details, ledger transaction with entries, outbox events, Kafka consumer audit records, and reconciliation cases).
- **Customer Availability**: ❌ **NOT AVAILABLE FOR CUSTOMERS (ADMIN ONLY)**.

### 6.3 Verdict on Customer Payment Trace
There is **no customer-safe payment-to-ledger trace API** in the current backend. Attempting to call `AdminInvestigationController` from the customer frontend will result in HTTP 403 Forbidden.

---

## 7. Financial Data Model

### 7.1 Immutability Invariant
PostgreSQL Flyway migration `V5__ledger.sql` establishes a database trigger:
```sql
CREATE TRIGGER trg_immutable_ledger_entries
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION prevent_posted_ledger_mutation();
```
- Posted ledger entries can **never** be updated or deleted.
- Adjustments and reversals are recorded solely via new compensating transactions (`SYSTEM_ADJUSTMENT`, `REFUND`).
- The frontend must never provide editing or deletion mechanisms for ledger entries.

### 7.2 Double-Entry Balanced Rule
Every ledger transaction must satisfy:
$$\sum \text{DEBIT} = \sum \text{CREDIT}$$
- Enforced at transaction post time in `LedgerTransactionEntity.java:82-95`:
  ```java
  if (debitSum != creditSum) {
      throw new IllegalStateException("Transaction is unbalanced: debit sum = " + debitSum + ", credit sum = " + creditSum);
  }
  ```
- An unbalanced transaction cannot be persisted.

### 7.3 Direction Semantics
- Backend enum: `LedgerEntryDirection` (`DEBIT`, `CREDIT`).
- Customer account perspective:
  - **DEBIT**: Money deducted from account (e.g. payment made, fee charged, payout dispatched) $\rightarrow$ Outflow (-).
  - **CREDIT**: Money added to account (e.g. payment received, refund credited) $\rightarrow$ Inflow (+).
- Presentation rule: The frontend must clearly label debit/credit direction and never invert accounting polarity.

### 7.4 Non-Negotiable Frontend Boundaries
1. **No Authoritative Balance Derivation**: The frontend must never sum entries to compute account balance. Account balances are authoritative only when returned by the backend (`GET /api/v1/admin/accounts/{id}/balance-summary` or `AccountEntity.balanceMinor`).
2. **No Floating-Point Math**: All monetary amounts are integer minor units (`amountMinor`). Display conversions must use integer modulo arithmetic (`amountMinor / 100` and `amountMinor % 100`).
3. **No Fallback Fabrications**: If an amount is missing or loading, the UI must **never** display `$0.00`. It must render a loading skeleton or error state.

---

## 8. Authorization Model

### 8.1 Customer Resource Scoping & Anti-IDOR
- Authentication is established via Spring Security filter `JwtAuthenticationFilter`, which verifies JWT signatures and extracts `userId` and `roles`.
- For `GET /api/v1/payments/{id}`, ownership is validated in `PaymentService.java:181-197`:
  - `payer = accountRepository.findById(payment.getPayerAccountId())`
  - `payee = accountRepository.findById(payment.getPayeeAccountId())`
  - `isOwner = payer.ownerId == callerId || payee.ownerId == callerId`
  - If `isOwner == false`, the backend throws `PaymentNotFoundException("Payment not found or access denied")`.
  - **Security Decision**: The backend deliberately returns **HTTP 404 NOT_FOUND** (not 403) when an unauthorized customer attempts to view another customer's payment. This prevents enumeration of payment IDs (Anti-IDOR).

### 8.2 Role-Based Access Control (RBAC)
- Customer tokens contain: `{"role": "CUSTOMER"}` $\rightarrow$ Granted authority `ROLE_CUSTOMER`.
- Admin endpoints require `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`.
- When a customer calls `/api/v1/admin/**`, Spring Security's `AuthorizationFilter` rejects the request with `AccessDeniedException`.
- `GlobalExceptionHandler.java:166` converts `AccessDeniedException` into:
  ```json
  {
    "type": "https://api.paymentledger.com/errors/FORBIDDEN",
    "title": "Insufficient authorization for the requested resource",
    "status": 403,
    "detail": "Access Denied",
    "errorCode": "FORBIDDEN"
  }
  ```

---

## 9. Error Model

The backend adheres strictly to RFC 7807 `application/problem+json` handled by `GlobalExceptionHandler.java`:

| HTTP Status | ErrorCode | Backend Trigger | UI Behavior |
| :--- | :--- | :--- | :--- |
| `401` | `UNAUTHORIZED` | Expired or missing Bearer token | Triggers refresh mutex or redirects to `/login`. |
| `403` | `FORBIDDEN` | Customer accessing admin endpoint (`/admin/ledger/*`) | Renders polite "Access Denied" state; does not crash. |
| `404` | `RESOURCE_NOT_FOUND` | Payment ID not found OR IDOR ownership mismatch | Renders polite "Transaction not found" empty state. |
| `422` | `INSUFFICIENT_FUNDS` | Debtor balance insufficient | Present problem details alert with correlation tracking. |
| `422` | `ACCOUNT_FROZEN` | Account administratively frozen | Informs user that account is restricted. |
| `429` | `RATE_LIMIT_EXCEEDED`| Redis rate limiter exceeded | Displays retry delay recommendation. |
| `500` | `INTERNAL_SERVER_ERROR`| Unhandled server exception | Displays assertive RFC 7807 error banner with `correlationId`. |

---

## 10. UI State Model

For any transaction or financial record interface, the frontend must support 8 deterministic states:

```
┌────────────────┐     Fetch Initiated
│  UNFETCHED /   │ ───────────────────────► ┌────────────────┐
│     IDLE       │                          │    LOADING     │
└────────────────┘                          └───────┬────────┘
                                                    │
                   ┌────────────────────────────────┼────────────────────────────────┐
                   ▼                                ▼                                ▼
         ┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
         │     SUCCESS      │             │      EMPTY       │             │   AUTH FAILURE   │
         │  (Render Data)   │             │ (No records yet) │             │   (401 / 403)    │
         └──────────────────┘             └──────────────────┘             └──────────────────┘
                   │                                │                                │
                   ▼                                ▼                                ▼
         ┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
         │     NOT FOUND    │             │ NETWORK FAILURE  │             │   SERVER ERROR   │
         │   (404 / IDOR)   │             │ (Offline / Conn) │             │ (500 / Malformed)│
         └──────────────────┘             └──────────────────┘             └──────────────────┘
```

1. **Loading**: Accessible skeleton table/card with `aria-busy="true"`. Zero default values rendered ($0.00 is strictly prohibited).
2. **Success**: Authoritative data rendered directly from backend DTO.
3. **Empty**: "No transactions found" card with contextual call-to-action (e.g. "Make a Payment").
4. **401 Unauthorized**: Redirect to `/login` via auth context.
5. **403 Forbidden**: Dedicated permission boundary banner ("You do not have administrative privileges to view ledger records").
6. **404 Not Found**: "Record not found" notification preserving IDOR masking.
7. **Network Failure**: Retry button with exponential backoff indicator.
8. **500 Server Error**: Assertive error alert displaying `errorCode` and `correlationId`.

---

## 11. Pagination & Filtering Analysis

In the backend:
- Spring Data `Pageable` is clamped by `PageUtils.clamp(pageable)`:
  - Default page: 0
  - Default size: 20
  - Maximum size: 100
- `AdminLedgerController.listTransactions` supports:
  - Parameter: `sourceReferenceType` (`PAYMENT`, `PAYOUT`, `REFUND`, `SYSTEM_ADJUSTMENT`).
  - Spring Data `Pageable` (`page`, `size`, `sort`).
- `AdminPaymentController.listPayments` supports:
  - Parameters: `status`, `payerAccountId`, `payeeAccountId`.
  - Spring Data `Pageable` (`page`, `size`, `sort`).

**Gap Consideration**: Because these endpoints are restricted to `ADMIN`/`SYSTEM`, the customer UI has no backend mechanism to paginate or filter personal customer transactions.

---

## 12. Security Analysis

1. **IDOR Prevention**:
   - `PaymentController.getPayment` validates account ownership (`payerAccountId` or `payeeAccountId` owned by `callerId`).
   - If not owned, returns 404 (not 403). The frontend must preserve this 404 behavior and never reveal whether the resource ID exists for another user.
2. **Access Control Boundary**:
   - Attempting to bypass backend RBAC by constructing client-side ledger queries against `/api/v1/admin/ledger/*` will be rejected by Spring Security method security.
3. **Sensitive Financial Data Exposure**:
   - Ledger entries expose all internal system accounts (e.g. `SYSTEM_FEE_ACCOUNT`). Exposing these entries to customers without an administrative role would violate multi-tenant financial isolation.
4. **XSS & Injection**:
   - All string outputs (`description`, `providerReference`, `correlationId`, `idempotencyKey`) must be rendered using standard React JSX text nodes (automatic HTML escaping). `dangerouslySetInnerHTML` is prohibited.

---

## 13. Accessibility Analysis

Requirements for any transaction and ledger presentation (WCAG 2.1 AA):
1. **Semantic Tables**:
   - Must use proper semantic table elements: `<table>`, `<caption>`, `<thead>`, `<th scope="col">`, `<tbody>`, `<tr>`, `<td>`.
   - Headers must clearly identify columns: Date, Description, Reference, Direction, Amount, Status.
2. **Direction & Amount Announcements**:
   - Visual plus/minus colors (green/red) must not be the only indicator of direction.
   - Screen reader labels must explicitly announce polarity: `aria-label="Debited 50.00 US Dollars"`.
3. **Status Badges**:
   - Badges must include `role="status"` and accessible labels (e.g. `aria-label="Transaction status: Settled"`).
4. **Keyboard & Focus**:
   - All interactive table rows, copy buttons, or pagination links must have high-contrast focus indicators (`focus-visible:ring-2 focus-visible:ring-primary-500`).

---

## 14. Performance Analysis

1. **Caching & Stale Times**:
   - Posted ledger records and settled payments are immutable. Once settled, `staleTime` can be set to $\infty$ or `5 minutes` without risk of stale financial reads.
2. **Bundle Impact**:
   - Any new transaction UI must stay within the Phase F0 performance budget (< 145 kB First Load JS per route).
3. **Large Entry Lists**:
   - In double-entry transactions with multiple legs, virtualized rendering is not required since single payment settlements typically involve 2–3 entries (Debit Payer, Credit Payee, Credit Fee).

---

## 15. Existing Frontend Reuse Opportunities

The frontend codebase possesses modular, frozen building blocks ready for F4 reuse:
- **Monetary Formatting**: `formatMoney(amountMinor, currency)` from `src/features/payments/utils/money-parser.ts` handles integer minor units losslessly without floating-point errors.
- **Payment Status Badge**: `PaymentStatusBadge` from `src/features/payments/components/payment-status-badge.tsx` renders all 9 backend payment statuses.
- **RFC 7807 Error Presentation**: `PaymentErrorState` from `src/features/payments/components/payment-error-state.tsx` renders structured errors with correlation IDs.
- **API Client**: `apiClient` from `src/lib/api/client.ts` automatically attaches `Authorization: Bearer <token>` and `X-Correlation-ID`.

---

## 16. Backend Contract Gaps

| Gap ID | Description | Impact | Remediation Needed |
| :--- | :--- | :--- | :--- |
| **GAP-F4-1** | **No Customer Transaction History API** | A customer cannot see a list of their past transactions or payments. | Backend must introduce `GET /api/v1/accounts/{accountId}/transactions` or `GET /api/v1/payments` scoped to caller's owned accounts. |
| **GAP-F4-2** | **No Customer Ledger Entries API** | Customers cannot inspect double-entry journals for their account; `/api/v1/admin/ledger/...` is admin-locked (`403 Forbidden`). | Backend must expose a customer-safe account statement endpoint (e.g. `GET /api/v1/accounts/{accountId}/entries`). |
| **GAP-F4-3** | **No `ledgerTransactionId` in `PaymentResponse`** | The frontend cannot link a settled payment to its ledger transaction. | Backend `PaymentResponse` must include `ledgerTransactionId`, or provide a trace endpoint. |
| **GAP-F4-4** | **Payment Trace is Admin-Only** | Only `AdminInvestigationController` can trace payment $\rightarrow$ ledger $\rightarrow$ entries. | A customer-safe subset of the investigation trace is required if customers are to observe ledger settlement. |

---

## 17. Scope Boundaries

### What F4 MAY Include (Once APIs Exist):
- Customer transaction history table.
- Transaction detail view for a single payment.
- Presentation of debit/credit directions and integer minor unit currency.
- Correlation ID copy actions and status badges.
- Filtering and pagination (only if supported by backend).

### What F4 MUST NOT Include (Strict Scope Violations):
- ❌ Calling `AdminLedgerController`, `AdminPaymentController`, or `AdminInvestigationController` from customer UI.
- ❌ Inventing synthetic/speculative endpoints not present in the Spring Boot backend.
- ❌ Calculating authoritative balances on the client.
- ❌ Modifying frozen F0, F1, F2, or F3 code.
- ❌ Direct Kafka or Redis browser integrations.
- ❌ Refund, reversal, payout, or reconciliation workflows (reserved for F5/F6).

---

## 18. Risks

1. **Security & Authorization Violation**: Calling `/api/v1/admin/**` endpoints from the customer UI will immediately fail with HTTP 403 Forbidden in production, breaking the user experience.
2. **Multi-Tenant Data Leakage**: In double-entry bookkeeping, ledger transactions record both the debit and credit legs (including platform fee accounts). If raw ledger transactions were exposed to customers, customers would see internal system account IDs and fee structures.
3. **Speculative Drift**: Building mock endpoints in the frontend will create an architectural divergence from the frozen Spring Boot backend, resulting in complete failure during end-to-end integration.

---

## 19. Recommended F4 Architecture & Options

Given the backend reality, there are three viable architectural paths:

### Option A: Block Implementation Pending Backend Expansion (Recommended)
- Report `BLOCKED` to platform leadership.
- Request that the backend team add two customer-scoped endpoints:
  1. `GET /api/v1/accounts/{id}/transactions` (returns paginated payments/transactions where the account is payer or payee).
  2. `GET /api/v1/payments/{id}/trace` (returns customer-safe trace: payment status, settled timestamp, and journal entry ID).
- Once implemented in the Spring Boot core, proceed with customer UI.

### Option B: Repurpose F4 as the "Admin Ledger & Payment Investigation Portal"
- Acknowledge that the existing backend ledger APIs were specifically built for **administrators** (`ROLE_ADMIN`, `ROLE_SYSTEM`).
- Re-scope Phase F4 to build the **Admin Portal** views:
  - Admin Ledger Transaction Explorer (`/admin/ledger/transactions`)
  - Admin Account Journal Viewer (`/admin/ledger/accounts/[id]/entries`)
  - Admin Payment Forensic Trace (`/admin/investigations/payments/[id]`)
- *Note*: Requires adjusting the phase scope constraint that currently states "F4 MUST NOT include admin operations/investigation".

### Option C: Minimalist Customer Payment Detail (Scope Already Met in F3)
- For customers, the only existing endpoint is `GET /api/v1/payments/{id}`.
- This was already implemented and verified in Phase F3 (`src/app/(customer)/payments/[id]/page.tsx`).
- Without new backend endpoints, there is no further customer transaction work that can be implemented without violating invariants.

---

## 20. Open Questions

1. **Target Persona for F4**: Was Phase F4 originally envisioned as an internal Back-Office/Admin feature (leveraging `AdminLedgerController` and `AdminInvestigationController`), or was it intended for retail customers?
2. **Account Statement vs. Ledger**: Should retail customers ever see double-entry ledger entries (debits/credits across system accounts), or should customers only see a commercial bank-style transaction list (Payment, Transfer, Fee)?
3. **Backend Roadmap**: Will the backend team introduce customer-scoped transaction history in a minor update, or should the frontend await a new backend phase?

---

## 21. F4 Readiness Assessment

| Readiness Gate | Criteria | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Backend Inspection** | Actual backend source code forensically audited | **PASSED** | Inspected all 18 controllers, entities, schemas, and security rules. |
| **API Evidence** | Proposed APIs exist in backend | **FAILED** | No customer transaction, ledger, or trace endpoints exist. |
| **Financial Semantics** | Invariants understood (debit==credit, minor units) | **PASSED** | Immutable ledger, minor units, RFC 7807 understood. |
| **Authorization Verified** | Customer ownership & RBAC verified | **PASSED** | Verified that admin ledger endpoints reject `ROLE_CUSTOMER` with 403. |
| **Trace Availability** | Payment $\rightarrow$ Ledger trace available for customer | **FAILED** | Only `AdminInvestigationController` exposes trace; admin-locked. |
| **Zero Speculative APIs** | No fake endpoints designed | **PASSED** | Refused to invent speculative customer transaction APIs. |

### Final Status:

**BLOCKED**

Phase F4 implementation cannot proceed for customer transaction views, ledger views, or payment-to-ledger trace because the required endpoints are **NOT AVAILABLE IN CURRENT BACKEND** for customer roles. Proceeding requires either backend contract additions (Option A) or explicit platform re-scoping to the Admin persona (Option B).
