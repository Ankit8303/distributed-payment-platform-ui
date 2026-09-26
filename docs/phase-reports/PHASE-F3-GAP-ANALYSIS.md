# Phase F3 Gap Analysis — Payment Creation, Idempotency & Payment Lifecycle

**Phase**: F3 — Payment Creation, Idempotency & Payment Lifecycle  
**Date**: 2026-09-25  
**Author**: Antigravity Engineering Agent  
**Status**: GAP_ANALYSIS_COMPLETE  

---

## 1. Executive Summary

Phase F3 introduces **Payment Creation, Idempotency-Aware Submission, and Payment Lifecycle Presentation** for the Distributed Payment & Ledger Platform UI.

Phase F0 established the project foundation, Phase F1 established authentication and session security, and Phase F2 established customer account dashboard shell and status presentation. All preceding phases (F0, F1, F2) are officially **FROZEN**.

The objective of Phase F3 is to enable authenticated customers to submit payments safely and observe their lifecycle states against the actual frozen Spring Boot backend (`payment-ledger-platform-complete-agent-kit`), while upholding the following non-negotiable architectural invariants:
1. **Financial Authority**: PostgreSQL and the Spring Boot backend remain the sole authoritative source of financial truth. The browser is **never** a source of financial truth.
2. **Contract Fidelity**: Only verified, existing backend endpoints (`POST /api/v1/payments` and `GET /api/v1/payments/{id}`) are used. Zero speculative endpoints are created.
3. **Idempotency Integrity**: Payments are financial mutations. Submission must be strictly idempotency-aware. Duplicate submits, concurrent submissions, and ambiguous network failures must be handled without duplicate charges.
4. **Lifecycle Semantics**: The backend payment state machine (`CREATED`, `AUTHORIZING`, `AUTHORIZED`, `CAPTURING`, `SETTLED`, `DECLINED`, `FAILED`, `EXPIRED`, `PENDING_RECONCILIATION`) must be represented faithfully. `PENDING_RECONCILIATION` must **never** be presented as a simple failure.

This Gap Analysis provides a forensic audit of the frozen backend payment engine, documents the true API contract, details the idempotency and error taxonomy, analyzes ambiguous mutation handling, and establishes the strict boundaries for Phase F3.

---

## 2. F3 Objective

The scope of Phase F3 is restricted to:
- Payment creation interface (amount in minor units, currency, payee account ID, payment method token).
- Client-side pre-submission validation.
- Idempotency key generation and lifecycle management.
- Integration with `POST /api/v1/payments` and `GET /api/v1/payments/{id}`.
- Safe handling of ambiguous network outcomes.
- Authoritative payment status presentation and polling when in `PENDING_RECONCILIATION`.
- Layered tests, accessibility (WCAG 2.1 AA), security verification, and performance budgeting.

**Explicitly Out of Scope for Phase F3**:
- Customer transaction history / payment list (`GET /api/v1/payments` is admin-only; Phase F4).
- Double-entry ledger journal / balance entries (Phase F4).
- Refund requests / reversals (Phase F5).
- Payout workflows (Phase F5).
- Reconciliation case management (Phase F6).
- Admin payment investigation or overrides (Phase F7).
- Balance mutation or synthetic balance calculation.

---

## 3. F0/F1/F2 Baseline Audit

The frontend repository baseline was inspected to confirm readiness:
- **Phase F0**: Strict TypeScript, Tailwind CSS, TanStack Query client-side server-state cache, Zod validation, Vitest, Playwright, and verification scripts are frozen and intact.
- **Phase F1**: Stateless JWT handling, in-memory access token isolation, tab-scoped refresh storage with single-flight mutex, and `ProtectedRoute` are frozen and reusable without modification.
- **Phase F2**: Customer dashboard shell (`/dashboard`), navigation (`CustomerNav`, `CustomerSidebar`), and account presentation components (`AccountCard`, `AccountStatusBadge`) are frozen and intact.

