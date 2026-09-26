# Phase F3 Implementation Plan — Payment Creation, Idempotency & Payment Lifecycle

**Phase**: F3 — Payment Creation, Idempotency & Payment Lifecycle  
**Date**: 2026-09-25  
**Author**: Antigravity Engineering Agent  
**Status**: IMPLEMENTATION_PLAN_READY  

---

## 1. Executive Summary

Phase F3 introduces **Payment Creation, Idempotency-Aware Submission, and Payment Lifecycle Presentation** for the Distributed Payment & Ledger Platform UI.

Phase F0 established the project foundation, Phase F1 established authentication and session security, and Phase F2 delivered the customer account dashboard shell. All preceding phases (F0, F1, F2) and the Spring Boot backend (`payment-ledger-platform-complete-agent-kit`) are officially **FROZEN**.

The objective of Phase F3 is to enable authenticated customers to submit payments safely and observe their lifecycle states against the actual frozen backend without violating core financial invariants:
1. **Financial Authority**: PostgreSQL and the Spring Boot backend remain the sole authoritative source of financial truth. The browser, TanStack Query cache, React state, and local storage are **never** authoritative for financial state.
2. **Contract Fidelity**: Only verified, existing customer backend endpoints (`POST /api/v1/payments` and `GET /api/v1/payments/{id}`) are used. Zero speculative endpoints are created.
3. **Idempotency as a First-Class Financial Safety Mechanism**: Payment creation is a financial mutation. Every submission must be strictly idempotency-aware. Duplicate UI clicks must be disabled immediately. Ambiguous network outcomes (e.g. timeouts, dropped responses) must **never** trigger a new idempotency key (`K2`). The frontend must preserve `K1` and execute authoritative recovery.
4. **State Machine Fidelity**: The backend payment status machine (`CREATED`, `AUTHORIZING`, `AUTHORIZED`, `CAPTURING`, `SETTLED`, `DECLINED`, `FAILED`, `EXPIRED`, `PENDING_RECONCILIATION`) must be presented accurately. `PENDING_RECONCILIATION` is an indeterminate processing state and must **never** be presented as a simple failure.
5. **Strict Scope Isolation**: Phase F3 is strictly bounded. Payment history listing, transaction ledgers, balance calculations, balance displays, refunds, reversals, payouts, reconciliation cases, and admin controls are strictly excluded.

---

## 2. Plan Remediation — Review Findings

Following exhaustive forensic auditing of the frozen backend implementation and three iterative review cycles, all identified findings have been fully resolved:

### Finding 1: Financial Money Parsing
- **Original Issue**: The initial draft proposed `whole * Math.pow(10, decimalPlaces) + frac` while simultaneously declaring floating-point arithmetic forbidden.
- **Backend Evidence**: `PaymentCreateRequest.java` models `amountMinor` as a primitive Java `long`. PostgreSQL stores it as a 64-bit integer `BIGINT`.
- **Corrected Design**: Replaced with deterministic string and `BigInt` parsing. The whole part is parsed as `BigInt`, the fractional part is split, padded to currency precision (2 digits) via string operations, and combined via integer arithmetic: `BigInt(wholeStr) * 100n + BigInt(paddedFrac)`. No floating-point multiplication (`Number * 100`), division, or `Math.pow` is used. The result is validated against JavaScript `Number.MAX_SAFE_INTEGER` before being safely passed as a number to JSON serialization.
- **Implementation Constraint**: `src/features/payments/utils/money-parser.ts` must use strictly deterministic string/BigInt logic. Floating-point math is rejected.

### Finding 2: Remove Unsupported Amount Limit
- **Original Issue**: Imposed an artificial ceiling of `amountMinor <= 999,999,999` in both the plan and gap analysis.
- **Backend Evidence**: Inspection of `PaymentCreateRequest.java`, `PaymentEntity.java`, and `PaymentService.java` reveals no business rule capping payments at 999,999,999 minor units. The backend constraint is strictly `@Min(value = 1, message = "Amount must be strictly positive")` on a 64-bit `long`.
- **Corrected Design**: Removed the arbitrary 999,999,999 ceiling from both documents. Clearly separated **Client UX Validation** (format validation, positivity `>= 1`, and JavaScript integer safety `<= Number.MAX_SAFE_INTEGER`) from **Backend Authoritative Validation** (currency match, account active status, sufficient balance, ledger debit availability).
- **Implementation Constraint**: Client forms will not reject valid high-value payments that fit within standard integer limits; financial balance limits remain the sole responsibility of the backend.

### Finding 3: Idempotency Key Lifecycle
- **Original Issue**: Generating the idempotency key on form component mount.
- **Backend Evidence**: `PaymentService.java` hashes the request body (`payeeAccountId|amountMinor|currency|paymentMethodToken`) and binds it to the key in PostgreSQL (`IdempotencyRecordEntity`). Generating keys on mount risks stale keys, key leaks, or mismatch conflicts if a user edits fields before submitting.
- **Corrected Design**: The idempotency key is generated **strictly after user confirmation**:
  ```text
  FORM EDITING → CLIENT VALIDATION → REVIEW PAYMENT → USER CONFIRMS → FREEZE EXACT PAYLOAD → GENERATE K1 → SUBMIT PAYLOAD + K1
  ```
  Once submission begins, `K1` and the frozen payload are completely immutable. Any recovery or retry of that attempt must use `K1 + identical payload`. If the user edits any financial field after a failure or cancels, a brand-new payment attempt is created with a new key upon subsequent confirmation.
- **Implementation Constraint**: `PaymentForm` will not generate `idempotencyKey` in `useEffect` or state on mount; key generation occurs atomically during the confirmation-to-submission transition.

### Finding 4: Deterministic Polling Coordinator & AbortController Wiring
- **Original Issue**: The plan claimed AbortController support and bounded counting, but called `setState()` from inside TanStack Query's `refetchInterval` callback without concrete cancellation wiring.
- **Backend Evidence**: `POST /api/v1/payments` returns HTTP `202 ACCEPTED` with `pollUrl: "/api/v1/payments/{id}"` on `PENDING_RECONCILIATION`. Polling queries `GET /api/v1/payments/{id}`. `apiFetch` natively passes `customConfig` (including `signal?: AbortSignal`) directly to native `fetch()`.
- **Corrected Design**:
  - `getPayment(paymentId, signal)` explicitly passes `signal` to `apiFetch`.
  - TanStack Query's `queryFn: ({ signal }) => getPayment(paymentId!, signal)` natively receives TanStack's query signal.
  - The bounded coordinator uses `pollAttemptRef = useRef(0)` and `abortControllerRef = useRef<AbortController | null>(null)`.
  - Each scheduled polling step instantiates a new `AbortController` and passes its `signal` to `getPayment`.
  - Stops immediately on terminal status (`SETTLED`, `DECLINED`, `FAILED`, `EXPIRED`).
  - On component unmount, route navigation, or cleanup: `abortControllerRef.current?.abort()` aborts the active in-flight HTTP request, and `clearTimeout(timerRef.current)` cancels the pending timer.
  - Polling stops strictly at 10 automated attempts (~30 seconds).
  - Expiry Fallback UX: Displays *"Payment confirmation is still pending. Reconciling with financial network."* with a manual *"Check Status"* button executing an authoritative `GET`.
- **Implementation Constraint**: Zero `setState()` inside TanStack Query callbacks. Concrete `AbortController` cancellation wired through `getPayment` and `apiFetch`.

