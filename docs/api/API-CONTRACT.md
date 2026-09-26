# Distributed Payment & Ledger Platform — API Contract Specification

**Status**: Verified against frozen Spring Boot backend (`payment-ledger-platform-complete-agent-kit`)  
**Protocol**: REST / JSON over HTTPS  
**Base Path**: `/api/v1`  
**Authorization**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`  
**Mandatory Tracing Header**: `X-Correlation-ID` (UUID)  
**Mandatory Idempotency Header**: `Idempotency-Key` (UUID, required on state-mutating `POST` and `PUT` requests)  
**Monetary Format**: Lossless integer minor units (`amountMinor: number`) and ISO 4217 currency (`currency: string`).

---

## 1. Standard Error Model (RFC 7807)

All non-2xx responses conform to the RFC 7807 `application/problem+json` format:

```json
{
  "type": "https://api.paymentledger.com/errors/INSUFFICIENT_FUNDS",
  "title": "Insufficient Account Balance",
  "status": 422,
  "detail": "Customer account balance (5000 USD cents) is insufficient for transaction amount (10000 USD cents).",
  "instance": "/api/v1/payments",
  "errorCode": "INSUFFICIENT_FUNDS",
  "correlationId": "c4b3a987-e21b-4f90-8b65-685b882312a0",
  "timestamp": "2026-09-23T15:30:00.000Z",
  "invalidParameters": [
    {
      "field": "amountMinor",
      "reason": "Exceeds available balance"
    }
  ]
}
```

### Standard Error Codes
| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| `400` | `INVALID_PAYLOAD` | Request validation failure or malformed payload |
| `401` | `UNAUTHORIZED` | Missing, expired, or invalid JWT access token |
| `401` | `INVALID_CREDENTIALS` | Incorrect email or password during login |
| `401` | `INVALID_REFRESH_TOKEN` | Refresh token is expired, revoked, or invalid |
| `403` | `FORBIDDEN` | Caller lacks the role or resource ownership |
| `403` | `UNAUTHORIZED_FINANCIAL_OPERATION` | Attempted financial operation outside permitted account |
| `404` | `RESOURCE_NOT_FOUND` | Account, payment, refund, payout, or transaction not found |
| `405` | `METHOD_NOT_ALLOWED` | HTTP method not supported for endpoint |
| `409` | `EMAIL_ALREADY_EXISTS` | Registration email already registered |
| `409` | `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH` | Idempotency key previously used with different payload |
| `409` | `IDEMPOTENCY_CONCURRENT_REQUEST` | Identical idempotency key request currently executing |
| `409` | `REVERSAL_ALREADY_EXISTS` | Payment has already been reversed |
| `422` | `INSUFFICIENT_FUNDS` | Debtor account has insufficient funds |
| `422` | `ACCOUNT_FROZEN` | Account is administratively frozen; debits prohibited |
| `422` | `REFUND_AMOUNT_EXCEEDS_PAYMENT` | Refund amount exceeds remaining refundable amount |
| `400` | `REFUND_NOT_ELIGIBLE` | Payment is not in settled state or ineligible for refund |
| `422` | `PAYOUT_INSUFFICIENT_FUNDS` | Account has insufficient funds for payout |
| `429` | `RATE_LIMIT_EXCEEDED` | Request rate limit exceeded |
| `502` | `PROVIDER_UNAVAILABLE` | External payment gateway unreachable or returned 5xx |
| `503` | `SERVICE_UNAVAILABLE` | Service temporarily unavailable |
| `504` | `PROVIDER_TIMEOUT` | External gateway socket timed out; transaction in reconciliation |
| `202` | `PAYMENT_PENDING_RECONCILIATION` | State indeterminate; reconciliation active |

---

## 2. Authentication & Sessions (`/api/v1/auth`)

### `POST /api/v1/auth/register`
- **Access**: Anonymous
- **Request**: `{ "email": string, "password": string, "role": "CUSTOMER" | "MERCHANT" }`
- **Response**: `201 Created`
  ```json
  {
    "userId": "uuid",
    "email": "string",
    "role": "CUSTOMER",
    "defaultAccountId": "uuid",
    "createdAt": "iso8601"
  }
  ```

### `POST /api/v1/auth/login`
- **Access**: Anonymous
- **Request**: `{ "email": string, "password": string }`
- **Response**: `200 OK`
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string",
    "tokenType": "Bearer",
    "expiresInSeconds": 900
  }
  ```

