# Phase F7-H Gap Analysis: Admin Financial Adjustments

**Document ID:** `PHASE-F7-H-GAP-ANALYSIS`  
**Phase:** F7-H — Admin Financial Adjustments  
**Status:** `F7-H_GAP_ANALYSIS_READY`  
**Date:** 2026-09-26  
**Target:** Administrative Financial Adjustment Capability (`/api/v1/admin/adjustments`, `/admin/adjustments`)

---

## 1. Executive Summary

Phase F7-H introduces the administrative **Financial Adjustment** capability to the platform. Unlike prior read-only explorer and inspector phases, this phase introduces **controlled, high-risk financial mutations** capable of transferring value between platform accounts via double-entry ledger postings.

To guarantee financial safety, strict double-entry integrity, and absolute adherence to backend rules, this gap analysis inspects the frozen Spring Boot backend implementation (`AdminAdjustmentController.java`, `FinancialAdjustmentService.java`, `LedgerService.java`, `AccountEntity.java`, and database schema migrations).

### Core Findings
1. **Authoritative Backend Footprint**: Exactly **two (2) REST endpoints** exist in `AdminAdjustmentController.java`:
   - `POST /api/v1/admin/adjustments` (Atomic double-entry financial adjustment execution with mandatory `Idempotency-Key`)
   - `GET /api/v1/admin/adjustments/{adjustmentId}` (Direct UUID lookup of an adjustment record)
   - **Crucial Architectural Constraint**: There is **NO** list or query endpoint (`GET /api/v1/admin/adjustments`) for adjustments in the backend. Adjustments are queried individually by ID or audited via the account ledger entries.
2. **Double-Entry Balance Guarantee**: Every successful adjustment posts an immutable `SYSTEM_ADJUSTMENT` ledger transaction containing exactly two balanced entries: a `DEBIT` on the source account and a `CREDIT` on the target account for identical minor unit amounts and currencies.
3. **Deadlock Elimination**: The backend enforces strict account locking order using lexicographical UUID comparison (`sourceAccountId.compareTo(targetAccountId)`) with `SELECT ... FOR UPDATE` row locks, preventing AB-BA deadlocks during concurrent opposing adjustments.
4. **Authoritative Idempotency**: Idempotency is enforced in PostgreSQL with SHA-256 request payload hashing scoped to `(operatorId, "ADMIN_ADJUSTMENT", idempotencyKey)`. Completed requests safely replay the original `FinancialAdjustmentResponse` without double-mutating accounts.
5. **Atomic Outbox Eventing**: Adjustments emit a `FinancialAdjustmentPosted` payload into the transactional outbox table within the exact same database transaction as the ledger entries and account balance updates.

---

## 2. Backend Endpoint Inventory

| HTTP Method | Route | Authorization | Idempotency | Response Status | Purpose |
| :--- | :--- | :--- | :--- | :---: | :--- |
| `POST` | `/api/v1/admin/adjustments` | `ADMIN`, `SYSTEM` | Required (`Idempotency-Key` header) | `201 Created` | Executes atomic double-entry adjustment between source and target accounts |
| `GET` | `/api/v1/admin/adjustments/{adjustmentId}` | `ADMIN`, `SYSTEM` | None | `200 OK` | Retrieves adjustment record by UUID |

*Note: No other adjustment endpoints exist in the backend.*

---

## 3. Controller Analysis (`AdminAdjustmentController.java`)

- **Class**: `com.paymentledger.admin.api.AdminAdjustmentController`
- **Base Request Mapping**: `/api/v1/admin/adjustments`
- **Class Dependencies**: `FinancialAdjustmentService`
- **Role Security**: All endpoints are protected with `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`.

### Endpoint Method Signatures