### Finding 5: Forensic Breakdown of 5xx & Failed Idempotency Semantics
- **Original Issue**: Assuming HTTP 500 errors could be retried with the same key.
- **Backend Evidence**: Audited directly from `PaymentService.java`: When an unhandled exception occurs, `failIdempotency` marks the record `FAILED` in PostgreSQL in an isolated transaction (`REQUIRES_NEW`). Any replay with the same key throws `PaymentDomainException("Previous request failed. Please use a new idempotency key.")`.
- **Corrected Design**: Separated error semantics into 5 rigorous categories:
  - **A. Authoritative Terminal Failure (HTTP 400 / 422 / 500 with RFC 7807 response)**: Backend executed and recorded the failure. Retrying with the same key is rejected. User must fix inputs or restart with a **new key**.
  - **B. Ambiguous Network Outcome (Fetch timeout / connection drop / no HTTP response)**: State is unknown. Client must **NEVER** generate a new key (`K2`). Must query status or replay with **K1**.
  - **C. Concurrent Request (HTTP 409 `IDEMPOTENCY_CONCURRENT_REQUEST`)**: In-flight lock. Client halts submission, waits ~3s, and polls status.
  - **D. Completed Replay (HTTP 200/201/202 with same key)**: Safe cached response replay.
  - **E. FAILED Idempotency Record**: Backend rejects replay. Client prompts user to start a new payment with a fresh key.
- **Implementation Constraint**: Replay of `K1` is reserved strictly for Ambiguous Network Outcomes (no HTTP response received) and `IDEMPOTENCY_CONCURRENT_REQUEST`. Authoritative HTTP 500 responses must not be blindly replayed with `K1`.

### Finding 6: Currency Precision Scope & Validation Contract
- **Original Issue**: Ambiguity between frontend validation accepting any `^[A-Z]{3}$` currency, money parser accepting 2 decimals, and lack of authoritative currency-precision metadata.
- **Backend Evidence**: `PaymentCreateRequest.java` specifies `@NotBlank @Size(min = 3, max = 3) private String currency;`. `PaymentService.java` enforces account currency matching. No currency-precision API exists in the backend.
- **Corrected Design**:
  - Payment-entry precision in F3 is **strictly limited to 2 decimal places**.
  - USD is the default/preselected product currency (documented as a **FRONTEND PRODUCT SCOPE CONSTRAINT**).
  - Validation allows three uppercase letters matching `/^[A-Z]{3}$/` where manual input/selection is exposed.
  - The frontend must **NOT infer minor-unit precision from the currency code** (no speculative zero-decimal or three-decimal guessing).
  - All F3 monetary calculations and minor unit conversions assume standard 2-decimal minor units (cents / 100). Future support for non-2-decimal currencies requires an authoritative currency configuration metadata API from the backend.
- **Implementation Constraint**: Internal representation is integer minor units (`BigInt` / cents). Precision is fixed at 2 decimal places for F3.

### Finding 7: Ambiguous Outcome Decision Tree
- **Original Issue**: The tree asked "Is paymentId known from partial response?", which was misleading for cases where no HTTP response was received at all.
- **Corrected Design**: Rewritten with explicit branching distinguishing **HTTP response received** (even if partial/error) from **NO HTTP response received** (timeout, network drop, fetch abort).
- **Implementation Constraint**: Absolute invariant: `AMBIGUOUS OUTCOME => NEVER GENERATE K2`.

---

## 3. Frozen Backend Contract

### Confirmed Customer Payment Endpoints

Forensic inspection of `com.paymentledger.payment.api.PaymentController` confirms exactly **two** customer-accessible endpoints:

#### Endpoint 1: Payment Creation
- **HTTP Method**: `POST`
- **Path**: `/api/v1/payments`
- **Authentication**: Bearer token via `Authorization: Bearer <accessToken>`
- **Required Headers**:
  - `Idempotency-Key: <string>` (Mandatory; missing header yields HTTP `400 Bad Request`)
- **Optional Headers**:
  - `X-Correlation-ID: <string>` (Client-generated UUID v4 for distributed trace correlation)
- **Request Body**:
  ```json
  {
    "payeeAccountId": "UUID (required)",
    "amountMinor": 1050,
    "currency": "USD",
    "paymentMethodToken": "tok_visa"
  }
  ```
  *(Important: There is **no** `payerAccountId` in the request body. The backend resolves the payer operational account automatically from the authenticated `userId`. The frontend must **not** provide a payer account selector).*
- **Response Status Codes**:
  - `201 CREATED`: Payment processed (typically `SETTLED`).
  - `202 ACCEPTED`: Payment entered `PENDING_RECONCILIATION` (gateway timeout or post-capture database settlement delay; includes `pollUrl`).
  - `400 BAD_REQUEST`: Validation failure, or provider declined/capture failed.
  - `401 UNAUTHORIZED`: Missing, invalid, or expired authentication token.
  - `404 NOT_FOUND`: Payee account does not exist.
  - `409 CONFLICT`: Idempotency collision (`IDEMPOTENCY_CONCURRENT_REQUEST` or `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`).
  - `422 UNPROCESSABLE_ENTITY`: `INSUFFICIENT_FUNDS` or `ACCOUNT_FROZEN`.
  - `429 TOO_MANY_REQUESTS`: Rate limit exceeded (`RATE_LIMIT_EXCEEDED`).
  - `500 INTERNAL_SERVER_ERROR`: Unhandled system failure.

#### Endpoint 2: Single Payment Retrieval
- **HTTP Method**: `GET`
- **Path**: `/api/v1/payments/{id}`
- **Authentication**: Bearer token via `Authorization: Bearer <accessToken>`
- **Path Parameter**: `id` (RFC 4122 UUID string)
- **Response Status Codes**:
  - `200 OK`: Authoritative `PaymentResponse`.
  - `401 UNAUTHORIZED`: Authentication required.
  - `404 NOT_FOUND`: Payment not found OR caller does not own either payer or payee account (anti-IDOR masking).

### Exact Response Contract: `PaymentResponse`
The backend DTO `com.paymentledger.payment.api.dto.PaymentResponse` serializes strictly the following fields:
```typescript
export interface PaymentResponse {
  paymentId: string;           // UUID
  idempotencyKey: string;      // Echoed idempotency key
  payerAccountId: string;      // UUID resolved by backend
  payeeAccountId: string;      // UUID from request
  amountMinor: number;         // Integer minor units (e.g. 1050)
  feeAmountMinor: number;      // Integer minor units (e.g. 0)
  currency: string;            // ISO-4217 3-letter code (e.g. "USD")
  status: string;              // PaymentStatus string name
  providerReference?: string;  // Provider transaction reference (null if declined before capture)
  correlationId?: string;      // Trace correlation ID
  createdAt: string;           // ISO-8601 UTC timestamp
  message?: string;            // Present when PENDING_RECONCILIATION
  pollUrl?: string;            // Present when PENDING_RECONCILIATION (e.g. "/api/v1/payments/{id}")
}
```