### `POST /api/v1/auth/refresh`
- **Access**: Anonymous / Bearer
- **Request**: `{ "refreshToken": string }`
- **Response**: `200 OK`
  ```json
  {
    "accessToken": "string",
    "refreshToken": "string",
    "tokenType": "Bearer",
    "expiresInSeconds": 900
  }
  ```

---

## 3. Customer Accounts (`/api/v1/accounts`)

### `GET /api/v1/accounts/{id}`
- **Access**: `CUSTOMER`, `MERCHANT` (owner only), `ADMIN`
- **Response**: `200 OK`
  ```json
  {
    "accountId": "uuid",
    "accountNumber": "string",
    "ownerId": "uuid",
    "accountType": "CUSTOMER" | "MERCHANT" | "INTERNAL" | "SYSTEM",
    "currency": "USD",
    "status": "ACTIVE" | "FROZEN" | "SUSPENDED" | "CLOSED",
    "createdAt": "iso8601"
  }
  ```

> [!NOTE]
> **Contract Discrepancy Recorded**: In backend architectural notes, `GET /api/v1/accounts/{id}/balance` was referenced. However, in the frozen backend, `AccountController.java` only implements `GET /api/v1/accounts/{id}`. Customer accounts do not have a dedicated customer-facing balance endpoint; balance verification is currently exposed via the admin API (`GET /api/v1/admin/accounts/{accountId}/balance-summary`).

---

## 4. Payments (`/api/v1/payments`)

### `POST /api/v1/payments`
- **Access**: `CUSTOMER`
- **Headers**: `Idempotency-Key` (required), `X-Correlation-ID` (required)
- **Request**:
  ```json
  {
    "payeeAccountId": "uuid",
    "amountMinor": 5000,
    "currency": "USD",
    "paymentMethodToken": "tok_visa_4242"
  }
  ```
- **Responses**:
  - `201 Created`: Settled payment
    ```json
    {
      "paymentId": "uuid",
      "idempotencyKey": "string",
      "payerAccountId": "uuid",
      "payeeAccountId": "uuid",
      "amountMinor": 5000,
      "feeAmountMinor": 150,
      "currency": "USD",
      "status": "SETTLED",
      "providerReference": "ch_xxx",
      "ledgerTransactionId": "uuid",
      "correlationId": "uuid",
      "createdAt": "iso8601"
    }
    ```
  - `202 Accepted`: Gateway timeout, entered `PENDING_RECONCILIATION`
  - `409 Conflict`: `IDEMPOTENCY_CONCURRENT_REQUEST` or `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`

### `GET /api/v1/payments/{id}`
- **Access**: `CUSTOMER` (payer), `MERCHANT` (payee), `ADMIN`
- **Response**: `200 OK`

---

## 5. Refunds & Reversals (`/api/v1`)

### `POST /api/v1/payments/{paymentId}/refunds`
- **Access**: `MERCHANT` (payee), `ADMIN`
- **Headers**: `Idempotency-Key`, `X-Correlation-ID`
- **Request**: `{ "amountMinor": number, "reason": string }`
- **Response**: `201 Created`

### `GET /api/v1/refunds/{refundId}`
- **Access**: `MERCHANT`, `CUSTOMER`, `ADMIN`
- **Response**: `200 OK`

