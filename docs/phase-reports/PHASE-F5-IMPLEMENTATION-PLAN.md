# PHASE F5 IMPLEMENTATION PLAN — REFUNDS, REVERSALS & PAYOUTS
**Distributed Payment & Ledger Platform UI**

**Document**: `docs/phase-reports/PHASE-F5-IMPLEMENTATION-PLAN.md`  
**Phase**: F5 — Refunds, Reversals & Payouts  
**Date**: 2026-09-26  
**Backend Constraint**: Spring Boot Backend is **FROZEN** (`payment-ledger-platform-complete-agent-kit`)  
**Scope**: **FRONTEND ONLY**  
**Final Status**: **F5_IMPLEMENTATION_PLAN_READY**  

---

## 1. Executive Summary

Phase F5 delivers the financial compensation and outbound fund transfer capabilities of the Distributed Payment & Ledger Platform UI: **Refund Creation & Detail**, **Reversal Creation & Detail**, and **Payout Creation & Detail**.

Phases F0 (Foundation & Tooling), F1 (Authentication & Session Security), F2 (Customer Dashboard & Account Presentation), and F3 (Payment Creation, Idempotency & Lifecycle) are **FROZEN**. Phase F4 (Transactions & Ledger Trace) was closed as **`F4_FRONTEND_BLOCKED_BY_FROZEN_BACKEND`** because the frozen backend does not expose customer transaction listing, ledger querying, or payment trace APIs.

In Phase F5, the frozen Spring Boot backend provides authentic, customer- and merchant-accessible REST endpoints for single-resource financial mutations and receipts (`RefundController.java` and `PayoutController.java`). This plan defines the complete frontend architecture, file-by-file changes, idempotency lifecycle, accessibility standards (WCAG 2.1 AA), and automated verification gates required to implement Phase F5 without modifying a single line of backend code.

---

## 2. Verified Backend Contract

All planned frontend implementations interface exclusively with the existing frozen Spring Boot controllers:

### 2.1 Refund Endpoints
- **Create Refund**:
  - `POST /api/v1/payments/{paymentId}/refunds` (`RefundController.java:28`)
  - **Headers**: `Idempotency-Key: <UUID>` (required), `X-Correlation-ID: <UUID>` (optional)
  - **Request Body**:
    ```json
    {
      "amountMinor": 2500,
      "reason": "Customer return - defective merchandise"
    }
    ```
  - **Response Status Codes**:
    - `201 CREATED`: Succeeded; settled on ledger.
    - `202 ACCEPTED`: External gateway timed out; entered `PENDING_RECONCILIATION`.
    - `400 BAD_REQUEST`: Payment not settled or already reversed (`REFUND_NOT_ELIGIBLE`).
    - `403 FORBIDDEN`: Caller is neither payer nor payee owner (`UNAUTHORIZED_FINANCIAL_OPERATION`).
    - `404 NOT_FOUND`: Payment does not exist.
    - `409 CONFLICT`: Idempotency collision (`IDEMPOTENCY_CONCURRENT_REQUEST` / `IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`).
    - `422 UNPROCESSABLE_ENTITY`: Exceeds remaining refundable amount (`REFUND_AMOUNT_EXCEEDS_PAYMENT`), merchant account frozen (`ACCOUNT_FROZEN`), or merchant ledger balance insufficient (`INSUFFICIENT_FUNDS`).
    - `503 SERVICE_UNAVAILABLE`: External gateway declined refund (`PROVIDER_DECLINED`).
- **Get Refund Detail**:
  - `GET /api/v1/refunds/{refundId}` (`RefundController.java:42`)
  - **Response Body (`RefundResponse`)**:
    ```json
    {
      "refundId": "uuid",
      "paymentId": "uuid",
      "amountMinor": 2500,
      "currency": "USD",
      "status": "SETTLED",
      "reason": "Customer return - defective merchandise",
      "providerReference": "ref_mock_12345",
      "compensatingLedgerTransactionId": "uuid",
      "failureReason": null,
      "createdAt": "2026-09-26T14:30:00Z"
    }
    ```