**Verdict**: Phases F0, F1, and F2 provide an uncompromised foundation. Phase F3 requires zero architectural revisions to earlier phases.

---

## 4. Actual Backend Payment Contract

An exhaustive inspection of `com.paymentledger.payment.api.PaymentController` in `payment-ledger-platform-complete-agent-kit` identifies exactly **two** customer-accessible endpoints:

### Endpoint 1: Payment Creation
- **HTTP Method**: `POST`
- **Path**: `/api/v1/payments`
- **Authentication**: Bearer token via `Authorization: Bearer <accessToken>` (principal resolved as `userId`).
- **Required Headers**:
  - `Idempotency-Key: <string>` (Mandatory; missing header yields HTTP 400 Bad Request).
- **Optional Headers**:
  - `X-Correlation-ID: <string>` (Propagated or generated).
- **Request Body**: JSON (`PaymentCreateRequest`).
- **Response Status Codes**:
  - `201 CREATED`: Payment processed (typically `SETTLED`).
  - `202 ACCEPTED`: Payment transitioned to `PENDING_RECONCILIATION` (gateway timeout or post-capture database settlement failure).
  - `400 BAD_REQUEST`: Validation failure, or provider declined/capture failed.
  - `401 UNAUTHORIZED`: Missing, invalid, or expired authentication token.
  - `404 NOT_FOUND`: Payee account does not exist.
  - `409 CONFLICT`: Idempotency collision (concurrent in-flight request or payload mismatch).
  - `422 UNPROCESSABLE_ENTITY`: Insufficient funds or account frozen.
  - `429 TOO_MANY_REQUESTS`: Rate limit exceeded.
  - `500 INTERNAL_SERVER_ERROR`: Unhandled system failure.

### Endpoint 2: Single Payment Retrieval
- **HTTP Method**: `GET`
- **Path**: `/api/v1/payments/{id}`
- **Path Variable**: `id` (UUID format).
- **Authentication**: Bearer token via `Authorization: Bearer <accessToken>`.
- **Response Status Codes**:
  - `200 OK`: Returns authoritative `PaymentResponse`.
  - `401 UNAUTHORIZED`: Authentication required.
  - `404 NOT_FOUND`: Payment does not exist OR caller is neither payer nor payee owner (anti-IDOR masking).

### Non-Existent Endpoints (Contract Facts)
The following endpoints **do not exist** in the customer backend:
- `GET /api/v1/payments` (DOES NOT EXIST for customers; only `AdminPaymentController` exposes listing for `ADMIN`/`SYSTEM`).
- `POST /api/v1/payments/{id}/authorize` (DOES NOT EXIST; authorization is internal to creation).
- `POST /api/v1/payments/{id}/capture` (DOES NOT EXIST; capture is internal to creation).

---

## 5. Actual Payment DTOs

### Request DTO: `PaymentCreateRequest` (`PaymentCreateRequest.java`)
```json
{
  "payeeAccountId": "UUID (required)",
  "amountMinor": "long (strictly positive >= 1)",
  "currency": "string (strictly 3 uppercase characters, e.g. USD)",
  "paymentMethodToken": "string (non-blank payment method token)"
}
```
*Critical Finding*: The request body does **not** take a `payerAccountId`. The backend automatically queries `accountRepository.findByOwnerId(userId)` to find an operational account (`CUSTOMER` or `MERCHANT`). If the user has no operational account, the backend throws `PaymentDomainException("No operational account found for user")`.

### Response DTO: `PaymentResponse` (`PaymentResponse.java`)
```json
{
  "paymentId": "UUID",
  "idempotencyKey": "string",
  "payerAccountId": "UUID",
  "payeeAccountId": "UUID",
  "amountMinor": 5000,
  "feeAmountMinor": 0,
  "currency": "USD",
  "status": "SETTLED | PENDING_RECONCILIATION | DECLINED | FAILED",
  "providerReference": "string",
  "correlationId": "string",
  "createdAt": "2026-09-25T18:30:00Z",
  "message": "string (present when PENDING_RECONCILIATION)",
  "pollUrl": "string (present when PENDING_RECONCILIATION, e.g. /api/v1/payments/{paymentId})"
}
```