### Non-Existent Endpoints (Contract Facts)
The following endpoints **do not exist** in the customer backend:
- `GET /api/v1/payments` (DOES NOT EXIST for customers; only exposed under `/api/v1/admin/payments` for `ADMIN`/`SYSTEM`).
- `POST /api/v1/payments/{id}/authorize` (DOES NOT EXIST; authorization is internal to `createPayment`).
- `POST /api/v1/payments/{id}/capture` (DOES NOT EXIST; capture is internal to `createPayment`).
- `POST /api/v1/payments/{id}/cancel` or `POST /api/v1/payments/{id}/retry` (DOES NOT EXIST).

---

## 4. State Model & Mapping Rules

### 1. Backend Enum States
The backend defines `PaymentStatus` with 9 enum values:
`CREATED`, `AUTHORIZING`, `AUTHORIZED`, `CAPTURING`, `SETTLED`, `DECLINED`, `FAILED`, `EXPIRED`, `PENDING_RECONCILIATION`.

### 2. API-Exposed States
In the customer API:
- `createPayment` returns HTTP `201` with `status: "SETTLED"` on success.
- `createPayment` returns HTTP `202` with `status: "PENDING_RECONCILIATION"` on gateway timeout, post-capture DB failure, or orphaned crash recovery.
- If declined or capture failed during creation, the backend throws `PaymentDomainException` with message `PROVIDER_DECLINED: ...` or `CAPTURE_FAILED: ...` (returning HTTP 400 with RFC 7807 error). However, the backend saves the `PaymentEntity` with status `DECLINED` or `FAILED`.
- Subsequent `GET /api/v1/payments/{id}` calls return the persisted entity status: `SETTLED`, `DECLINED`, `FAILED`, `PENDING_RECONCILIATION`, or `EXPIRED`.
- Intermediate states (`CREATED`, `AUTHORIZING`, `AUTHORIZED`, `CAPTURING`) represent transient microsecond in-flight execution steps in a single backend thread. They are never normal terminal states.

### 3. Frontend States Actually Required
The frontend state machine requires exactly 6 distinct semantic presentation states:
1. `SETTLED`: Terminal success. Funds captured and ledger posted atomically.
2. `PENDING_RECONCILIATION`: Indeterminate / active investigation. Gateway timed out or ledger settlement delayed. Not a failure. Polling active.
3. `DECLINED`: Terminal failure. Issuer declined authorization. Safe to retry with another card/token and a new idempotency key.
4. `FAILED`: Terminal failure. Capture or technical processing failed.
5. `EXPIRED`: Terminal status. Authorization expired without settlement.
6. `UNKNOWN`: Catch-all for unrecognized or speculative states.

### 4. Mapping Rules Table

| Backend Serialized Status | Frontend Display Label | Semantic Category | Badge Variant | User Guidance |
| :--- | :--- | :--- | :--- | :--- |
| `SETTLED` | Settled | `SUCCESS` (Terminal) | `success` (Green) | "Payment successfully processed and settled." |
| `PENDING_RECONCILIATION` | Reconciliation In Progress | `PENDING` (Transitional) | `warning` (Amber) | "Payment processing. Reconciling with financial network. Do not resubmit." |
| `DECLINED` | Declined | `FAILURE` (Terminal) | `danger` (Red) | "Payment was declined by the payment provider." |
| `FAILED` | Failed | `FAILURE` (Terminal) | `danger` (Red) | "Payment processing failed. Funds were not captured." |
| `EXPIRED` | Expired | `EXPIRED` (Terminal) | `neutral` (Gray) | "Payment authorization expired." |
| `CREATED` / `AUTHORIZING` / `AUTHORIZED` / `CAPTURING` | Processing | `PROCESSING` (Transitional) | `info` (Blue) | "Payment is currently processing. Please wait." |
| *Any other / null* | Status Unknown | `UNKNOWN` (Safe Fallback) | `neutral` (Gray) | "Payment status cannot be verified. Please check back later." |

### 5. Unknown-State Handling
- Unknown states must **fail safely** rather than being silently mapped to `SUCCESS` or `FAILURE`.
- If an unmapped status string is encountered, the UI displays `Status Unknown`, renders a warning alert advising the customer that authoritative status is pending verification, logs a sanitized telemetry warning, and provides a manual "Check Status" button to poll `GET /api/v1/payments/{id}`.

---

## 5. Idempotency Architecture & Lifecycle

Idempotency is a first-class financial safety mechanism designed to prevent duplicate payments, race conditions, and double charging.

### Idempotency Key Lifecycle
The key is **never generated on form mount**. Generating on mount risks key leaks, stale submissions, or idempotency hash conflicts if the user modifies form fields.

```text
[ FORM EDITING ]
       │  (User edits payee, amount, currency, token)
       ▼
[ CLIENT VALIDATION ]
       │  (Validates UUID, BigInt amount, currency ^[A-Z]{3}$)
       ▼
[ REVIEW PAYMENT ]
       │  (User clicks "Review Payment"; modal opens)
       ▼
[ USER CONFIRMS ]
       │  (User clicks "Confirm & Pay" in PaymentConfirmDialog)
       ▼
[ FREEZE EXACT PAYLOAD ]
       │  (Payload object is deeply frozen/immutable)
       ▼
[ GENERATE K1 ]
       │  (UUID v4 generated: crypto.randomUUID())
       ▼
[ SUBMIT PAYLOAD + K1 ]
       │  (POST /api/v1/payments with Header Idempotency-Key: K1)
       ▼
[ SUBMITTING (Buttons Disabled) ]
```

### Strict Immutability & Replay Rules
1. **Immutable Binding**: Once submission begins, `K1` is immutably bound to the exact payload (`payeeAccountId`, `amountMinor`, `currency`, `paymentMethodToken`).
2. **Same Key + Same Payload**: The backend safely replays the cached `PaymentResponse` (HTTP 200/201/202).
3. **Same Key + Different Payload**: Backend throws `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH` (HTTP `409 Conflict`). Frontend halts, informs user, and resets with a new key.
4. **Modifying Fields After Failure**: If the user modifies any payment field after a failure or cancels an attempt, the old draft and key are discarded. A **new idempotency key** is generated only upon confirming the new payload.

---

## 6. 5xx & Failed Idempotency Semantics

### Forensic Taxonomy of Outcomes

| Outcome Category | Trigger Condition | Backend DB State | Can Replay with K1? | Frontend Action |
| :--- | :--- | :--- | :--- | :--- |
| **A. Authoritative Terminal Failure** | HTTP `400` / `422` or `500` with RFC 7807 response | `idempotency_records` marked `FAILED` via `failIdempotency()` | **NO**. Replay throws `PaymentDomainException`. | Display authoritative error message. Safe to fix inputs; requires **new idempotency key**. |
| **B. Ambiguous Network Outcome** | Fetch abort, network timeout, connection dropped (no HTTP response received) | Unknown (may be `IN_PROGRESS`, `COMPLETED`, or not received) | **YES**. Must use `K1` exclusively. | **NEVER create K2**. Replay `POST` with `K1` + same payload, or query `GET /payments/{id}` if `paymentId` known. |
| **C. Concurrent Conflict** | HTTP `409` (`IDEMPOTENCY_CONCURRENT_REQUEST`) | `idempotency_records` status is `IN_PROGRESS` | **YES** (after delay). | Halt submission. Wait 3 seconds. Check status via `GET` or retry recovery with `K1`. |
| **D. Completed Replay** | HTTP `200` / `201` / `202` on replay of `K1` | `idempotency_records` status is `COMPLETED` | **YES** (Already completed). | Deserialize cached `PaymentResponse`. Transition to `/payments/[id]`. |
| **E. FAILED Idempotency Record** | HTTP `400` with `"Previous request failed. Please use a new idempotency key"` | `idempotency_records` permanently in `FAILED` | **NO**. | Inform user that previous attempt failed and was aborted by server. Prompt to start a new payment with a fresh key. |