### 2.2 Reversal Endpoints
- **Create Full Reversal**:
  - `POST /api/v1/payments/{paymentId}/reversal` (`RefundController.java:52`)
  - **Headers**: `Idempotency-Key: <UUID>` (required), `X-Correlation-ID: <UUID>` (optional)
  - **Request Body**:
    ```json
    {
      "reason": "Suspected duplicate charge - administrative reversal"
    }
    ```
  - **Response Status Codes**:
    - `201 CREATED`: Succeeded; compensating ledger adjustment posted.
    - `400 BAD_REQUEST`: Payment not settled, or refunds already exist (`REFUND_NOT_ELIGIBLE`).
    - `403 FORBIDDEN`: Caller is neither payer nor payee owner (`UNAUTHORIZED_FINANCIAL_OPERATION`).
    - `409 CONFLICT`: Already reversed (`REVERSAL_ALREADY_EXISTS`), or idempotency conflict.
- **Get Reversal Detail**:
  - `GET /api/v1/reversals/{reversalId}` (`RefundController.java:65`)
  - **Response Body (`ReversalResponse`)**:
    ```json
    {
      "reversalId": "uuid",
      "paymentId": "uuid",
      "amountMinor": 5000,
      "currency": "USD",
      "status": "COMPLETED",
      "reason": "Suspected duplicate charge - administrative reversal",
      "compensatingLedgerTransactionId": "uuid",
      "failureReason": null,
      "createdAt": "2026-09-26T14:35:00Z"
    }
    ```

### 2.3 Payout Endpoints
- **Create Payout**:
  - `POST /api/v1/payouts` (`PayoutController.java:26`)
  - **Headers**: `Idempotency-Key: <UUID>` (required), `X-Correlation-ID: <UUID>` (optional)
  - **Request Body**:
    ```json
    {
      "accountId": "uuid",
      "amountMinor": 10000,
      "currency": "USD"
    }
    ```
  - **Response Status Codes**:
    - `201 CREATED`: Payout settled; debited origin account, credited settlement account.
    - `202 ACCEPTED`: Gateway timed out; entered `PENDING_RECONCILIATION`.
    - `403 FORBIDDEN`: Caller does not own origin account (`UNAUTHORIZED_FINANCIAL_OPERATION`).
    - `404 NOT_FOUND`: Account does not exist.
    - `422 UNPROCESSABLE_ENTITY`: Insufficient ledger balance (`PAYOUT_INSUFFICIENT_FUNDS`), or account frozen (`ACCOUNT_FROZEN`).
    - `503 SERVICE_UNAVAILABLE`: Provider declined payout.
- **Get Payout Detail**:
  - `GET /api/v1/payouts/{payoutId}` (`PayoutController.java:39`)
  - **Response Body (`PayoutResponse`)**:
    ```json
    {
      "payoutId": "uuid",
      "accountId": "uuid",
      "amountMinor": 10000,
      "currency": "USD",
      "status": "SETTLED",
      "providerReference": "po_mock_98765",
      "compensatingLedgerTransactionId": "uuid",
      "failureReason": null,
      "createdAt": "2026-09-26T14:40:00Z"
    }
    ```

---

## 3. Approved F5 Scope

The following capabilities are approved for implementation:
1. **Refund Initiation**: Accessible action on Authoritative Payment Detail page (`/payments/[id]`), enabled only when payment `status === "SETTLED"`.
2. **Refund Modal Form**: Validates positive minor-unit amount, optional reason (max 500 chars), and freezes payload upon confirmation.
3. **Authoritative Refund Detail View**: Dedicated route `/refunds/[id]` displaying authoritative backend metadata, compensating ledger ID, and reconciliation banner if in `PENDING_RECONCILIATION`.
4. **Reversal Initiation**: Accessible action on `/payments/[id]`, enabled only when payment `status === "SETTLED"`.
5. **Reversal Modal Form**: Explains full payment reversal semantics (no partial amount input), enforces mandatory reason, and freezes payload.
6. **Authoritative Reversal Detail View**: Dedicated route `/reversals/[id]` displaying authoritative compensation metadata.
7. **Payout Creation**: Dedicated route `/payouts/new` allowing account owners to request payouts with integer minor units matching account currency.
8. **Authoritative Payout Detail View**: Dedicated route `/payouts/[id]` with reconciliation banner and status tracking.
9. **Navigation Integration**: Link in `CustomerSidebar` to `/payouts/new`.