```java
@PostMapping
@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")
public ResponseEntity<FinancialAdjustmentResponse> createAdjustment(
        @RequestHeader("Idempotency-Key") String idempotencyKey,
        @RequestHeader(value = CorrelationIdFilter.CORRELATION_ID_HEADER, required = false) String correlationId,
        @AuthenticationPrincipal String userIdStr,
        @Valid @RequestBody FinancialAdjustmentCreateRequest request) {

    UUID operatorId = UUID.fromString(userIdStr);
    FinancialAdjustmentResponse response = financialAdjustmentService.postAdjustment(
            operatorId, idempotencyKey, correlationId, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
}

@GetMapping("/{adjustmentId}")
@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")
public ResponseEntity<FinancialAdjustmentResponse> getAdjustment(
        @PathVariable UUID adjustmentId) {

    FinancialAdjustmentResponse response = financialAdjustmentService.getAdjustment(adjustmentId);
    return ResponseEntity.ok(response);
}
```

---

## 4. Request DTO Analysis (`FinancialAdjustmentCreateRequest.java`)

- **Class**: `com.paymentledger.admin.api.dto.FinancialAdjustmentCreateRequest`
- **Representation**: Immutable Java Record

| Field Name | Java Type | JSON Property | Validations | Semantic Meaning |
| :--- | :--- | :--- | :--- | :--- |
| `sourceAccountId` | `UUID` | `"sourceAccountId"` | `@NotNull(message = "Source account ID is required")` | Account debited for the adjustment |
| `targetAccountId` | `UUID` | `"targetAccountId"` | `@NotNull(message = "Target account ID is required")` | Account credited for the adjustment |
| `amountMinor` | `Long` | `"amountMinor"` | `@NotNull(message = "Amount is required")`<br>`@Min(value = 1, message = "Amount must be strictly positive")` | Monetary amount in currency minor units ($\ge 1$) |
| `currency` | `String` | `"currency"` | `@NotBlank(message = "Currency is required")`<br>`@Size(min = 3, max = 3, message = "Currency must be 3-letter ISO code")` | 3-letter ISO-4217 currency code (e.g. `USD`, `EUR`) |
| `reason` | `String` | `"reason"` | `@NotBlank(message = "Reason is strictly required for administrative adjustments")`<br>`@Size(max = 500, message = "Reason cannot exceed 500 characters")` | Mandatory audit explanation/justification |

### Validation Invariants Enforced in Service/Database:
1. `sourceAccountId != targetAccountId`: Enforced in `FinancialAdjustmentService` and database constraint `ck_adjustments_distinct_accounts`.
2. Both accounts must exist in PostgreSQL `accounts` table.
3. Account currencies of both source and target accounts must strictly equal `request.currency()`.

---

## 5. Response DTO Analysis (`FinancialAdjustmentResponse.java`)

- **Class**: `com.paymentledger.admin.api.dto.FinancialAdjustmentResponse`
- **Representation**: Immutable Java Record

| Field Name | Java Type | JSON Property | Description |
| :--- | :--- | :--- | :--- |
| `adjustmentId` | `UUID` | `"adjustmentId"` | Unique primary identifier for this adjustment |
| `sourceAccountId` | `UUID` | `"sourceAccountId"` | Debited account UUID |
| `targetAccountId` | `UUID` | `"targetAccountId"` | Credited account UUID |
| `amountMinor` | `long` | `"amountMinor"` | Minor unit amount adjusted |
| `currency` | `String` | `"currency"` | ISO-4217 currency code |
| `reason` | `String` | `"reason"` | Administrative justification provided |
| `operatorId` | `UUID` | `"operatorId"` | Authenticated admin user UUID who submitted the adjustment |
| `compensatingLedgerTransactionId` | `UUID` | `"compensatingLedgerTransactionId"` | UUID of the posted double-entry ledger transaction |
| `createdAt` | `Instant` | `"createdAt"` | Timestamp of creation (ISO-8601 string in JSON) |

---

## 6. Authorization Analysis