---

## 6. Actual Payment State Machine

The backend defines enum `com.paymentledger.payment.domain.PaymentStatus`:

```text
                     [ Client Submits Payment ]
                                │
                                ▼
                            [ CREATED ]
                                │
                                ▼
                          [ AUTHORIZING ]
                           /           \
                          /             \
                  (Declined)          (Success)
                        ▼                 ▼
                  [ DECLINED ]*     [ AUTHORIZED ]
                                          │
                                          ▼
                                    [ CAPTURING ]
                                     /         \
                                    /           \
                            (Failed)          (Success)
                                ▼                 │
                           [ FAILED ]*            ▼
                                          [ Ledger Settle ]
                                           /             \
                                          /               \
                                     (Success)         (DB Error)
                                         ▼                 ▼
                                    [ SETTLED ]*   [ PENDING_RECONCILIATION ]^
                                                           ▲
                                                           │
                                             (Gateway Timeout on Auth/Cap)
```
*\* Terminal state*  
*\^ Investigation/transitional state requiring status polling or background worker settlement*

### State Semantics & Frontend Behavior
1. **`SETTLED` (Terminal Success)**: The payment has been captured by the payment provider and dual-entry ledger entries have posted atomically in PostgreSQL. Frontend displays confirmed success.
2. **`DECLINED` (Terminal Failure)**: The external card/payment issuer declined authorization (e.g., `INSUFFICIENT_FUNDS_AT_ISSUER`). Frontend displays decline reason. Safe to retry with a different payment method and a new idempotency key.
3. **`FAILED` (Terminal Failure)**: Capture failed at provider level. Frontend displays failure explanation.
4. **`PENDING_RECONCILIATION` (Indeterminate/Active Investigation)**:
   - Occurs when external provider call times out (`GATEWAY_TIMEOUT`), or when capture succeeded but the database ledger settlement encountered a transient failure (`DB_SETTLEMENT_FAILED`), or when an application crashed during processing.
   - Returned with HTTP `202 ACCEPTED` and a `pollUrl` (`/api/v1/payments/{id}`).
   - **Frontend Invariant**: Must **never** be presented as a simple "failure" or "success". The UI must explain that payment confirmation is in progress and poll `/api/v1/payments/{id}` until resolved.
5. **`EXPIRED` (Terminal)**: Authorization hold expired without capture.

---

## 7. Idempotency Semantics

Audited directly from `PaymentService.java` and `IdempotencyRecordEntity.java`:

| Property | Backend Implementation |
| :--- | :--- |
| **Header Name** | `Idempotency-Key` (Case-insensitive HTTP header). |
| **Scope** | `payerId:PAYMENT_CREATE:idempotencyKey` |
| **Payload Hash** | SHA-256 of `payeeAccountId|amountMinor|currency|paymentMethodToken` (`requestHash`). |
| **TTL / Retention** | 24 hours (`Instant.now().plus(24, ChronoUnit.HOURS)`). |
| **Status Lifecycle** | `IN_PROGRESS` -> `COMPLETED` or `FAILED`. |
| **Duplicate Identical Request (COMPLETED)** | Backend deserializes and replays the original cached `PaymentResponse` (HTTP 200/201/202). No double charging. |
| **Payload Mismatch on Same Key** | Throws `IdempotencyConflictException("IDEMPOTENCY_KEY_PAYLOAD_MISMATCH")` -> HTTP `409 Conflict`. |
| **Concurrent Request in Flight** | Throws `IdempotencyConflictException("IDEMPOTENCY_CONCURRENT_REQUEST")` -> HTTP `409 Conflict`. |
| **Orphaned / Stalled (> 10s)** | Automatically transitions to `PENDING_RECONCILIATION`, completes record with HTTP 202, and returns response. |

