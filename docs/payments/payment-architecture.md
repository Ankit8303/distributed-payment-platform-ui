# Payment Architecture & Financial Safety Specifications
**Phase F3 — Distributed Payment Platform UI**

---

## 1. Architectural Overview

The payment feature in Phase F3 establishes the customer-facing interface for initiating, submitting, and tracking financial payments across the distributed ledger platform. The architecture strictly adheres to zero-trust frontend principles where the backend remains the sole financial authority.

```
+-----------------------------------------------------------------------------------+
|                                  BROWSER (UI)                                     |
|                                                                                   |
|   +-------------------+    User Review    +--------------------+                  |
|   | Payment Form      | ----------------> | Confirmation Modal |                  |
|   | Draft State (Zod) |                   | (Freeze Payload)   |                  |
|   +-------------------+                   +--------------------+                  |
|                                                     |                             |
|                                                     | User Confirms               |
|                                                     v                             |
|                                           +--------------------+                  |
|                                           | Generate K1 (UUID) |                  |
|                                           +--------------------+                  |
|                                                     |                             |
|                                                     v                             |
|                         POST /api/v1/payments (Idempotency-Key: K1)               |
+---------------------------------------------|-------------------------------------+
                                              |
                                              v
+-----------------------------------------------------------------------------------+
|                        FROZEN SPRING BOOT BACKEND & LEDGER                        |
|                                                                                   |
|   1. Verify Idempotency Record (K1)                                               |
|   2. Resolve Payer Account from Authenticated JWT Session                        |
|   3. Authorize, Book Ledger, & Dispatch Financial Network                         |
|   4. Return Authoritative Status (201 Settled / 202 Pending Reconciliation / ...) |
+-----------------------------------------------------------------------------------+
```

---

## 2. Frozen Backend Contracts

The payment integration strictly targets only the two approved customer payment endpoints. No speculative endpoints or unapproved methods are permitted.

### Endpoint Matrix

| Method | Path | Status Codes | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payments` | `201 Created`<br>`202 Accepted`<br>`400 / 409 / 422 / 500` | Initiates payment with frozen payload & idempotency key header. |
| `GET` | `/api/v1/payments/{id}` | `200 OK`<br>`404 / 500` | Retrieves authoritative payment status with `AbortSignal` support. |

### Request DTO (`POST /api/v1/payments`)

```json
{
  "payeeAccountId": "123e4567-e89b-12d3-a456-426614174000",
  "amountMinor": 2550,
  "currency": "USD",
  "paymentMethodToken": "tok_visa"
}
```

*Note: Payer account is never specified in the frontend request; the backend authoritatively derives the payer account from the authenticated JWT session.*

### Response DTO (`PaymentResponse`)

```json
{
  "paymentId": "pay_987654",
  "idempotencyKey": "a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d",
  "payerAccountId": "acc_payer_customer_1",
  "payeeAccountId": "123e4567-e89b-12d3-a456-426614174000",
  "amountMinor": 2550,
  "feeAmountMinor": 50,
  "currency": "USD",
  "status": "SETTLED",
  "providerReference": "prov_ref_112233",
  "correlationId": "c0a80101-9876-4321-bba0-112233445566",
  "createdAt": "2026-09-26T00:15:00.000Z",
  "message": "Payment settled successfully",
  "pollUrl": "/api/v1/payments/pay_987654"
}
```

---

## 3. Financial Safety Invariants

1. **Backend Authority**: PostgreSQL/backend is the sole financial source of truth.
2. **Zero Browser Authority**: The frontend never calculates balances, settles transactions, or determines payment success without backend verification.
3. **Cache Invariant**: TanStack Query operates exclusively as a client-side server-state cache.
4. **Credential Isolation**: Access tokens are kept in memory only; payment method tokens and credentials are never persisted in storage.
5. **Mutation Retry Prohibition**: Financial `POST` mutations have automatic retry disabled (`retry: false`).

---

## 4. Money Precision & Deterministic Parser

Financial amounts are converted from user decimal input to minor units (e.g. cents) using deterministic string splitting and `BigInt` arithmetic.

- **Forbidden Math**: Zero floating-point multiplication (`Number * 100`, `parseFloat`, `Math.pow`).
- **Precision**: Strictly 2 decimal places in Phase F3.
- **Safety Boundary**: Validated strictly greater than 0 (`@Min(1)`) and less than or equal to `Number.MAX_SAFE_INTEGER` (`9,007,199,254,740,991`).
- **Currency**: Validated against `/^[A-Z]{3}$/` (USD product default).

---

## 5. Idempotency Key Lifecycle & Ambiguous Outcomes

### Lifecycle Stages

1. **Form Editing**: User drafts inputs; no idempotency key is created.
2. **Client Validation**: Zod verifies format and positive amount.
3. **Review**: Confirmation dialog opens displaying transaction summary.
4. **User Confirms**:
   - Exact payload is frozen.
   - Idempotency key K1 is generated via `crypto.randomUUID()`.
   - Submit action is immediately disabled against double clicks.
5. **Submission**: Payload + K1 dispatched with `Idempotency-Key: <K1>` header.

### Ambiguous Outcome Rule

If a payment submission terminates due to network failure, connection drop, timeout, or abort before receiving an HTTP response:
- The outcome is categorized as **AMBIGUOUS**.
- **K1 is preserved** alongside the immutable frozen payload.
- **NEVER GENERATE K2** on ambiguous outcomes.
- Recovery must either retry K1 with the identical payload or query `GET /api/v1/payments/{id}`.

---

## 6. Payment Status Model & State Machine

The backend emits 9 raw status enum values, mapped safely to 6 UI states:

| Backend State | UI State | Presentation Label | Variant | Semantics |
| :--- | :--- | :--- | :--- | :--- |
| `SETTLED` | `SETTLED` | Settled | `success` | Terminal: Funds settled in ledger. |
| `DECLINED` | `DECLINED` | Declined | `danger` | Terminal: Provider or account declined payment. |
| `FAILED` | `FAILED` | Failed | `danger` | Terminal: Authoritative processing failure. |
| `EXPIRED` | `EXPIRED` | Expired | `neutral` | Terminal: Payment authorization expired. |
| `PENDING_RECONCILIATION` | `PENDING_RECONCILIATION` | Reconciliation In Progress | `warning` | Non-terminal: Active reconciliation with bank network. |
| `CREATED` | `PROCESSING` | Processing | `info` | Intermediate: Awaiting settlement. |
| `AUTHORIZING` | `PROCESSING` | Processing | `info` | Intermediate: In-flight network authorization. |
| `AUTHORIZED` | `PROCESSING` | Processing | `info` | Intermediate: Hold placed on funds. |
| `CAPTURING` | `PROCESSING` | Processing | `info` | Intermediate: Funds capture initiated. |
| *Other / Unknown* | `UNKNOWN` | Status Unknown | `neutral` | Fails safe; authoritative check required. |

---

## 7. Bounded Polling Coordinator & Cancellation

When a payment is in `PENDING_RECONCILIATION`:
1. Polling interval is approximately 3 seconds (`3,000ms`).
2. Maximum polling budget is strictly 10 attempts (~30 seconds).
3. Attempt counter is maintained via `useRef` to avoid render thrashing.
4. An active `AbortController` instance is created per polling request and wired directly through `apiFetch` to native `fetch`.
5. Polling terminates immediately upon:
   - Terminal state (`SETTLED`, `DECLINED`, `FAILED`, `EXPIRED`).
   - Component unmount or route navigation.
   - Budget exhaustion (switches to manual "Check Status").
   - Cancellation signal.