1. **Role Enforcement**:
   - `ROLE_ADMIN`: **PERMITTED**
   - `ROLE_SYSTEM`: **PERMITTED**
   - `ROLE_CUSTOMER`: **DENIED** (HTTP 403 Forbidden with `ErrorCode.FORBIDDEN`)
   - `ROLE_MERCHANT`: **DENIED** (HTTP 403 Forbidden with `ErrorCode.FORBIDDEN`)
   - Anonymous / Unauthenticated: **DENIED** (HTTP 401 Unauthorized with `ErrorCode.UNAUTHORIZED`)
2. **Actor Extraction**:
   - The operator ID is extracted from `@AuthenticationPrincipal String userIdStr` (the JWT subject UUID) and recorded immutably in `financial_adjustments.operator_id`.

---

## 7. Financial Accounting Model & Execution Trace

When an operator submits `POST /api/v1/admin/adjustments`:

```
AdminAdjustmentController.createAdjustment()
  │
  ├── 1. Read 'Idempotency-Key', 'X-Correlation-ID', and '@AuthenticationPrincipal'
  │
  ├── 2. FinancialAdjustmentService.postAdjustment()
  │       │
  │       ├── 2.1 Calculate SHA-256 request payload hash
  │       ├── 2.2 Query idempotency_records by (actorId, "ADMIN_ADJUSTMENT", idempotencyKey)
  │       │       ├── If COMPLETED & hash match: Return cached FinancialAdjustmentResponse (Replay)
  │       │       ├── If COMPLETED & hash mismatch: Throw IDEMPOTENCY_KEY_PAYLOAD_MISMATCH (409)
  │       │       └── If IN_PROGRESS: Throw IDEMPOTENCY_CONCURRENT_REQUEST (409)
  │       │
  │       ├── 2.3 Lock idempotency record (status=IN_PROGRESS, Propagation.REQUIRES_NEW)
  │       │
  │       └── 2.4 Call processAdjustment() [@Transactional]
  │               │
  │               ├── Check sourceAccountId != targetAccountId
  │               ├── Check reason is non-blank
  │               │
  │               ├── Call LedgerService.postAdjustmentWithLedger()
  │               │     │
  │               │     ├── Compare source & target UUIDs to determine deterministic lock order
  │               │     ├── Acquire pessimistic row locks: accountRepository.findByIdForUpdate()
  │               │     ├── Verify source.currency == currency AND target.currency == currency
  │               │     │
  │               │     ├── Fetch sequence numbers:
  │               │     │     sourceSeq = getMaxSequenceNumber(source) + 1
  │               │     │     targetSeq = getMaxSequenceNumber(target) + 1
  │               │     │
  │               │     ├── Instantiate LedgerTransactionEntity:
  │               │     │     type: SYSTEM_ADJUSTMENT
  │               │     │     sourceReferenceId: adjustmentId
  │               │     │     sourceReferenceType: "ADMIN_ADJUSTMENT"
  │               │     │     description: "Admin adjustment: " + reason
  │               │     │
  │               │     ├── Add LedgerEntry: DEBIT sourceAccountId (amountMinor)
  │               │     ├── Add LedgerEntry: CREDIT targetAccountId (amountMinor)
  │               │     ├── Post transaction: tx.post() [Validates sum(DEBIT) == sum(CREDIT)]
  │               │     ├── Save tx to ledger_transactions & ledger_entries
  │               │     │
  │               │     ├── Update materialized balances:
  │               │     │     sourceAccount.subtractBalanceMinor(amountMinor)
  │               │     │     targetAccount.addBalanceMinor(amountMinor)
  │               │     ├── Save source and target accounts
  │               │     │
  │               │     └── Enqueue Outbox event: "FinancialAdjustmentPosted"
  │               │
  │               ├── Save FinancialAdjustmentEntity to financial_adjustments table
  │               │
  │               └── Complete idempotency record (status=COMPLETED, statusCode=201, cachedResponse)
  │
  └── 3. Return HTTP 201 Created with FinancialAdjustmentResponse
```

---

## 8. Double-Entry Invariants

