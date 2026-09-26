# Refund & Reversal Architecture

**Distributed Payment & Ledger Platform UI**  
**Phase**: F5 — Financial Compensation Architecture  
**Status**: Implemented & Verified  

---

## 1. Overview

The Refund & Reversal subsystem provides financial compensation workflows for settled payments on the Distributed Payment & Ledger Platform. All financial movements are authoritative on the Spring Boot backend (`payment-ledger-platform-complete-agent-kit`) and mirrored onto the double-entry accounting ledger via compensating transaction records.

The UI provides:
- Partial and full refund issuance with optional reason tracking.
- Authoritative refund receipt inspection (`/refunds/[id]`).
- Full payment reversals with mandatory reason auditing.
- Authoritative reversal record inspection (`/reversals/[id]`).

---

## 2. Frozen Backend Contracts

### 2.1 Refunds
- **Create Refund**:
  - `POST /api/v1/payments/{paymentId}/refunds`
  - **Required Headers**: `Idempotency-Key: <UUIDv4>`
  - **Optional Headers**: `X-Correlation-ID: <UUIDv4>`
  - **Request Body**:
    ```json
    {
      "amountMinor": 2500,
      "reason": "Customer returned merchandise"
    }
    ```
  - **Responses**:
    - `201 CREATED`: Succeeded and settled on ledger.
    - `202 ACCEPTED`: External gateway processing; status is `PENDING_RECONCILIATION`.
    - `400 BAD_REQUEST`: Payment not settled or already reversed (`REFUND_NOT_ELIGIBLE`).
    - `403 FORBIDDEN`: Caller does not own payer or payee account (`UNAUTHORIZED_FINANCIAL_OPERATION`).
    - `404 NOT_FOUND`: Payment ID not found.
    - `409 CONFLICT`: Idempotency collision.
    - `422 UNPROCESSABLE_ENTITY`: Exceeds refundable amount (`REFUND_AMOUNT_EXCEEDS_PAYMENT`), account frozen (`ACCOUNT_FROZEN`), or insufficient funds (`INSUFFICIENT_FUNDS`).

- **Get Refund Detail**:
  - `GET /api/v1/refunds/{refundId}`
  - **Returns**: `RefundResponse` containing `refundId`, `paymentId`, `amountMinor`, `currency`, `status`, `reason`, `providerReference`, `compensatingLedgerTransactionId`, and `createdAt`.

### 2.2 Reversals
- **Create Reversal**:
  - `POST /api/v1/payments/{paymentId}/reversal`
  - **Required Headers**: `Idempotency-Key: <UUIDv4>`
  - **Request Body**:
    ```json
    {
      "reason": "Duplicate charge administrative reversal"
    }
    ```
  - **Invariants**:
    - Reversal is strictly full original payment amount.
    - The UI does not provide or permit partial amount inputs.
    - Backend is authoritative for eligibility (no prior refunds, settled status).

- **Get Reversal Detail**:
  - `GET /api/v1/reversals/{reversalId}`
  - **Returns**: `ReversalResponse` containing `reversalId`, `paymentId`, `amountMinor`, `currency`, `status`, `reason`, `compensatingLedgerTransactionId`, and `createdAt`.

---

## 3. Financial Invariants & Idempotency Lifecycle

1. **Explicit Two-Step Confirmation**:
   $$\text{User enters input} \longrightarrow \text{Validate} \longrightarrow \text{Explicit review modal} \longrightarrow \text{Freeze payload} \longrightarrow \text{Generate } K_1 \text{ (UUIDv4)} \longrightarrow \text{Submit}$$
2. **Ambiguous Outcome Recovery**:
   - If network times out, the exact payload and $K_1$ are preserved.
   - The UI never generates $K_2$ automatically.
   - User is offered safe retry using $K_1$ or link to verify status.
3. **No Synthetic Balances**:
   - Frontend never calculates remaining refundable balances or merchant ledger balances.
   - Backend remains the sole financial authority.

---

## 4. Polling & Reconciliation Architecture

When a refund or reversal enters `PENDING_RECONCILIATION`:
- TanStack Query hook activates bounded polling (max 10 attempts, 3000ms interval).
- Wired with `AbortController` for immediate cancellation on unmount or navigation.
- Terminal statuses (`SETTLED`, `COMPLETED`, `FAILED`) stop the polling coordinator.
- If polling exhausts, an informative banner offers manual status re-checks without re-initiating financial mutations.