---

## 4. Blocked Scope & Strict Exclusions

The following are strictly blocked and excluded from Phase F5:
- ❌ **No Refund History / List Index (`/refunds`)**: The backend provides no customer endpoint to list refunds (`GET /api/v1/admin/refunds` is restricted to `ADMIN`/`SYSTEM`).
- ❌ **No Payout History / List Index (`/payouts`)**: The backend provides no customer endpoint to list payouts (`GET /api/v1/admin/payouts` is restricted to `ADMIN`/`SYSTEM`).
- ❌ **No Admin Operation Calling**: The frontend will never call `/api/v1/admin/**`.
- ❌ **No Synthetic Balance Display**: The frontend will not guess or compute available account balances or remaining refundable amounts.
- ❌ **No Backend Modifications**: Zero changes to Spring Boot code or database schemas.

---

## 5. Architecture

```
                                  USER INTERFACE
    ┌───────────────────────────┬───────────────────────────┬───────────────────────────┐
    │     Payment Detail        │      Account View         │      Payout Request       │
    │    /payments/[id]         │     /accounts/[id]        │       /payouts/new        │
    └─────────────┬─────────────┴─────────────┬─────────────┴─────────────┬─────────────┘
                  │                           │                           │
                  ▼                           ▼                           ▼
    ┌───────────────────────────┐             │             ┌───────────────────────────┐
    │  Refund / Reversal Modal  │             │             │   Payout Confirm Modal    │
    └─────────────┬─────────────┘             │             └─────────────┬─────────────┘
                  │                           │                           │
                  ▼                           │                           ▼
    ┌───────────────────────────┐             │             ┌───────────────────────────┐
    │   useCreateRefund Hook    │             │             │    useCreatePayout Hook   │
    │  useCreateReversal Hook   │             │             │                           │
    └─────────────┬─────────────┘             │             └─────────────┬─────────────┘
                  │                           │                           │
                  ▼                           ▼                           ▼
    ┌───────────────────────────────────────────────────────────────────────────────────┐
    │                       API Client (src/lib/api/client.ts)                          │
    │               Bearer JWT + RFC 4122 v4 Idempotency-Key + X-Correlation-ID          │
    └─────────────────────────────────────────┬─────────────────────────────────────────┘
                                              │
                                              ▼
    ┌───────────────────────────────────────────────────────────────────────────────────┐
    │                       FROZEN SPRING BOOT REST BACKEND                             │
    │  POST /payments/{id}/refunds  │  POST /payments/{id}/reversal  │  POST /payouts   │
    │  GET /refunds/{id}            │  GET /reversals/{id}           │  GET /payouts/{id}│
    └───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Models & TypeScript Schemas

### 6.1 Refund Schemas (`src/types/refund.ts`)
```typescript
import { z } from "zod";

export const refundStatusSchema = z.enum([
  "REQUESTED",
  "PROCESSING",
  "SETTLED",
  "FAILED",
  "PENDING_RECONCILIATION",
]);
export type RefundStatus = z.infer<typeof refundStatusSchema>;

export const refundCreateSchema = z.object({
  amountMinor: z.number().int().positive("Refund amount must be strictly positive"),
  reason: z.string().max(500, "Reason cannot exceed 500 characters").optional().nullable(),
});
export type RefundCreateRequest = z.infer<typeof refundCreateSchema>;