1. **Balanced Entries**: Every adjustment transaction posts exactly two entries:
   - Debit: `sourceAccountId` for `amountMinor`
   - Credit: `targetAccountId` for `amountMinor`
   - Invariant: `sum(DEBIT) - sum(CREDIT) = 0` (strictly verified by `tx.post()`).
2. **Monotonic Account Sequences**: Each account's ledger entries are assigned a strictly ascending sequence number (`max(sequence_number) + 1`).
3. **Currency Invariance**: Cross-currency adjustments are impossible; source, target, and adjustment request currencies must match identically.
4. **Non-Zero Invariant**: Amounts $\le 0$ are rejected at both DTO validation (`@Min(1)`) and database constraint (`ck_adjustments_amount_positive`).

---

## 9. Account Validation

1. **Nonexistent Account**: If either `sourceAccountId` or `targetAccountId` does not exist in the `accounts` table, `LedgerService` throws `IllegalArgumentException("Source account not found: ...")` or `IllegalArgumentException("Target account not found: ...")`.
2. **Identical Accounts**: If `sourceAccountId.equals(targetAccountId)`, rejected before database insertion by `FinancialAdjustmentService` (`IllegalArgumentException("Source and target accounts must be distinct")`) and database constraint `ck_adjustments_distinct_accounts`.
3. **Closed or Frozen Accounts**: The core `LedgerService.postAdjustmentWithLedger` does not bar posting adjustments to frozen or closed accounts because system adjustments serve as regulatory, operational, or legal corrections. However, frontend warnings should clearly notify operators if either account is `FROZEN` or `CLOSED`.

---

## 10. Balance Validation & Overdraft

1. **No Insufficient Funds Check**: Unlike customer payments or payouts, `LedgerService.postAdjustmentWithLedger` intentionally **does not check for sufficient funds**.
   - Operational adjustments allow debits against system accounts, clearing accounts, suspense accounts, or correcting negative customer balances.
   - Materialized balances are updated by subtracting `amountMinor` from source and adding `amountMinor` to target.
2. **Lossless Precision**: All balances and adjustments are represented in 64-bit integer minor units (`long` / `BIGINT`).

---

## 11. Concurrency Analysis

1. **Pessimistic Row Locking (`SELECT ... FOR UPDATE`)**:
   - Accounts are locked via `accountRepository.findByIdForUpdate()`.
2. **Deadlock Elimination Pattern**:
   ```java
   if (sourceAccountId.compareTo(targetAccountId) < 0) {
       sourceAccount = accountRepository.findByIdForUpdate(sourceAccountId)...;
       targetAccount = accountRepository.findByIdForUpdate(targetAccountId)...;
   } else {
       targetAccount = accountRepository.findByIdForUpdate(targetAccountId)...;
       sourceAccount = accountRepository.findByIdForUpdate(sourceAccountId)...;
   }
   ```
   - Deterministic UUID ordering ensures that concurrent opposing transactions (e.g. Account A $\to$ Account B while Account B $\to$ Account A) always acquire row locks in the identical sequence, rendering deadlocks impossible.
3. **Concurrent Duplicate Submissions**:
   - The first request creates the `idempotency_records` row with status `IN_PROGRESS`.
   - A concurrent identical request encounters a duplicate key on `(actor_id, operation, idempotency_key)` or `status == IN_PROGRESS` and receives **HTTP 409 Conflict** (`IDEMPOTENCY_CONCURRENT_REQUEST`).

---

## 12. Idempotency Protocol Analysis

- **Storage Table**: `idempotency_records`
- **Scope**: `actor_id` (operator UUID), `operation = "ADMIN_ADJUSTMENT"`, and `idempotency_key`.
- **Payload Hash**: SHA-256 hex string computed from:
  `sourceAccountId + "|" + targetAccountId + "|" + amountMinor + "|" + currency + "|" + reason`
- **Status Lifecycle**:
  - `IN_PROGRESS` $\to$ `COMPLETED` (with HTTP 201 status code and JSON response body cached)
  - `IN_PROGRESS` $\to$ `FAILED` (if unhandled exception occurs)