---

## 7. Ambiguous Outcome Recovery Design

### The Problem Scenario
1. Client submits payment with `Idempotency-Key: K1`.
2. Backend receives request, contacts payment gateway, captures funds, and initiates ledger posting.
3. A network glitch, client disconnect, browser timeout, or gateway delay occurs before the HTTP response reaches the browser.
4. The client state is **AMBIGUOUS**: did the payment settle, fail, or remain in flight?

### Authoritative Recovery Decision Tree

```text
POST K1 + exact frozen payload
        │
        ├── HTTP response received
        │       │
        │       ├── PaymentResponse contains paymentId
        │       │       ├── Status is SETTLED -> Nav to /payments/{id}
        │       │       └── Status is PENDING_RECONCILIATION -> Enter Polling Coordinator
        │       │
        │       ├── Status is 409 CONCURRENT -> Wait ~3s, retry status recovery
        │       │
        │       └── Status is 400 / 422 / 500 (Terminal Error)
        │               -> Display authoritative error; prompt new attempt with new key
        │
        └── NO HTTP response received (Timeout / Network Drop / Fetch Abort)
                │
                ├── paymentId independently known?
                │       └── (YES) -> GET /api/v1/payments/{paymentId}
                │
                └── paymentId unknown
                        └── (NO) -> Replay POST with SAME K1 + SAME frozen payload
                                      │
                                      ├── 201/202 Success -> Transition to /payments/{id}
                                      ├── 409 Concurrent -> Wait ~3s, retry recovery
                                      ├── 400 Failed Record -> Record aborted; allow new key
                                      └── Offline -> Offer manual "Retry Status Check" (K1)
```

### Absolute Invariant:
**AMBIGUOUS OUTCOME => NEVER GENERATE K2.**  
A new idempotency key is permitted only after the prior attempt has become an authoritative terminal failure and the user intentionally starts a NEW payment attempt.

---

## 8. Payment Method Token Architecture

The backend contract requires `paymentMethodToken: string`.

### Dev / Sandbox Token Abstraction
Until a PCI-compliant hosted iframe or tokenizer (e.g. Stripe Elements / tokenization service) is integrated in a future milestone:
1. **Token Abstraction Layer**:
   Create `src/features/payments/tokens/payment-method-tokens.ts` defining standard development tokens:
   - `tok_visa`: Standard successful test card (Simulates `SETTLED`).
   - `tok_decline`: Declining test card (Simulates `PROVIDER_DECLINED` / HTTP 400).
   - `tok_timeout`: Simulates provider timeout (Simulates HTTP 202 `PENDING_RECONCILIATION`).
   - `tok_custom`: Allows manual token input for testing backend mock scenarios.
2. **Strict Security Boundaries**:
   - The token selector must be **explicitly labeled** in the UI as `"Development / Sandbox Test Payment Method"`.
   - **Never collect PAN (card number), CVV, or expiration date**: No raw card inputs exist in the DOM.
   - **Never store credentials**: Tokens are never persisted to `localStorage` or `sessionStorage`.
   - **Isolate behind interface**: Define `PaymentMethodSelector` component that can be swapped for a production tokenization SDK without touching payment form logic.

---

## 9. Financial Money Parsing & Minor Units

### Deterministic BigInt Parsing Algorithm
To prevent IEEE-754 binary floating-point rounding errors (e.g. `19.99 * 100 = 1998.9999999999998`), parsing is implemented strictly using string splitting and `BigInt` integer arithmetic:

```typescript
export interface MoneyParseResult {
  minor: number;
  minorBigInt: bigint;
  error?: string;
}

export function parseDecimalToMinor(input: string, currencyPrecision = 2): MoneyParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { minor: 0, minorBigInt: 0n, error: 'Amount is required' };
  }

  // Strict regex: 1 or more digits, optional decimal point followed by 1 or 2 digits
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    return { minor: 0, minorBigInt: 0n, error: 'Invalid amount format. Use e.g. 10.50' };
  }

  const [wholeStr, fracStr = ''] = trimmed.split('.');
  
  // Pad fractional string to exact currency precision (e.g. "5" -> "50", "" -> "00")
  const paddedFrac = fracStr.padEnd(currencyPrecision, '0').slice(0, currencyPrecision);

  const wholeBigInt = BigInt(wholeStr);
  const fracBigInt = BigInt(paddedFrac);
  const multiplier = 10n ** BigInt(currencyPrecision);

  const minorBigInt = wholeBigInt * multiplier + fracBigInt;

  // Validation: Strictly positive minor unit (backend @Min(1))
  if (minorBigInt < 1n) {
    return { minor: 0, minorBigInt: 0n, error: 'Amount must be at least 0.01' };
  }

  // Representability: Safe conversion to JavaScript Number (Number.MAX_SAFE_INTEGER is 9,007,199,254,740,991)
  if (minorBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
    return { minor: 0, minorBigInt: 0n, error: 'Amount exceeds JavaScript safe integer limit' };
  }

  return {
    minor: Number(minorBigInt),
    minorBigInt,
  };
}
```

### Currency Precision Scope for Phase F3
- **Payment-entry precision is limited strictly to 2 decimal places**.
- **USD is the default product currency**: In F3, the customer payment interface defaults to `"USD"` as a **FRONTEND PRODUCT SCOPE CONSTRAINT**.
- **Validation**: Accepts any 3-letter uppercase code matching `/^[A-Z]{3}$/` where manual input/selection is exposed.
- **No Currency Inference**: The frontend must **NOT infer minor-unit precision from the currency code** (no ad-hoc guesswork such as 0 decimals for JPY or 3 for BHD). All F3 monetary conversions operate strictly on standard 2-decimal minor units (cents / 100). Future support for non-2-decimal currencies requires an authoritative currency configuration metadata API from the backend.

### Deterministic Parsing Behavior Table

| User Input | Parsed `minorBigInt` | Parsed `minor` (JS number) | Status | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| `"10"` | `1000n` | `1000` | Valid | Whole integer padded to minor cents. |
| `"10.5"` | `1050n` | `1050` | Valid | Fractional digit `"5"` padded to `"50"`. |
| `"10.50"` | `1050n` | `1050` | Valid | Exact cents. |
| `"0"` or `"0.00"` | `0n` | `0` | Invalid | Rejects `<= 0` (backend requires `@Min(1)`). |
| `"-5.00"` | `0n` | `0` | Invalid | Regex rejects negative sign. |
| `"10.555"` | `0n` | `0` | Invalid | Regex rejects >2 decimal places. |
| `"abc"` | `0n` | `0` | Invalid | Regex rejects non-digits. |
| `"$10.50"` | `0n` | `0` | Invalid | Currency symbols prohibited in raw numeric field. |

### Clear Boundary: Client UX vs Backend Validation
- **Client UX Validation**:
  - Validates numeric string formatting with max 2 decimal places.
  - Validates currency format: matches `^[A-Z]{3}$`.
  - Ensures positivity (`minor >= 1`).
  - Ensures JavaScript integer representability (`minor <= Number.MAX_SAFE_INTEGER`).
  - Formats user input into clean minor units.