---

## 8. Ambiguous Mutation Handling

### The Problem Scenario
1. Client submits payment with `Idempotency-Key: K1`.
2. Backend executes payment, provider captures funds, but the client disconnects or times out before receiving the HTTP response.
3. The user/client is unaware whether the payment was processed.

### Authoritative Resolution Workflow
1. **Never Blindly Resubmit**: The frontend must **never** generate a new idempotency key (`K2`) to retry an ambiguous failure. Doing so would cause a double charge.
2. **Re-attempt with Identical Idempotency Key**:
   - The frontend retries `POST /api/v1/payments` using the **exact same** `Idempotency-Key: K1` and identical request payload.
   - If the original request completed, the backend safely replays the existing `PaymentResponse` without executing the transaction again.
   - If the request timed out or crashed, the backend returns HTTP 202 `PENDING_RECONCILIATION`.
3. **Status Polling**: If the response contains `pollUrl` or status `PENDING_RECONCILIATION`, the frontend polls `GET /api/v1/payments/{paymentId}` at restrained intervals (e.g. every 3 seconds for up to 30 seconds).

---

## 9. Account Association

- **Payer Account**: The customer does **not** specify their own account ID in `PaymentCreateRequest`. `PaymentController` resolves the payer account from the database:
  ```java
  UUID payerAccountId = accountRepository.findByOwnerId(userId, PageRequest.of(0, 10))
          .stream()
          .filter(acc -> acc.getAccountType().name().equals("CUSTOMER") || acc.getAccountType().name().equals("MERCHANT"))
          .findFirst()
          .map(AccountEntity::getId)
          .orElseThrow(() -> new PaymentDomainException("No operational account found for user"));
  ```
- **Payee Account**: Provided in the form (`payeeAccountId`). Must be a valid UUID.
- **Payer & Payee Difference**: `PaymentService` enforces `payerAccountId.equals(payeeAccountId) -> PaymentDomainException("Payer and payee accounts cannot be the same")`.
- **Currency Match**: `payerAccount.getCurrency().equals(request.getCurrency()) && payeeAccount.getCurrency().equals(request.getCurrency())`. Both must match the payment currency.

---

## 10. Money Semantics

- **Format**: `amountMinor` is a `long` integer representing currency minor units (e.g., `1050` = $10.50 USD).
- **Validation**: `@Min(value = 1, message = "Amount must be strictly positive")`.
- **No Floating Point**: The frontend must represent amounts as integer minor units internally, parsing user decimal input (e.g. `"10.50"`) directly to integer cents (`1050`) using fixed-point string parsing, avoiding IEEE-754 floating-point rounding errors.
- **Formatting**: Presentational display formats via `formatMoney(amountMinor, currency)`.

---

## 11. Validation Rules

| Field | Rule / Annotation | Backend Constraint | Frontend Client Validation |
| :--- | :--- | :--- | :--- |
| **`payeeAccountId`** | `@NotNull` | Must be a valid UUID string; must exist in DB. | Valid RFC 4122 UUID regex. |
| **`amountMinor`** | `@Min(1)` | Primitive Java `long` (64-bit integer); strictly positive >= 1 minor unit. | Deterministic positive integer minor units (`>= 1`); `<= Number.MAX_SAFE_INTEGER` for safe JSON number representation. No artificial 999,999,999 business ceiling. |
| **`currency`** | `@NotBlank`, `@Size(min=3, max=3)` | ISO-4217 3-letter code (`^[A-Z]{3}$`); must match payer and payee accounts. | Matches `^[A-Z]{3}$`. Defaults to `"USD"` as a frontend product scope constraint. Backend authoritatively verifies account match. |
| **`paymentMethodToken`** | `@NotBlank` | Non-empty token (e.g. `tok_visa`, `tok_mastercard`). | Required selection/input (sandbox test tokens). |
| **`Idempotency-Key`** | Header (`required=true`) | Non-blank string (UUID recommended). | Generated UUID v4 upon user confirmation; immutable during submission. |