- **Replay Behavior**: If a subsequent request arrives with identical key and identical hash, the completed cached response is returned immediately without firing ledger mutations or modifying account balances.
- **Mismatch Behavior**: If a request arrives with identical key but differing payload parameters, an `IdempotencyConflictException("IDEMPOTENCY_KEY_PAYLOAD_MISMATCH", key)` is thrown, resulting in **HTTP 409 Conflict**.
- **Frontend Generation Rule**:
  - The frontend MUST generate a fresh UUID v4 `Idempotency-Key` **strictly upon explicit operator confirmation**.
  - The key must NOT be regenerated on re-render, typing, or tab switches.
  - If a network failure occurs, the UI must allow retrying with the **same** idempotency key so the backend can safely replay or finish the transaction.

---

## 13. Audit & Observability

1. **Transactional Outbox Event**:
   - Emits an event to `outbox_events` table:
     - `aggregateType`: `"FINANCIAL_ADJUSTMENT"`
     - `aggregateId`: `adjustmentId.toString()`
     - `eventType`: `"FinancialAdjustmentPosted"`
     - `topic`: `"payment.events"`
     - `partitionKey`: `sourceAccountId.toString()`
     - `payload`: Contains `adjustmentId`, `sourceAccountId`, `targetAccountId`, `amountMinor`, `currency`, `operatorId`, `tx.getId()`, `reason`, `timestamp`.
2. **Metrics**:
   - Increments counter `ledger.transaction.posted` with tags `type=ADMIN_ADJUSTMENT` and `currency`.
3. **Ledger Transaction Traceability**:
   - The returned `compensatingLedgerTransactionId` links directly to the ledger transaction record (`/admin/ledger/transactions/[id]`).

---

## 14. Outbox & Eventing

- Direct Kafka communication from the frontend is **strictly prohibited**.
- The backend writes the outbox event atomically within the database transaction. A background CDC or polling process relays outbox records to Kafka asynchronously.
- Frontend does not subscribe to Kafka topics directly.

---

## 15. Redis Auxiliary Infrastructure

- Redis is utilized in the backend for distributed rate limiting and auxiliary cache reads.
- Financial adjustments bypass Redis for financial balance determination; balances and ledger entries are read and written strictly against PostgreSQL with pessimistic locks.

---

## 16. Error Contract & Mapping

| Status Code | Condition | Backend ErrorCode / Exception | Frontend Interpretation & Handling |
| :---: | :--- | :--- | :--- |
| **400** | Missing required header (`Idempotency-Key`) | `MissingRequestHeaderException` | Missing idempotency key. Client must supply a valid UUID. |
| **400** | Payload validation failure (`amountMinor < 1`, missing account, empty reason) | `INVALID_PAYLOAD` (`MethodArgumentNotValidException`) | Display specific field errors in form. |
| **400** | Source and target accounts are identical | `IllegalArgumentException` / `ck_adjustments_distinct_accounts` | Form error: "Source and destination accounts must be distinct." |
| **401** | Missing or expired auth token | `UNAUTHORIZED` (`InvalidCredentialsException`) | Redirect to `/login`. |
| **403** | User role is CUSTOMER, MERCHANT, or lacks admin access | `FORBIDDEN` (`AccessDeniedException`) | Access denied barrier. |
| **409** | Idempotency key reused with different payload | `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH` (`IdempotencyConflictException`) | Alert operator that idempotency key was previously used with different parameters. |
| **409** | Idempotency request currently in progress | `IDEMPOTENCY_CONCURRENT_REQUEST` (`IdempotencyConflictException`) | Inform operator that adjustment is currently processing; prevent re-submission. |
| **422** | Account currency does not match adjustment currency | `IllegalArgumentException` (`"Account currency does not match adjustment currency"`) | Error alert: "Account currency mismatch." |
| **500** | Source or target account not found, or unexpected error | `INTERNAL_SERVER_ERROR` | System error alert. Provide correlation ID for debugging. |