export const refundResponseSchema = z.object({
  refundId: z.string().uuid(),
  paymentId: z.string().uuid(),
  amountMinor: z.number().int(),
  currency: z.string().length(3),
  status: z.string(),
  reason: z.string().nullable().optional(),
  providerReference: z.string().nullable().optional(),
  compensatingLedgerTransactionId: z.string().uuid().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type RefundResponse = z.infer<typeof refundResponseSchema>;
```

### 6.2 Reversal Schemas (`src/types/reversal.ts`)
```typescript
import { z } from "zod";

export const reversalStatusSchema = z.enum([
  "COMPLETED",
  "FAILED",
  "PENDING_RECONCILIATION",
]);
export type ReversalStatus = z.infer<typeof reversalStatusSchema>;

export const reversalCreateSchema = z.object({
  reason: z.string().min(1, "Reason is strictly required for reversal").max(500, "Reason cannot exceed 500 characters"),
});
export type ReversalCreateRequest = z.infer<typeof reversalCreateSchema>;

export const reversalResponseSchema = z.object({
  reversalId: z.string().uuid(),
  paymentId: z.string().uuid(),
  amountMinor: z.number().int(),
  currency: z.string().length(3),
  status: z.string(),
  reason: z.string(),
  compensatingLedgerTransactionId: z.string().uuid().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type ReversalResponse = z.infer<typeof reversalResponseSchema>;
```

### 6.3 Payout Schemas (`src/types/payout.ts`)
```typescript
import { z } from "zod";

export const payoutStatusSchema = z.enum([
  "REQUESTED",
  "PROCESSING",
  "SETTLED",
  "FAILED",
  "PENDING_RECONCILIATION",
]);
export type PayoutStatus = z.infer<typeof payoutStatusSchema>;

export const payoutCreateSchema = z.object({
  accountId: z.string().uuid("Invalid origin account ID"),
  amountMinor: z.number().int().positive("Payout amount must be strictly positive"),
  currency: z.string().length(3, "Currency must be 3-letter ISO code"),
});
export type PayoutCreateRequest = z.infer<typeof payoutCreateSchema>;

export const payoutResponseSchema = z.object({
  payoutId: z.string().uuid(),
  accountId: z.string().uuid(),
  amountMinor: z.number().int(),
  currency: z.string().length(3),
  status: z.string(),
  providerReference: z.string().nullable().optional(),
  compensatingLedgerTransactionId: z.string().uuid().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type PayoutResponse = z.infer<typeof payoutResponseSchema>;
```

---

## 7. API Client Plan

### 7.1 Refunds API (`src/features/refunds/api/refunds-api.ts`)
- `createRefund(paymentId: string, idempotencyKey: string, payload: RefundCreateRequest, signal?: AbortSignal): Promise<RefundResponse>`
  - Issues `POST /api/v1/payments/{paymentId}/refunds` with `Idempotency-Key` and `X-Correlation-ID`.
- `getRefund(refundId: string, signal?: AbortSignal): Promise<RefundResponse>`
  - Issues `GET /api/v1/refunds/{refundId}`.
- `createReversal(paymentId: string, idempotencyKey: string, payload: ReversalCreateRequest, signal?: AbortSignal): Promise<ReversalResponse>`
  - Issues `POST /api/v1/payments/{paymentId}/reversal` with `Idempotency-Key` and `X-Correlation-ID`.
- `getReversal(reversalId: string, signal?: AbortSignal): Promise<ReversalResponse>`
  - Issues `GET /api/v1/reversals/{reversalId}`.

### 7.2 Payouts API (`src/features/payouts/api/payouts-api.ts`)
- `createPayout(idempotencyKey: string, payload: PayoutCreateRequest, signal?: AbortSignal): Promise<PayoutResponse>`
  - Issues `POST /api/v1/payouts` with `Idempotency-Key` and `X-Correlation-ID`.
- `getPayout(payoutId: string, signal?: AbortSignal): Promise<PayoutResponse>`
  - Issues `GET /api/v1/payouts/{payoutId}`.

---

## 8. Hook Plan

### 8.1 Mutation Hooks
- `useCreateRefund(paymentId: string)`: TanStack Query `useMutation` calling `refundsApi.createRefund`. `retry: false` to protect against duplicate submission.
- `useCreateReversal(paymentId: string)`: TanStack Query `useMutation` calling `refundsApi.createReversal`. `retry: false`.
- `useCreatePayout()`: TanStack Query `useMutation` calling `payoutsApi.createPayout`. `retry: false`.

### 8.2 Detail & Polling Hooks
- `useRefund(refundId: string)`: TanStack Query `useQuery` calling `refundsApi.getRefund`.
  - Polling coordinator active only when `data.status === "PENDING_RECONCILIATION"`.
  - Max 5 poll attempts, exponential backoff (2s, 3s, 4.5s, 6.75s, 10s), wired `AbortController`.
- `useReversal(reversalId: string)`: TanStack Query `useQuery` calling `refundsApi.getReversal`.
- `usePayout(payoutId: string)`: TanStack Query `useQuery` calling `payoutsApi.getPayout`.
  - Polling coordinator active only when `data.status === "PENDING_RECONCILIATION"`.

---

## 9. Route Plan

| Route | Purpose | Layout / Protection |
| :--- | :--- | :--- |
| `src/app/(customer)/payments/[id]/page.tsx` *(Enhanced)* | Added "Issue Refund" and "Request Reversal" buttons on settled payments. | Protected, Customer Layout |
| `src/app/(customer)/refunds/[id]/page.tsx` | Authoritative Refund Receipt and status display. | Protected, Customer Layout |
| `src/app/(customer)/reversals/[id]/page.tsx` | Authoritative Reversal Receipt and status display. | Protected, Customer Layout |
| `src/app/(customer)/payouts/new/page.tsx` | Payout Creation Form for owned accounts. | Protected, Customer Layout |
| `src/app/(customer)/payouts/[id]/page.tsx` | Authoritative Payout Receipt and status display. | Protected, Customer Layout |

---

## 10. Component Plan

1. **`RefundModal`** (`src/features/refunds/components/refund-modal.tsx`):
   - Form modal embedded in `/payments/[id]`.
   - Positive minor unit amount input, optional reason, idempotency lifecycle, focus trap.
2. **`ReversalModal`** (`src/features/refunds/components/reversal-modal.tsx`):
   - Confirmation modal embedded in `/payments/[id]`.
   - Explains that the operation reverses 100% of the original amount; requires reason.
3. **`RefundStatusCard`** (`src/features/refunds/components/refund-status-card.tsx`):
   - Renders `refundId`, `paymentId`, `amountMinor`, `status`, `compensatingLedgerTransactionId`, copy buttons.
4. **`ReversalStatusCard`** (`src/features/refunds/components/reversal-status-card.tsx`):
   - Renders `reversalId`, `paymentId`, `amountMinor`, `status`, `compensatingLedgerTransactionId`, copy buttons.
5. **`PayoutForm`** (`src/features/payouts/components/payout-form.tsx`):
   - Origin account selection dropdown, amount in minor units, currency validation, payload freezing.
6. **`PayoutConfirmDialog`** (`src/features/payouts/components/payout-confirm-dialog.tsx`):
   - Focus-trapped confirmation modal summarizing target account, amount, and fee details.
7. **`PayoutStatusCard`** (`src/features/payouts/components/payout-status-card.tsx`):
   - Renders `payoutId`, `accountId`, `amountMinor`, `status`, `compensatingLedgerTransactionId`, copy buttons.
8. **Status Badges**:
   - `RefundStatusBadge`, `ReversalStatusBadge`, `PayoutStatusBadge` with WCAG `role="status"` and accessible labels.

---

## 11. State Machine Plan

### 11.1 Refund State Mapping
```
  [REQUESTED] ──► [PROCESSING] ──┬──► [SETTLED]                (Success - 201)
                                 ├──► [FAILED]                 (Declined - 503)
                                 └──► [PENDING_RECONCILIATION] (Timeout - 202)
```
- Unknown values fallback to `UNKNOWN` with neutral badge; never silently treated as settled.

### 11.2 Reversal State Mapping
```
  [PENDING] ──► [COMPLETED]              (Success - 201)
            └──► [FAILED]                 (Declined)
            └──► [PENDING_RECONCILIATION] (Timeout - 202)
```

### 11.3 Payout State Mapping
```
  [REQUESTED] ──► [PROCESSING] ──┬──► [SETTLED]                (Success - 201)
                                 ├──► [FAILED]                 (Declined - 503)
                                 └──► [PENDING_RECONCILIATION] (Timeout - 202)
```

---

## 12. Idempotency Lifecycle Plan

```
User enters amount & reason
             ↓
Client validates inputs (Zod)
             ↓
User clicks "Confirm & Submit"
             ↓
Payload is frozen in memory
             ↓
Generate fresh RFC 4122 v4 UUID (K1)
             ↓
Disable submit buttons (double-click lock)
             ↓
Dispatch API mutation with K1
             ↓
 ┌───────────────────────┴───────────────────────┐
 ▼                                               ▼
Authoritative Response (201 / 202 / 4xx)        Ambiguous Network Timeout
 - Store result in query cache                   - Preserve K1 and frozen payload
 - Navigate to /[entity]/[id]                    - Render retry button with SAME K1
                                                 - Never generate K2 automatically
```

---

## 13. Error Handling Plan (RFC 7807)

All non-2xx responses are mapped to structured alerts via `PaymentErrorState`:
- `REFUND_AMOUNT_EXCEEDS_PAYMENT` (422): "Requested refund exceeds the remaining refundable amount."
- `REFUND_NOT_ELIGIBLE` (400): "This payment is not eligible for refund or has already been reversed."
- `REVERSAL_ALREADY_EXISTS` (409): "This payment has already been reversed."
- `PAYOUT_INSUFFICIENT_FUNDS` (422): "Account ledger balance is insufficient for this payout."
- `ACCOUNT_FROZEN` (422): "Account is administratively frozen; debits are prohibited."
- `IDEMPOTENCY_CONCURRENT_REQUEST` (409): "A duplicate request is currently being processed. Please wait."
- `SERVICE_UNAVAILABLE` (503): "The external banking provider declined the operation."

---

## 14. Security Plan

1. **Anti-IDOR Protection**: The frontend preserves backend 403 and 404 masking without revealing resource existence.
2. **Strict Admin Endpoint Exclusion**: Zero calls to `/api/v1/admin/**`.
3. **Double-Click Lockout**: Disables mutation buttons immediately on submit to prevent duplicate financial orders.
4. **XSS Prevention**: All reason strings, external references, and correlation IDs are rendered as standard React JSX text nodes (automatic HTML escaping).
5. **No Token Storage**: Access tokens remain strictly in-memory per Phase F1 security standards.

---

## 15. Accessibility Plan (WCAG 2.1 AA)

- **Modals**: Focus trapped within dialogs; `Escape` key closes dialog; focus returns to trigger button on dismiss.
- **Form Controls**: Explicit `<label>` elements linked via `htmlFor`/`id`.
- **Live Regions**: Form validation errors announce via `role="alert"`; polling progress announces via `aria-live="polite"`.
- **Currency Polarity**: Screen reader text explicitly announces amounts (e.g. `aria-label="Refund amount: 25.00 US Dollars"`).
- **Focus Rings**: High-contrast `focus-visible:ring-2 focus-visible:ring-primary-500` on all interactive controls.

---

## 16. Performance Plan

- **First Load JS Budget**: Routes (`/refunds/[id]`, `/reversals/[id]`, `/payouts/new`, `/payouts/[id]`) must remain under `< 145 kB` First Load JS.
- **Stale Time Policy**:
  - Settled records (`SETTLED`, `COMPLETED`): `staleTime = 5 * 60 * 1000` (5 minutes).
  - Indeterminate records (`PENDING_RECONCILIATION`): `staleTime = 0` (actively coordinated by polling).
- **Bundle Hygiene**: No heavy third-party modal or date-picker libraries; reuse existing Tailwind and Lucide icons.

---

## 17. Testing Plan

### 17.1 Unit Tests
- `tests/unit/refund-types.test.ts`: Zod schema validation, positive amount checks, status mapping.
- `tests/unit/reversal-types.test.ts`: Mandatory reason validation, status mapping.
- `tests/unit/payout-types.test.ts`: Currency ISO length, positive amount, status mapping.

### 17.2 Component Tests
- `tests/components/refund-modal.test.tsx`: Form rendering, validation, payload freezing, submission.
- `tests/components/reversal-modal.test.tsx`: Mandatory reason requirement, 100% amount explanation.
- `tests/components/payout-form.test.tsx`: Account selection, minor unit input, confirm dialog opening.
- `tests/components/refund-status-card.test.tsx`: Metadata presentation, compensating ledger ID display.
- `tests/components/payout-status-card.test.tsx`: Authoritative payout metadata presentation.

### 17.3 Integration Tests
- `tests/integration/refunds-api.test.ts`: 201 Created, 202 Accepted, 400/403/422/503 errors, Idempotency-Key propagation.
- `tests/integration/payouts-api.test.ts`: 201 Created, 202 Accepted, 422 `PAYOUT_INSUFFICIENT_FUNDS`, 422 `ACCOUNT_FROZEN`.

### 17.4 Accessibility Tests
- `tests/accessibility/refund-a11y.test.tsx`: Focus trap, modal escape, aria labels.
- `tests/accessibility/payout-a11y.test.tsx`: Form labels, live announcements.

### 17.5 E2E Playwright Tests
- `tests/e2e/refunds.spec.ts`:
  1. Open settled payment $\rightarrow$ Open Refund Modal $\rightarrow$ Submit partial refund $\rightarrow$ View `/refunds/[id]` receipt.
  2. Open settled payment $\rightarrow$ Request Reversal $\rightarrow$ View `/reversals/[id]` receipt.
- `tests/e2e/payouts.spec.ts`:
  1. Open `/payouts/new` $\rightarrow$ Submit payout $\rightarrow$ View `/payouts/[id]` receipt.
  2. Payout insufficient funds 422 error display.

---

## 18. Documentation Plan

- Update `docs/phases/PHASE-F5.md` with final scope and status.
- Create `docs/refunds/refund-architecture.md` detailing financial compensation flows.
- Create `docs/phase-reports/PHASE-F5-FINAL.md` upon completion of implementation and verification.

---

## 19. File-by-File Change Plan

### New Files to Create:
1. `src/types/refund.ts` — DTOs, schemas, and status enums for refunds.
2. `src/types/reversal.ts` — DTOs, schemas, and status enums for reversals.
3. `src/types/payout.ts` — DTOs, schemas, and status enums for payouts.
4. `src/features/refunds/api/refunds-api.ts` — API client for refund and reversal endpoints.
5. `src/features/payouts/api/payouts-api.ts` — API client for payout endpoints.
6. `src/features/refunds/hooks/use-create-refund.ts` — TanStack Query mutation hook for refunds.
7. `src/features/refunds/hooks/use-refund.ts` — TanStack Query query hook with bounded polling.
8. `src/features/refunds/hooks/use-create-reversal.ts` — TanStack Query mutation hook for reversals.
9. `src/features/refunds/hooks/use-reversal.ts` — TanStack Query query hook for reversals.
10. `src/features/payouts/hooks/use-create-payout.ts` — TanStack Query mutation hook for payouts.
11. `src/features/payouts/hooks/use-payout.ts` — TanStack Query query hook with bounded polling.
12. `src/features/refunds/components/refund-status-badge.tsx` — Accessible refund status badge.
13. `src/features/refunds/components/reversal-status-badge.tsx` — Accessible reversal status badge.
14. `src/features/refunds/components/refund-modal.tsx` — Refund creation dialog.
15. `src/features/refunds/components/reversal-modal.tsx` — Reversal confirmation dialog.
16. `src/features/refunds/components/refund-status-card.tsx` — Authoritative refund detail card.
17. `src/features/refunds/components/reversal-status-card.tsx` — Authoritative reversal detail card.
18. `src/features/payouts/components/payout-status-badge.tsx` — Accessible payout status badge.
19. `src/features/payouts/components/payout-confirm-dialog.tsx` — Focus-trapped payout confirm modal.
20. `src/features/payouts/components/payout-form.tsx` — Payout creation form.
21. `src/features/payouts/components/payout-status-card.tsx` — Authoritative payout detail card.
22. `src/app/(customer)/refunds/[id]/page.tsx` — Customer refund detail route.
23. `src/app/(customer)/reversals/[id]/page.tsx` — Customer reversal detail route.
24. `src/app/(customer)/payouts/new/page.tsx` — Customer payout creation route.
25. `src/app/(customer)/payouts/[id]/page.tsx` — Customer payout detail route.
26. `tests/unit/refund-types.test.ts`
27. `tests/unit/reversal-types.test.ts`
28. `tests/unit/payout-types.test.ts`
29. `tests/components/refund-modal.test.tsx`
30. `tests/components/reversal-modal.test.tsx`
31. `tests/components/payout-form.test.tsx`
32. `tests/components/refund-status-card.test.tsx`
33. `tests/components/payout-status-card.test.tsx`
34. `tests/integration/refunds-api.test.ts`
35. `tests/integration/payouts-api.test.ts`
36. `tests/accessibility/refund-a11y.test.tsx`
37. `tests/accessibility/payout-a11y.test.tsx`
38. `tests/e2e/refunds.spec.ts`
39. `tests/e2e/payouts.spec.ts`
40. `docs/refunds/refund-architecture.md`

### Existing Files to Modify (Additive Only):
1. `src/app/(customer)/payments/[id]/page.tsx`: Render "Issue Refund" and "Request Reversal" buttons on settled payments.
2. `src/components/navigation/customer-sidebar.tsx`: Add "Payouts" navigation link.

---

## 20. Dependency Impact

- **New Third-Party Packages**: **0** (Zero).
- Uses existing dependencies: `react`, `next`, `@tanstack/react-query`, `zod`, `lucide-react`, `tailwindcss`.
- Zero risk of dependency bloat or bundle expansion.

---

## 21. Verification Gates

Before Phase F5 can be declared complete, the following gates must pass:
1. `npm run typecheck` (`tsc --noEmit`): 0 errors.
2. `npm run lint` (`next lint`): 0 warnings, 0 errors.
3. `npm run test` (`vitest run`): 100% pass across all unit, component, integration, and accessibility tests.
4. `npm run build` (`next build`): Clean production bundle generation (< 145 kB First Load JS).
5. `npx playwright test`: All E2E flows passing against running dev server.
6. Verification scripts: `verify-repo.ps1`, `check-secrets.ps1`, `verify-env.ps1` exit with code 0.

---

## 22. Freeze Criteria

1. All 5 new routes operate authoritatively against existing backend contracts.
2. Idempotency keys are generated strictly on explicit user confirmation with frozen payloads.
3. Ambiguous outcomes never trigger automatic re-submission or duplicate mutations.
4. Zero calls are made to `/api/v1/admin/**`.
5. No refund or payout list views are created.
6. All automated verification gates pass with zero errors.

---

## 23. Rollback Strategy

Because Phase F5 introduces strictly additive files and non-breaking modifications to `/payments/[id]` and `customer-sidebar.tsx`:
- Any defect during implementation can be rolled back cleanly via Git checkpoint tag `frontend-f3-ready`.
- Previous phase behaviors (F0, F1, F2, F3) remain isolated and unaffected.

---

## 24. Final Implementation Readiness

### FINAL STATUS:

# **F5_IMPLEMENTATION_PLAN_READY**

The Phase F5 Implementation Plan is complete, strictly scoped to verified customer-accessible backend contracts, and ready for execution upon user authorization. Zero source code or backend files were modified during this planning step.