---

## 12. Authentication & Authorization

- **Authentication**: Phase F1 `useAuth()` and in-memory access token. Injected via `apiFetch` in header `Authorization: Bearer <accessToken>`.
- **Authorization**:
  - `POST /api/v1/payments`: Any authenticated `CUSTOMER` or `MERCHANT`.
  - `GET /api/v1/payments/{id}`: Caller must own either `payerAccountId` or `payeeAccountId` (or be `ADMIN`/`SYSTEM`).
  - Unauthorized callers receive HTTP `404 Not Found` (anti-IDOR masking).

---

## 13. Correlation

- Header: `X-Correlation-ID: <uuid>`.
- Generated client-side via `generateCorrelationId()` for each payment creation attempt if not supplied.
- Echoed back in backend `PaymentResponse.correlationId` and error responses.
- Displayed on payment confirmation and error views for auditability.

---

## 14. Error Taxonomy

Audited from `GlobalExceptionHandler.java`:

| HTTP Status | Error Code | Backend Trigger | Frontend Treatment |
| :--- | :--- | :--- | :--- |
| **400** | `INVALID_PAYLOAD` | Bean validation failure, same payer/payee, currency mismatch, or `PROVIDER_DECLINED` / `CAPTURE_FAILED`. | Display validation errors or provider decline notice. Safe to fix input with new idempotency key. |
| **401** | `UNAUTHORIZED` | Expired or invalid JWT. | Trigger token refresh; redirect to `/login` if refresh fails. |
| **404** | `RESOURCE_NOT_FOUND` | Payee account not found, or payment not found/not owned. | Display: "Account or Payment not found or inaccessible." |
| **409** | `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH` | Reusing key with altered payload. | "Idempotency conflict: A request with this key already exists with different data." |
| **409** | `IDEMPOTENCY_CONCURRENT_REQUEST` | Concurrent request in progress with same key. | "Payment is currently processing. Please wait." (Disable submit button). |
| **422** | `INSUFFICIENT_FUNDS` | Payer account balance < `amountMinor`. | "Insufficient funds to complete this payment." |
| **422** | `ACCOUNT_FROZEN` | Payer account status is `FROZEN`. | "Your account is frozen. Payments cannot be initiated." |
| **202** | `PAYMENT_PENDING_RECONCILIATION` | Gateway timeout or DB settlement delay. | "Payment processing. Reconciling with network." (Initiate polling on `pollUrl`). |
| **429** | `RATE_LIMIT_EXCEEDED` | Exceeded rate limit. | "Too many requests. Please wait before retrying." |
| **500** | `INTERNAL_SERVER_ERROR` | Server exception. | "Payment processing temporarily unavailable. Check payment status before retrying." |

---

## 15. Retry Policy

- **Reads (`GET /api/v1/payments/{id}`)**: Safe to retry automatically (TanStack Query retry: 1 on network failure).
- **Mutations (`POST /api/v1/payments`)**:
  - **400, 422 (Validation / Declined / Insufficient Funds)**: DO NOT retry automatically. User must change inputs (amount/payment method) and a **new** idempotency key must be generated.
  - **409 (Concurrent)**: Wait and query payment status or retry with the **same** idempotency key.
  - **Network Timeout / Aborted Fetch**: Retry ONLY with the **exact same** idempotency key, or query status if `paymentId` is known. Never generate a new key for an uncertain request.

---

## 16. Proposed F3 UI Boundary