---

## 17. Currency & Monetary Rules

1. **ISO-4217 Compliance**: Currency must be a 3-letter uppercase ISO code (`USD`, `EUR`, `GBP`).
2. **Minor Units**: Financial amounts are strictly integer minor units (`amountMinor` in cents, pence, etc.).
3. **Zero Conversion in Frontend**: Frontend must never calculate exchange rates or perform cross-currency adjustments.
4. **Precision**: All financial numbers are formatted using `formatMinorUnits` for human display.

---

## 18. Reason & Operational Justification Rules

1. **Required**: Reason is mandatory (`@NotBlank`).
2. **Length**: Maximum 500 characters (`@Size(max = 500)`).
3. **Operational Discipline**: Client must trim reason and reject whitespace-only submissions before confirmation.

---

## 19. Lifecycle & State Model

Unlike payments or refunds that may transition through `REQUESTED` $\to$ `PROCESSING` $\to$ `SETTLED`, **financial adjustments are immediate, atomic, and synchronous**.
- There is no asynchronous polling or pending status.
- Upon HTTP 201 response, the adjustment and ledger transaction are immediately `POSTED`.
- There is no cancel, edit, or delete operation. An erroneous adjustment requires a new opposing adjustment.

---

## 20. Existing Frontend Infrastructure Assessment

### Already Implemented & Frozen
1. **Types (`src/types/admin.ts`)**:
   - `FinancialAdjustmentCreateRequest` (lines 214-220)
   - `FinancialAdjustmentResponse` (lines 222-232)
   - Matches backend Java records 100%.
2. **API Client (`src/lib/api/endpoints/admin-api.ts`)**:
   - `createAdminFinancialAdjustment(request, idempotencyKey)` (lines 355-373)
   - `getAdminFinancialAdjustment(adjustmentId)` (lines 379-394)
3. **Query Keys (`src/features/admin/hooks/query-keys.ts`)**:
   - `adminKeys.adjustment(id)` (line 52)
4. **Navigation & Breadcrumbs**:
   - Sidebar includes `Financial Adjustments` pointing to `/admin/adjustments`.
   - Breadcrumbs support `adjustments`.

### Missing Frontend Components (Gaps to Implement in F7-H)
1. **Hooks**:
   - `useAdminAdjustment(id)` (Query hook for fetching adjustment details)
   - `useAdminCreateAdjustment()` (Mutation hook wrapping `createAdminFinancialAdjustment` with `retry: false`)
2. **UI Route & Pages**:
   - `/admin/adjustments` (Workspace containing the adjustment creation form and lookup tools)
   - `/admin/adjustments/[id]` (Authoritative adjustment receipt and detail view)
3. **Components**:
   - Account Selection / Validation form fields (with source and destination account lookup/pre-fill)
   - Decimal to minor-units money input
   - Explicit two-step Confirmation Modal with payload freeze
   - Adjustment Success / Receipt Card linking to ledger transaction (`/admin/ledger/transactions/[compensatingLedgerTransactionId]`)
4. **Tests**:
   - Unit tests for validation & query keys
   - Component tests for adjustment form & confirmation modal
   - Accessibility tests (WCAG 2.1 AA)
   - E2E Playwright tests for complete adjustment flow

---

## 21. Frontend Gap Analysis Matrix