- **Backend Authoritative Validation**:
  - Enforces currency matching across accounts (`payerAccount.currency == payeeAccount.currency == payment.currency`).
  - Enforces account active status (`ACCOUNT_FROZEN` check).
  - Enforces ledger balance availability (`INSUFFICIENT_FUNDS`).
  - Enforces anti-self-payment rule (`payerAccountId != payeeAccountId`).

---

## 10. Form Architecture

### Component: `PaymentForm` (`src/features/payments/components/payment-form.tsx`)

#### Fields & Semantic Configuration
1. **Payee Account ID (`payeeAccountId`)**:
   - Element: `<input type="text">`
   - Label: `"Payee Account ID (UUID)"`
   - Description: `"The destination account UUID for this payment."`
   - Validation: Strict RFC 4122 UUID regex (`/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`).
   - Accessible error association via `aria-describedby` and `aria-invalid`.
2. **Amount (`amountDecimal`)**:
   - Element: `<input type="text" inputMode="decimal">`
   - Label: `"Amount"`
   - Description: `"Enter payment amount (e.g. 25.00)."`
   - Validation: Deterministic parsing via `parseDecimalToMinor`.
3. **Currency (`currency`)**:
   - Element: `<select>` or read-only input.
   - Label: `"Currency"`
   - Description: `"Operating currency for settlement."`
   - Validation: Matches `/^[A-Z]{3}$/`. Defaulted to `"USD"` as a frontend product scope constraint.
4. **Payment Method (`paymentMethodToken`)**:
   - Element: Custom accessible radio group / selector (`PaymentMethodSelector`).
   - Label: `"Payment Method (Sandbox Token)"`
   - Description: `"Select test card token for transaction simulation."`
   - Options: `tok_visa` (Success), `tok_decline` (Decline), `tok_timeout` (Pending Reconciliation).

#### Immediate Double-Submit Disabling
The moment the confirmation modal triggers submission, `isSubmitting` is set to `true`:
- Submit button is disabled (`disabled={isSubmitting}`).
- Cancel button is disabled.
- All form inputs are disabled (`disabled={isSubmitting}`).
- Prevents rapid double-clicks from generating multiple requests before the browser initiates network transfer.

---

## 11. Confirmation UX

Before financial mutation submission, an accessible confirmation dialog (`PaymentConfirmDialog`) appears.

### Invariants:
1. **Authoritative Values Only**: Displays strictly what the user is submitting:
   - Payee Account ID
   - Amount formatted via `formatMoney(amountMinor, currency)`
   - Currency
   - Selected Payment Method Token
2. **Payload Freezing**: When the dialog opens, the payload values are captured in an immutable confirmation snapshot.
3. **Zero Fabricated Balances**: Does **not** display "remaining balance" or "account balance" (balance data does not exist in `AccountResponse`).
4. **No Settlement Guarantees**: Does not say "Your payment is complete"; says "Review & Confirm Payment".
5. **Accessibility (WCAG 2.1 AA)**:
   - Accessible modal dialog using `role="dialog"`, `aria-modal="true"`, `aria-labelledby="confirm-dialog-title"`.
   - **Focus Trap**: Traps keyboard Tab focus within the dialog while open.
   - **Escape Key**: Closes dialog and returns focus to "Review Payment" button.
   - Confirmation button initiates key generation and mutation; Cancel button closes dialog without submitting.

---

## 12. Payment Detail UX (`/payments/[id]`)

Route: `src/app/(customer)/payments/[id]/page.tsx`  
Authoritative State: Loaded strictly via `GET /api/v1/payments/{id}`.

### Displayed Information:
- **Header**: Payment ID (UUID) with copy button, and `PaymentStatusBadge`.
- **Primary Amount Card**: Formatted `amountMinor` and `currency`.
- **Reconciliation Banner**: Displayed prominently if status is `PENDING_RECONCILIATION`.
- **Payment Metadata Grid**:
  - `Status`: Authoritative status string.
  - `Payer Account ID`: Resolved payer operational account.
  - `Payee Account ID`: Destination account UUID.
  - `Fee Amount`: Formatted `feeAmountMinor`.
  - `Provider Reference`: Displayed if present (masked if sensitive, e.g. `ref_sim_...`).
  - `Created At`: Localized timestamp from ISO UTC.
  - `Correlation ID`: `X-Correlation-ID` for audit / support.
  - `Idempotency Key`: Submission key associated with the transaction.
- **Actions**:
  - "Make Another Payment" (Navigates to `/payments/new`).
  - "Back to Dashboard" (Navigates to `/dashboard`).
  - "Check Status" (Triggers manual authoritative `GET /api/v1/payments/{id}`).

### IDOR Protection:
If the user attempts to load a payment they do not own, the backend returns HTTP `404 Not Found`. The page renders a safe masked error state:
*"Payment Not Found. The requested payment could not be found or you do not have permission to view it."*

---

## 13. Bounded Polling Architecture & Coordinator Design

When a payment returns HTTP `202 ACCEPTED` with status `PENDING_RECONCILIATION`, the frontend activates controlled, bounded status polling.

### Explicit Deterministic Polling Coordinator Design
To prevent unstable React re-render cycles and ensure clean request cancellation, the coordinator is managed via `useRef` handles and active `AbortController` cancellation:

```typescript
export function usePayment(paymentId: string | undefined, options?: { enablePolling?: boolean }) {
  const queryClient = useQueryClient();
  const pollAttemptRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isPollingExhausted, setIsPollingExhausted] = useState(false);

  const query = useQuery<PaymentResponse, ApiErrorResponse>({
    queryKey: ['payments', 'detail', paymentId],
    queryFn: ({ signal }) => getPayment(paymentId!, signal),
    enabled: Boolean(paymentId),
    staleTime: 10_000,
    gcTime: 5 * 60_000,
  });

  const status = query.data?.status;
  const isTerminal = status === 'SETTLED' || status === 'DECLINED' || status === 'FAILED' || status === 'EXPIRED';

  // Reset coordinator if target paymentId changes
  useEffect(() => {
    pollAttemptRef.current = 0;
    setIsPollingExhausted(false);
  }, [paymentId]);

  // Polling Coordinator State Machine with active AbortController wiring
  useEffect(() => {
    // Stop condition 1: Polling disabled, unmounted, or no status
    if (!options?.enablePolling || !paymentId || !status) {
      return;
    }

    // Stop condition 2: Terminal status reached
    if (isTerminal) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    // Active polling condition: PENDING_RECONCILIATION
    if (status === 'PENDING_RECONCILIATION') {
      // Stop condition 3: Reached maximum attempts (10 polls ~ 30s)
      if (pollAttemptRef.current >= 10) {
        setIsPollingExhausted(true);
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      // Schedule next poll after ~3,000ms
      timerRef.current = setTimeout(async () => {
        pollAttemptRef.current += 1;
        abortControllerRef.current = new AbortController();
        try {
          const freshData = await getPayment(paymentId, abortControllerRef.current.signal);
          queryClient.setQueryData(['payments', 'detail', paymentId], freshData);
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') {
            return;
          }
          queryClient.invalidateQueries({ queryKey: ['payments', 'detail', paymentId] });
        }
      }, 3000);
    }

    // Stop conditions: Cleanup on unmount, route navigation, or dependency change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [status, isTerminal, paymentId, options?.enablePolling, queryClient]);

  const checkStatusManually = useCallback(async () => {
    return query.refetch();
  }, [query]);

  return {
    ...query,
    isPollingActive: options?.enablePolling && status === 'PENDING_RECONCILIATION' && !isPollingExhausted && !isTerminal,
    isPollingExhausted,
    checkStatusManually,
  };
}
```