### `POST /api/v1/payments/{paymentId}/reversal`
- **Access**: `ADMIN`
- **Headers**: `Idempotency-Key`, `X-Correlation-ID`
- **Request**: `{ "reason": string }`
- **Response**: `200 OK`

### `GET /api/v1/reversals/{reversalId}`
- **Access**: `ADMIN`
- **Response**: `200 OK`

---

## 6. Payouts (`/api/v1/payouts`)

### `POST /api/v1/payouts`
- **Access**: `MERCHANT`
- **Headers**: `Idempotency-Key`, `X-Correlation-ID`
- **Request**: `{ "accountId": "uuid", "amountMinor": number, "currency": string, "destination": string }`
- **Response**: `201 Created`

### `GET /api/v1/payouts/{payoutId}`
- **Access**: `MERCHANT`, `ADMIN`
- **Response**: `200 OK`

---

## 7. Webhook Subscriptions (`/api/v1/webhooks/subscriptions`)

### `POST /api/v1/webhooks/subscriptions`
- **Access**: `MERCHANT`, `ADMIN`
- **Request**: `{ "targetUrl": string, "eventTypes": string[], "secret": string }`
- **Response**: `201 Created`

### `GET /api/v1/webhooks/subscriptions`
- **Access**: `MERCHANT`, `ADMIN`
- **Response**: `200 OK`

### `DELETE /api/v1/webhooks/subscriptions/{id}`
- **Access**: `MERCHANT`, `ADMIN`
- **Response**: `204 No Content`

---

## 8. Admin Operations (`/api/v1/admin`)

- **Accounts**:
  - `GET /api/v1/admin/accounts`: List accounts (paginated, filter by `ownerId`, `accountType`, `status`)
  - `GET /api/v1/admin/accounts/{accountId}`: Single account
  - `GET /api/v1/admin/accounts/{accountId}/balance-summary`: Authoritative double-entry ledger calculation vs materialized balance
  - `POST /api/v1/admin/accounts/{accountId}/freeze`: Administrative freeze
  - `POST /api/v1/admin/accounts/{accountId}/unfreeze`: Administrative unfreeze
- **Ledger**:
  - `GET /api/v1/admin/ledger/transactions`: Search immutable transactions
  - `GET /api/v1/admin/ledger/transactions/{transactionId}`: Single transaction details
  - `GET /api/v1/admin/ledger/accounts/{accountId}/entries`: Double-entry journal entries for an account
- **Adjustments**:
  - `POST /api/v1/admin/adjustments`: Post manual compensating ledger adjustment
  - `GET /api/v1/admin/adjustments/{adjustmentId}`: Single adjustment
- **Dashboard & Audit**:
  - `GET /api/v1/admin/dashboard/summary`: Platform metrics summary
  - `GET /api/v1/admin/audit-logs`: Audit trail query
  - `GET /api/v1/admin/audit-logs/{id}`: Single audit entry
- **Investigations**:
  - `GET /api/v1/admin/investigations/payments/{paymentId}`: Comprehensive forensic trace of a payment
- **Notifications**:
  - `GET /api/v1/admin/notifications`: List notifications
  - `POST /api/v1/admin/notifications/{id}/retry`: Trigger retry
  - `POST /api/v1/admin/notifications/run-worker`: Manually dispatch notification worker
- **Reconciliation**:
  - `GET /api/v1/admin/reconciliation/cases`: Discrepancy cases
  - `GET /api/v1/admin/reconciliation/cases/{id}`: Discrepancy case details
  - `POST /api/v1/admin/reconciliation/cases/{id}/trigger`: Trigger case analysis
  - `POST /api/v1/admin/reconciliation/cases/{id}/retry`: Retry failed resolution
  - `POST /api/v1/admin/reconciliation/run`: Trigger reconciliation batch job
  - `POST /api/v1/admin/reconciliation/audit/ledger`: Verify ledger balance invariants
  - `POST /api/v1/admin/reconciliation/audit/balances`: Audit materialized balance cache agreement