| Feature / Artifact | Status | Action Required in F7-H |
| :--- | :---: | :--- |
| `FinancialAdjustmentCreateRequest` DTO | **AVAILABLE** | Verified against backend; ready to use |
| `FinancialAdjustmentResponse` DTO | **AVAILABLE** | Verified against backend; ready to use |
| `createAdminFinancialAdjustment` API | **AVAILABLE** | Verified against backend; ready to use |
| `getAdminFinancialAdjustment` API | **AVAILABLE** | Verified against backend; ready to use |
| `adminKeys.adjustment(id)` Query Key | **AVAILABLE** | Scoped under `adminKeys.all`; ready to use |
| `useAdminAdjustment` Hook | **MISSING** | Implement in `src/features/admin/hooks/use-admin-adjustment.ts` |
| `useAdminCreateAdjustment` Hook | **MISSING** | Implement in `src/features/admin/hooks/use-admin-create-adjustment.ts` |
| Route `/admin/adjustments` | **MISSING** | Create page in `src/app/(admin)/admin/adjustments/page.tsx` |
| Route `/admin/adjustments/[id]` | **MISSING** | Create page in `src/app/(admin)/admin/adjustments/[id]/page.tsx` |
| Adjustment Form Component | **MISSING** | Create `src/features/admin/components/financial-adjustment-form.tsx` |
| Confirmation Modal Component | **MISSING** | Create `src/features/admin/components/financial-adjustment-confirm-modal.tsx` |
| Adjustment Receipt Component | **MISSING** | Create `src/features/admin/components/financial-adjustment-receipt.tsx` |
| Adjustment Lookup Component | **MISSING** | Create `src/features/admin/components/financial-adjustment-lookup.tsx` |
| Component Tests | **MISSING** | Add unit and component test suites |
| Accessibility Tests | **MISSING** | Add WCAG 2.1 AA test suite |
| E2E Tests | **MISSING** | Add Playwright spec `tests/e2e/admin-adjustments.spec.ts` |

---

## 22. Financial UI Safety Requirements

Because administrative adjustments directly modify account balances, the frontend MUST enforce the following safety rules:

1. **Two-Step Explicit Confirmation**:
   - The submit button on the form must not fire the mutation directly; it must open an explicit confirmation dialog.
   - The dialog must summarize: Source Account, Target Account, Amount, Currency, and Justification.
   - A prominent warning must state: *"This action will immediately debit the source account, credit the target account, and post an immutable double-entry ledger transaction. This operation cannot be undone."*
2. **Payload Freeze & Single-Use Idempotency**:
   - The UUID `Idempotency-Key` is generated when the confirmation dialog is opened or confirmed, locking the payload.
   - Any editing of the form closes the modal and invalidates the idempotency key.
3. **No Automatic Retries**:
   - React Query mutation `retry` must be explicitly set to `false`. Financial mutations must never automatically retry on failure.
4. **Duplicate Submission Prevention**:
   - Confirmation button is disabled and displays a pending spinner once clicked.
5. **No Client-Side Balance Arithmetic**:
   - The frontend must never calculate "projected balance after adjustment". Only backend-returned balances are authoritative.
6. **Authoritative Ledger Trace**:
   - Upon success, the UI displays the `adjustmentId` and provides a direct link to the posted ledger transaction (`/admin/ledger/transactions/[compensatingLedgerTransactionId]`).

---

## 23. Security Threat Analysis

1. **Privilege Escalation**:
   - Non-admin users attempting to reach `/admin/adjustments` are redirected by `ProtectedRoute` and rejected with HTTP 403 by the backend `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`.
2. **Replay & Double-Spend**:
   - Protected by backend idempotency record table with unique constraint on `(actor_id, operation, idempotency_key)`.
3. **Parameter Tampering / IDOR**:
   - The backend validates account existence and currency compatibility under pessimistic row lock. Frontend does not make assumptions about ownership.
4. **XSS in Reason Field**:
   - The `reason` string is rendered using standard React JSX text nodes (zero `dangerouslySetInnerHTML`), preventing script injection.

---

## 24. Accessibility Analysis (WCAG 2.1 AA)