### Polling Safeguards Summary:
1. **Interval**: Approximately 3,000 ms between poll executions.
2. **Maximum Attempts**: Exactly 10 polling attempts (total automated duration ~30 seconds).
3. **Immediate Stop Conditions**:
   - Immediately stops when payment status reaches `SETTLED`, `DECLINED`, `FAILED`, or `EXPIRED`.
   - Immediately cancels on component unmount via React cleanup effect and `abort()`.
   - Immediately cancels on browser/route navigation.
   - Immediately cancels on AbortController abort.
   - Stops when `pollAttemptRef.current >= 10`.
4. **Expiry UX**: If 10 attempts elapse without a terminal resolution:
   - Automatic background polling stops completely.
   - UI retains `PaymentReconciliationBanner` with status `Reconciliation In Progress`.
   - UI displays message: *"Payment confirmation is still pending. Reconciling with financial network."*
   - UI provides an explicit *"Check Status"* button enabling the user to manually trigger an authoritative `GET /api/v1/payments/{id}`.

---

## 14. API Architecture

File: `src/features/payments/api/payments-api.ts`

### Implemented Functions:

```typescript
export interface CreatePaymentParams {
  request: PaymentCreateRequest;
  idempotencyKey: string;
  correlationId?: string;
}

/**
 * Submits a new payment to the frozen backend.
 * Enforces mandatory Idempotency-Key and Bearer authorization.
 */
export async function createPayment(params: CreatePaymentParams): Promise<PaymentResponse> {
  const { request, idempotencyKey, correlationId = generateCorrelationId() } = params;
  
  return apiFetch<PaymentResponse>('/api/v1/payments', {
    method: 'POST',
    headers: {
      'Idempotency-Key': idempotencyKey,
      'X-Correlation-ID': correlationId,
    },
    body: JSON.stringify(request),
  });
}

/**
 * Retrieves authoritative payment state by ID.
 * Supports explicit AbortSignal for polling cancellation and resource cleanup.
 */
export async function getPayment(paymentId: string, signal?: AbortSignal): Promise<PaymentResponse> {
  return apiFetch<PaymentResponse>(`/api/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    signal,
  });
}
```

### Invariants:
- All calls pass through `apiFetch` (`src/lib/api-client.ts`), ensuring automatic Bearer token injection, signal propagation, and RFC 7807 error parsing (`ApiErrorResponse`).
- Zero ad-hoc `fetch()` calls scattered across UI components.

---

## 15. Query / Mutation Architecture (TanStack Query)

### Conceptual Invariant
**TanStack Query is strictly a client-side server-state cache. It is NOT financial authority.**

### Hooks Implementation:

#### 1. `useCreatePayment` (`src/features/payments/hooks/use-create-payment.ts`)
- Implements `useMutation`:
  ```typescript
  export function useCreatePayment() {
    return useMutation<PaymentResponse, ApiErrorResponse, CreatePaymentParams>({
      mutationFn: createPayment,
      retry: false, // NEVER automatically retry mutations
    });
  }
  ```
- **Automatic Retries**: Strictly disabled (`retry: false`).

#### 2. `usePayment` (`src/features/payments/hooks/use-payment.ts`)
- Implements `useQuery` integrated with the deterministic polling coordinator and `AbortController` cancellation described in Section 13.

---

## 16. Security Plan

| Threat Vector | Mitigation Strategy |
| :--- | :--- |
| **Duplicate Payment Submission** | UI submit button disabled immediately on click (`isSubmitting = true`). Idempotency key bound to attempt. |
| **Idempotency Key Collisions** | UUID v4 generated via `crypto.randomUUID()`. Backend enforces 24h uniqueness per `payerId:PAYMENT_CREATE`. |
| **Token / Secret Leakage** | `paymentMethodToken` is never placed in URLs, query strings, local storage, or browser session storage. |
| **Telemetry Leakage** | `logger.ts` redacts payment method tokens, account credentials, and authorization headers before output. |
| **Anti-IDOR (Insecure Direct Object Reference)** | Backend verifies caller ownership; returns HTTP `404 Not Found` for unauthorized `GET /api/v1/payments/{id}` to prevent account probing. UI preserves this masking. |
| **Payer Account Spoofing** | Frontend does **not** allow specifying payer account. The backend resolves the payer account from the authenticated user's database records. |
| **Floating-Point Financial Drift** | Deterministic fixed-point string parsing directly into integer minor units using `BigInt`. IEEE-754 floats forbidden. |
| **XSS & Injection** | Payee Account ID validated against strict UUID regex; currency validated against `^[A-Z]{3}$`. React DOM auto-escaping. |

---

## 17. Accessibility Plan (WCAG 2.1 AA)

- **Semantic Forms**: Native `<form>`, `<fieldset>`, `<legend>`, `<label>`.
- **Explicit Label Associations**: Every input has an `id` matching its `<label htmlFor="...">`.
- **Aria Attributes**:
  - `aria-describedby` links inputs to help text and error messages.
  - `aria-invalid="true"` set dynamically when validation fails.
  - `aria-busy="true"` on submit button during processing.
- **Accessible Modal Dialog**:
  - `PaymentConfirmDialog` implements focus trapping, Escape key listener, and `aria-modal="true"`. Focus returns to triggering button upon closure.
- **Live Regions**:
  - Submission state changes and polling updates announced via `aria-live="polite"`.
  - Errors announced via `role="alert"` and `aria-live="assertive"`.
- **Color Independence**:
  - Status badges use icons (CheckCircle, Clock, AlertTriangle, XCircle) and distinct text labels in addition to colors.
- **Keyboard Navigation & Touch Targets**:
  - All interactive buttons and inputs meet the 44x44px touch target minimum and display visible high-contrast focus rings.

---

## 18. Layered Test Plan

### 1. Unit Tests (`tests/unit/`)
- `tests/unit/payment-types.test.ts`: Request/response types, Zod schemas, default values, currency regex `^[A-Z]{3}$`.
- `tests/unit/money-parser.test.ts`: Deterministic BigInt parsing across all edge cases (10, 10.5, 10.50, 0, negatives, excessive decimals, non-numeric, JavaScript integer safety bounds).
- `tests/unit/payment-state-machine.test.ts`: State mapping function, badge variant resolution, unknown state fallback.
- `tests/unit/idempotency-key.test.ts`: UUID v4 format verification, key generation uniqueness, immutability during replay.

### 2. Component Tests (`tests/components/`)
- `tests/components/payment-form.test.tsx`: Input validation, immediate submit disabling during submission, error display, confirm dialog trigger.
- `tests/components/payment-confirm-dialog.test.tsx`: Displays exact request values, focus trap, Escape key handling, confirm action.
- `tests/components/payment-status-badge.test.tsx`: Correct badge variant, icon, and text for all states (`SETTLED`, `PENDING_RECONCILIATION`, `DECLINED`, `FAILED`, `UNKNOWN`).
- `tests/components/payment-status-card.test.tsx`: Detail rendering, metadata grid, copy ID button, correlation ID display.
- `tests/components/payment-reconciliation-banner.test.tsx`: Warning display, bounded polling indicator, manual "Check Status" button.

### 3. Integration Tests (`tests/integration/`)
- `tests/integration/payments-api.test.ts`:
  - `createPayment`: Injects `Idempotency-Key`, `X-Correlation-ID`, and `Authorization: Bearer`.
  - Handles `201 CREATED` (`SETTLED`).
  - Handles `202 ACCEPTED` (`PENDING_RECONCILIATION`).
  - Handles `400 BAD_REQUEST` (`INVALID_PAYLOAD`, `PROVIDER_DECLINED`).
  - Handles `409 CONFLICT` (`IDEMPOTENCY_CONCURRENT_REQUEST`, `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`).
  - Handles `422 UNPROCESSABLE_ENTITY` (`INSUFFICIENT_FUNDS`, `ACCOUNT_FROZEN`).
  - `getPayment`: Retrieves payment by ID, handles `404 Not Found`, passes `AbortSignal`.
- `tests/integration/use-payment-polling.test.ts`:
  - Verifies deterministic polling coordinator terminates at exactly 10 attempts.
  - Verifies polling terminates immediately on terminal state (`SETTLED`, `DECLINED`, `FAILED`).
  - Verifies `AbortController.abort()` is called on unmount and navigation.
  - Verifies manual `checkStatusManually` executes single query refetch.

### 4. Accessibility Tests (`tests/accessibility/`)
- `tests/accessibility/payment-form-a11y.test.tsx`: Form label associations, error announcements, contrast, landmark structure.
- `tests/accessibility/payment-dialog-a11y.test.tsx`: Focus trap, modal role, keyboard escape.
- `tests/accessibility/payment-detail-a11y.test.tsx`: Detail page landmarks, status announcements.

### 5. Playwright E2E Tests (`tests/e2e/payments.spec.ts`)
- **Flow 1: Successful Payment**:
  - Authenticated customer navigates to `/payments/new`.
  - Fills payee UUID, amount `$25.00`, selects `tok_visa`.
  - Clicks "Review Payment", verifies confirmation dialog details.
  - Submits payment, receives `SETTLED`, redirected to `/payments/[id]`.
- **Flow 2: Validation Failure**:
  - Submits invalid UUID and zero amount; verifies client-side error alerts and button remaining disabled.
- **Flow 3: Pending Reconciliation & Bounded Polling**:
  - Submits payment with `tok_timeout`; receives HTTP `202 PENDING_RECONCILIATION`.
  - Verifies reconciliation banner is shown and bounded polling executes (max 10 attempts).
- **Flow 4: Unauthorized Access Protection**:
  - Unauthenticated visitor attempting to access `/payments/new` or `/payments/[id]` is redirected to `/login`.

---

## 19. Performance Budget & Measurement Plan

### Baseline Record (From Frozen Phase F2)
- Customer dashboard First Load JS: **131 kB** (Route size: 3.69 kB).
- Shared JS: **103 kB**.

### Phase F3 Performance Budgets
- `/payments/new` First Load JS: **< 145 kB** (Incremental JS: < 14 kB).
- `/payments/[id]` First Load JS: **< 145 kB** (Incremental JS: < 14 kB).
- Component Render Time: Form interaction to render < 16ms (60 FPS).
- Polling Request Restraint: Maximum 10 polling requests per `PENDING_RECONCILIATION` session, with 3-second spacing.

### Post-Implementation Measurement
Following F3 implementation, run `npm run build` to verify route sizes and First Load JS against these budgets.

---

## 20. Observability Plan

We will reuse the existing telemetry utility (`src/lib/telemetry.ts` and `logger.ts`):
- **Events Logged**:
  - `payment_form_mounted`: Track form initialization (sanitized).
  - `payment_submit_attempt`: Logs `payeeAccountId`, `amountMinor`, `currency`, `idempotencyKey`, and `correlationId`.
  - `payment_submit_outcome`: Logs HTTP status code, resulting payment status, and duration in milliseconds.
  - `payment_polling_attempt`: Logs poll iteration count and current status.
- **Strict Redaction Rules**:
  - `paymentMethodToken` is **NEVER** logged.
  - Authorization tokens (`accessToken`, `refreshToken`) are **NEVER** logged.
  - Error messages containing internal stack traces are sanitized before logging.

---

## 21. File-by-File Plan

### Files to be CREATED

| File Path | Purpose | Dependencies | Phase | Test Coverage |
| :--- | :--- | :--- | :--- | :--- |
| `src/types/payment.ts` | TypeScript interfaces for `PaymentCreateRequest`, `PaymentResponse`, `PaymentStatus`, error DTOs | None | F3 | `payment-types.test.ts` |
| `src/features/payments/utils/money-parser.ts` | Deterministic BigInt string-to-minor parsing | None | F3 | `money-parser.test.ts` |
| `src/features/payments/tokens/payment-method-tokens.ts` | Test sandbox token definitions (`tok_visa`, `tok_decline`, `tok_timeout`) | None | F3 | `payment-types.test.ts` |
| `src/features/payments/api/payments-api.ts` | API client functions (`createPayment`, `getPayment`) | `apiFetch`, `src/types/payment.ts` | F3 | `payments-api.test.ts` |
| `src/features/payments/hooks/use-create-payment.ts` | TanStack Query mutation hook for payment creation | `createPayment`, TanStack Query | F3 | `payment-form.test.tsx` |
| `src/features/payments/hooks/use-payment.ts` | TanStack Query query hook with deterministic polling coordinator & AbortController wiring | `getPayment`, TanStack Query | F3 | `payment-status-card.test.tsx`, `use-payment-polling.test.ts` |
| `src/features/payments/components/payment-form.tsx` | Main payment input form with pre-submission validation | `useCreatePayment`, `money-parser` | F3 | `payment-form.test.tsx` |
| `src/features/payments/components/payment-confirm-dialog.tsx` | Accessible pre-submission review modal | Accessible focus trap, Lucide icons | F3 | `payment-confirm-dialog.test.tsx` |
| `src/features/payments/components/payment-status-badge.tsx` | Visual and accessible status badge for payment states | `PaymentStatus` | F3 | `payment-status-badge.test.tsx` |
| `src/features/payments/components/payment-status-card.tsx` | Authoritative payment detail card and metadata grid | `PaymentResponse` | F3 | `payment-status-card.test.tsx` |
| `src/features/payments/components/payment-reconciliation-banner.tsx`| Alert banner for `PENDING_RECONCILIATION` with "Check Status" | Lucide icons | F3 | `payment-reconciliation-banner.test.tsx` |
| `src/features/payments/components/payment-error-state.tsx` | RFC 7807 error presentation for payment failures | `ApiErrorResponse` | F3 | `payment-form.test.tsx` |
| `src/app/(customer)/payments/new/page.tsx` | Customer route for initiating new payment | `PaymentForm`, `ProtectedRoute` | F3 | Playwright E2E |
| `src/app/(customer)/payments/[id]/page.tsx` | Customer route for viewing authoritative payment detail | `usePayment`, `PaymentStatusCard` | F3 | Playwright E2E |
| `docs/payments/payment-architecture.md` | Architecture documentation for payment lifecycle and idempotency | None | F3 | Document audit |

### Files to be MODIFIED

| File Path | Modification Purpose | Rationale | Phase Ownership |
| :--- | :--- | :--- | :--- |
| `src/components/layout/customer-sidebar.tsx` | Add navigation link for "Make Payment" (`/payments/new`) | Enables customers to reach payment creation form | F2 shell (link addition approved in F3) |
| `docs/phases/PHASE-F3.md` | Update phase status and task checklist | Documentation tracking | F3 |

### Files NOT TOUCHED (Explicitly Protected)
- `src/features/auth/*`: Authentication, token storage, and session mutex (F1 frozen).
- `src/features/accounts/*`: Account card, account lookup form, account status badge (F2 frozen).
- `src/lib/api-client.ts`: Core fetch client (F0/F1 frozen).
- `src/lib/token-storage.ts`: In-memory token storage (F1 frozen).
- `src/app/(customer)/dashboard/page.tsx`: Customer dashboard (F2 frozen).
- `src/app/(customer)/accounts/[id]/page.tsx`: Account detail page (F2 frozen).
- `src/app/(auth)/*`: Login and registration routes (F1 frozen).
- Any backend repository files in `payment-ledger-platform-complete-agent-kit`.

---

## 22. Implementation Sequence

The implementation will follow a strict, dependency-ordered 17-step sequence:

1. **Step 1: Types & DTO Schemas**: Create `src/types/payment.ts`.
2. **Step 2: Money Utilities**: Implement `src/features/payments/utils/money-parser.ts` with BigInt string-to-minor parsing.
3. **Step 3: Sandbox Tokens**: Implement `src/features/payments/tokens/payment-method-tokens.ts`.
4. **Step 4: API Client**: Create `src/features/payments/api/payments-api.ts` with `createPayment` and `getPayment` (with AbortSignal support).
5. **Step 5: Query & Mutation Hooks**: Implement `useCreatePayment` and `usePayment` (with deterministic polling coordinator and cancellation).
6. **Step 6: Status & Badge Components**: Implement `PaymentStatusBadge` and `PaymentReconciliationBanner`.
7. **Step 7: Detail & Card Components**: Implement `PaymentStatusCard` and `PaymentErrorState`.
8. **Step 8: Confirmation Dialog**: Implement `PaymentConfirmDialog` with payload freezing and focus trap.
9. **Step 9: Payment Form Component**: Implement `PaymentForm` with immediate double-submit protection.
10. **Step 10: App Router Routes**: Create `src/app/(customer)/payments/new/page.tsx` and `src/app/(customer)/payments/[id]/page.tsx`.
11. **Step 11: Navigation Integration**: Add "Make Payment" link to `customer-sidebar.tsx`.
12. **Step 12: Unit & Component Tests**: Write and execute Vitest suites.
13. **Step 13: Integration Tests**: Write and execute API client, polling coordinator, and error handling tests.
14. **Step 14: Accessibility Tests**: Run a11y automated audits on forms, dialogs, and status badges.
15. **Step 15: Playwright E2E Tests**: Implement and execute end-to-end payment flows.
16. **Step 16: Verification Gates**: Run `typecheck`, `lint`, `test`, `build`, `e2e`, and security scripts.
17. **Step 17: Scope Audit & Documentation**: Verify zero F4+ contamination and produce `PHASE-F3-FINAL.md`.

---

## 23. Verification Gates

All of the following gates must pass with 0 warnings and 0 errors prior to declaring Phase F3 complete:

1. **TypeScript Typecheck**:
   ```powershell
   npm run typecheck
   ```
   *Requirement*: 0 errors.
2. **ESLint**:
   ```powershell
   npm run lint
   ```
   *Requirement*: 0 warnings, 0 errors.
3. **Vitest Test Suite**:
   ```powershell
   npm run test
   ```
   *Requirement*: 100% pass across all unit, component, integration, and a11y tests.
4. **Next.js Production Build**:
   ```powershell
   npm run build
   ```
   *Requirement*: Clean build; route sizes within performance budgets.
5. **Playwright E2E**:
   ```powershell
   npx playwright test
   ```
   *Requirement*: All E2E test flows pass.
6. **Repository Verification Script**:
   ```powershell
   .\scripts\verification\verify-repo.ps1
   ```
   *Requirement*: Exit code 0.
7. **Secret Detection Script**:
   ```powershell
   .\scripts\security\check-secrets.ps1
   ```
   *Requirement*: 0 potential secrets found.
8. **Environment Verification Script**:
   ```powershell
   .\scripts\verification\verify-env.ps1
   ```
   *Requirement*: Exit code 0.

---

## 24. Strict Scope Boundary

To ensure complete adherence to phase boundaries, Phase F3 **strictly excludes**:
- ❌ **Payment Listing / History**: No `GET /api/v1/payments` list view (admin-only backend; customer transaction history arrives in Phase F4).
- ❌ **Ledger Exploration**: No double-entry ledger journals, balance entries, or journal entry viewers (Phase F4).
- ❌ **Refunds & Reversals**: No refund initiation or reversal workflows (Phase F5).
- ❌ **Payouts**: No external payout mechanisms (Phase F5).
- ❌ **Reconciliation Case Management**: No manual case investigation or discrepancy resolution UI (Phase F6).
- ❌ **Admin Controls**: No payment status overrides, account freeze/unfreeze toggles, or platform configuration (Phase F7).
- ❌ **Balance Displays or Calculations**: Zero balance mutation, balance inference, or synthetic math in the frontend.

---

## 25. Rollback & Failure Handling

If a deployment or integration failure occurs during Phase F3:
1. **Idempotency Conflict (409)**: If the client encounters `IDEMPOTENCY_CONCURRENT_REQUEST`, the UI halts new submissions and initiates status query recovery on the existing key. If `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH` is returned, the UI alerts the user, clears the mismatched draft, generates a fresh idempotency key, and allows resubmission.
2. **Ambiguous Timeout Handling**: If the network connection drops before receiving a response, the client avoids re-generating the key, preserves the draft attempt, and enters bounded polling on `pollUrl` or re-attempts submission with the exact same key.
3. **Gateway Timeout / DB Settlement Delay (202)**: The UI enters `PENDING_RECONCILIATION` state, begins bounded polling (max 10 attempts at 3s intervals), and presents an explicit manual refresh option if polling times out.
4. **Code Rollback**: Since F3 routes are namespaced under `/payments/*` and F3 components reside in `src/features/payments/*`, rolling back F3 involves removing the `/payments` routes and sidebar link, restoring the repository to the frozen F2 state with zero data corruption.

---

## 26. Documentation Plan

During and upon completion of Phase F3, the following documentation will be created or updated:
1. `docs/phase-reports/PHASE-F3-IMPLEMENTATION-PLAN.md` (This document).
2. `docs/payments/payment-architecture.md`: Architectural specification of the payment submission flow, state machine, and idempotency recovery.
3. `docs/phases/PHASE-F3.md`: Status update marking phase tasks as completed.
4. `docs/phase-reports/PHASE-F3-FINAL.md`: Phase F3 final completion report, containing test execution summaries, bundle size measurements, security audit results, and verification gate logs.

---

## Final Planning Status

```text
================================================================================
STATUS: IMPLEMENTATION_PLAN_READY
FINAL F3 PLAN AUDIT: APPROVED FOR IMPLEMENTATION
ALL REMEDIATION ITEMS AND CLEANUP ACTIONS ARE FULLY INCORPORATED.
DO NOT PROCEED TO IMPLEMENTATION WITHOUT EXPLICIT USER APPROVAL.
================================================================================
```