```text
src/app/(customer)/payments/
  ├── new/
  │    └── page.tsx                     <-- Payment creation form & confirmation dialog
  └── [id]/
       └── page.tsx                     <-- Authoritative payment detail/status view

src/features/payments/
  ├── api/
  │    └── payments-api.ts              # createPayment(payload, idempotencyKey), getPayment(id)
  ├── hooks/
  │    ├── use-create-payment.ts        # TanStack Query mutation with idempotency management
  │    └── use-payment.ts               # TanStack Query hook with polling support
  └── components/
       ├── payment-form.tsx             # Validated payment form with minor-unit conversion
       ├── payment-confirm-dialog.tsx   # Pre-submission confirmation modal
       ├── payment-status-badge.tsx     # Status badge (SETTLED, PENDING_RECONCILIATION, etc.)
       ├── payment-status-card.tsx      # Payment details card with correlation ID
       ├── payment-reconciliation-banner.tsx # Alert for PENDING_RECONCILIATION state
       └── payment-error-state.tsx      # RFC 7807 error presentation
```

---

## 17. Security Gap Analysis

- **Idempotency Key Tampering**: Keys are generated client-side as UUID v4 per unique submission.
- **Double Submit Protection**: Submit button disabled immediately upon click (`isSubmitting === true`), preventing rapid multi-clicks before network response.
- **Token In-Memory Isolation**: Access tokens remain strictly in-memory closure; never serialized in request bodies, URLs, or query strings.
- **Card Data / PAN Protection**: No credit card PANs or CVVs are collected or transmitted directly to the backend. The backend uses `paymentMethodToken` (tokenized reference, e.g. `tok_visa`).
- **Telemetry Redaction**: `logger.ts` redacts payment method tokens and sensitive account details.

---

## 18. Accessibility Gap Analysis (WCAG 2.1 AA)

- **Form Labels & Error Associations**: Every input has programmatic `<label>`, `aria-describedby` pointing to error text, and `aria-invalid`.
- **Amount & Currency Guidance**: Clear description of decimal format and automatic conversion to minor units.
- **Submission State**: Button reflects `aria-busy="true"` and displays loading spinner with screen-reader announcement.
- **Status Badges**: Distinct text and icons for each state; zero color-only status communication.
- **Modal Dialog**: Accessible focus trap for payment confirmation modal.

---

## 19. Performance Gap Analysis

- **Bundle Impact**: Reuses existing Lucide icons, Tailwind, and React Hook Form / Zod. Expected First Load JS increase < 15 kB.
- **Controlled Polling**: Status polling on `PENDING_RECONCILIATION` uses exponential or bounded polling (max 10 attempts at 3s intervals).

---

## 20. Testing Gap Analysis

Required layered test coverage for Phase F3:
- **Unit**:
  - `tests/unit/payment-types.test.ts`: Request/response DTO structure and type validation.
  - `tests/unit/idempotency-key.test.ts`: Idempotency key generation and UUID formatting.
  - `tests/unit/payment-state-machine.test.ts`: State mapping and terminal state logic.
  - `tests/unit/money-input.test.ts`: Conversion of decimal user input to integer minor units.
- **Component**:
  - `tests/components/payment-form.test.tsx`: Form validation, submit disabling, and error display.
  - `tests/components/payment-status-badge.test.tsx`: Visual and accessible status rendering.
  - `tests/components/payment-status-card.test.tsx`: Metadata, correlation ID, and poll state.
- **Integration**:
  - `tests/integration/payments-api.test.ts`: `createPayment` and `getPayment` API calls, header verification (`Idempotency-Key`, `X-Correlation-ID`), 201/202 parsing, 400/409/422 error handling.
- **Accessibility**:
  - `tests/accessibility/payments-a11y.test.tsx`: Automated landmark, form label, and alert audits.
- **Playwright E2E**:
  - `tests/e2e/payments.spec.ts`: End-to-end flow from payment creation to confirmation and status presentation.

---

## 21. Observability Gap Analysis