1. **Form Controls**: All inputs (`sourceAccountId`, `targetAccountId`, `amount`, `currency`, `reason`) have unique IDs and explicitly associated `<label>` elements.
2. **Monetary Input**: Clear format hints, accessible error states marked with `role="alert"`, and currency symbol announcements.
3. **Confirmation Dialog**:
   - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` referencing dialog title.
   - Initial focus set to Cancel button to prevent accidental confirmation via keyboard Enter.
   - Focus trapped within modal; native Escape key closes dialog.
4. **Status Feedback**: Live regions (`aria-live="polite"`) for form validation feedback and mutation outcomes.

---

## 25. Proposed Implementation Breakdown for Phase F7-H

To ensure controlled, incremental progress with zero regressions, Phase F7-H should be broken down into the following subphases:

### Subphase F7-H-A — Admin Adjustment Hook & Query Layer
- Implement `useAdminAdjustment(id)` query hook.
- Implement `useAdminCreateAdjustment()` mutation hook (`retry: false`, targeted invalidation of source & target account balance summaries and ledger entries).
- Comprehensive unit/integration tests for hooks and error handling.

### Subphase F7-H-B — Adjustment Workspace & Form Component
- Implement `/admin/adjustments` workspace route.
- Implement `FinancialAdjustmentForm` with account lookups, minor-units money formatting, validation (distinct accounts, valid currency, positive amount, non-blank reason).
- Implement `FinancialAdjustmentLookup` to search and inspect any historical adjustment by UUID.

### Subphase F7-H-C — Confirmation Modal & Idempotency Gate
- Implement `FinancialAdjustmentConfirmModal` with explicit review of all parameters, payload freeze, and on-confirm UUID idempotency key generation.
- Double-click prevention and error rendering (handling 400, 409 conflict, and 422 mismatch).

### Subphase F7-H-D — Authoritative Adjustment Detail & Ledger Navigation
- Implement `/admin/adjustments/[id]` detail view.
- Render authoritative `FinancialAdjustmentResponse` fields.
- Provide deep links to `/admin/ledger/transactions/[compensatingLedgerTransactionId]`, `/admin/accounts/[sourceAccountId]`, and `/admin/accounts/[targetAccountId]`.

### Subphase F7-H-E — Comprehensive Verification & Final Freeze
- Full repository verification (`npm run verify`: typecheck, lint, full test suite, build).
- End-to-end Playwright tests (`tests/e2e/admin-adjustments.spec.ts`).
- Accessibility audit (WCAG 2.1 AA).
- Security and financial integrity audit.
- Final freeze declaration: `F7-H_READY_FOR_FREEZE`.

---

## 26. Explicit Scope Boundaries

### In Scope for F7-H
- Administrative double-entry financial adjustment execution (`POST /api/v1/admin/adjustments`).
- Retrieval of single adjustment by ID (`GET /api/v1/admin/adjustments/{id}`).
- Account selection and currency matching validation.
- Two-step confirmation with explicit warning and idempotency key handling.
- Cross-navigation to account inspector and ledger transaction viewer.

### Out of Scope for F7-H (Strictly Barred)
- Backend code modifications (Java, controllers, services, repositories).
- Database migrations or schema changes.
- Direct balance modification without double-entry ledger entries.
- Synthetic adjustment list endpoints or client-side fake transactions.
- Customer-facing adjustments.
- Automated balance calculations in frontend.

---

## 27. Open Questions / Blockers

1. **No Backend Adjustment List Endpoint**:
   - *Finding*: There is no `GET /api/v1/admin/adjustments` list endpoint.
   - *Resolution*: The UI route `/admin/adjustments` will serve as the **Adjustment Execution & Lookup Workspace**. It provides the creation form, recent submission receipts, and a UUID lookup form to view historical adjustments, without fabricating client-side lists.
2. **Account Status Warnings**:
   - While the backend permits adjustments on frozen or closed accounts for compliance/suspense resolution, the frontend form should warn the operator if either account is `FROZEN` or `CLOSED` to prevent unintended operations.

---

## 28. Final Gap Status

The backend contract, accounting invariants, concurrency locks, idempotency model, error semantics, and frontend prerequisites have been thoroughly analyzed directly from the frozen backend source code. There are zero unresolved contract ambiguities.

### FINAL STATUS:
# `F7-H_GAP_ANALYSIS_READY`