- Telemetry logs payment initiation, outcome status (`SETTLED`, `PENDING_RECONCILIATION`), and error codes with `X-Correlation-ID`.
- Telemetry strictly excludes `paymentMethodToken`, card details, and passwords.

---

## 22. Documentation Gap

Phase F3 will require:
- `docs/payments/payment-architecture.md`: Specification of payment flow, state transitions, and idempotency.
- `docs/phase-reports/PHASE-F3-IMPLEMENTATION-PLAN.md`: Implementation plan.
- `docs/phase-reports/PHASE-F3-FINAL.md`: Closure report.
- `docs/phases/PHASE-F3.md`: Phase status tracking.

---

## 23. Skill Coverage Audit

All necessary skills exist under `.agents/skills/`:
- `financial/payment-ui/SKILL.md` (Active)
- `financial/idempotency-ui/SKILL.md` (Active)
- `financial/financial-state-machines/SKILL.md` (Active)
- `financial/money-formatting/SKILL.md` (Active)
- `security/frontend-security/SKILL.md` (Active)
- `accessibility/wcag-aa/SKILL.md` (Active)

---

## 24. F2 Freeze Integrity

- Phase F2 customer navigation and layout remain untouched.
- `src/app/(customer)/layout.tsx` will host `/payments/new` and `/payments/[id]` seamlessly within the customer shell.
- No modifications to F2 account components or F1 authentication.

---

## 25. Explicit Non-Goals

- No payment listing endpoint for customers.
- No transaction ledger entry UI.
- No refunds or payout initiation.
- No balance calculations or balance displays.
- No admin operations or account freeze/unfreeze controls.

---

## 26. Open Questions & Backend Limitations

1. **No Customer Payment List Endpoint**: The backend has no `GET /api/v1/payments` for customers. Therefore, the payment UI consists of `/payments/new` (creation) and `/payments/[id]` (single payment detail/status view). A payment history table cannot be built until an endpoint is provided or transaction exploration is introduced in Phase F4.
2. **Payment Method Token**: The backend requires `paymentMethodToken`. In the absence of a live card tokenizer iframe (e.g. Stripe Elements), the frontend will provide standard sandbox token selections (`tok_visa`, `tok_decline`, `tok_timeout`) clearly labeled as test provider tokens.

---

## 27. Recommended Implementation Sequence

1. `src/types/payment.ts`: Payment DTOs, enums, and request schemas.
2. `src/features/payments/api/payments-api.ts`: API fetchers with `Idempotency-Key` and `X-Correlation-ID`.
3. `src/features/payments/hooks/`: `useCreatePayment` mutation and `usePayment` query.
4. `src/features/payments/components/`: Status badges, cards, forms, and dialogs.
5. Customer routes: `src/app/(customer)/payments/new/page.tsx` and `src/app/(customer)/payments/[id]/page.tsx`.
6. Navigation link in `CustomerSidebar` for "Make Payment".
7. Unit, component, integration, accessibility, and E2E tests.
8. Quality verification gates and freeze audit.

---

## 28. Verification Gates

1. `npm run typecheck` (`tsc --noEmit`): 0 errors.
2. `npm run lint` (`next lint`): 0 warnings, 0 errors.
3. `npm run test` (`vitest run`): 100% pass across all suites.
4. `npm run build` (`next build`): Clean production bundle generation.
5. `npx playwright test`: All E2E flows passing.
6. `verify-repo.ps1`, `check-secrets.ps1`, `verify-env.ps1`: All exit code 0.

---

## 29. Final Scope Audit

A scan of the repository confirms zero premature F4+ implementations (no ledger journal, no refunds, no payouts, no reconciliation cases, no admin tools).

---

## 30. Final Status

**GAP_ANALYSIS_COMPLETE**

The Phase F3 Gap Analysis is complete. The backend payment contract, idempotency engine, and state machine have been forensically verified from the frozen Spring Boot backend source code. Ready for human review and Implementation Planning.
