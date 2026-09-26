# Phase F3 — Payment Creation, Idempotency & Payment Lifecycle

---

## 1. Scope & Objective

Implement authoritative payment creation, strict idempotency enforcement, and complete payment lifecycle tracking against the frozen Spring Boot backend (`payment-ledger-platform-complete-agent-kit`).

### Implemented Endpoints
- `POST /api/v1/payments` — Creates customer payment with mandatory `Idempotency-Key` and `Authorization: Bearer <token>`.
- `GET /api/v1/payments/{id}` — Queries authoritative payment status and detail with `AbortSignal` cancellation.

### Out of Scope (Frozen Boundaries)
- ❌ Customer payment history / listing (`GET /api/v1/payments` is admin-only; F4).
- ❌ Double-entry ledger UI or journal exploration (F4).
- ❌ Account balance calculation or display.
- ❌ Refunds, reversals, or payouts (F5/F6).
- ❌ Speculative backend endpoints or mutations.

---

## 2. Core Deliverables

1. **Payment Types & Schema** (`src/types/payment.ts`): Request/Response DTOs, Zod schema validation, and status mapping state machine.
2. **Deterministic Money Parser** (`src/features/payments/utils/money-parser.ts`): Deterministic string and BigInt arithmetic, 2 decimal places, zero floating-point math, validated against `Number.MAX_SAFE_INTEGER`.
3. **Sandbox Payment Tokens** (`src/features/payments/tokens/payment-method-tokens.ts`): Isolated sandbox tokens (`tok_visa`, `tok_decline`, `tok_timeout`, `tok_custom`).
4. **API Client** (`src/features/payments/api/payments-api.ts`): `createPayment` and `getPayment` with header injection and AbortSignal support.
5. **TanStack Query Hooks** (`src/features/payments/hooks/`): `useCreatePayment` (`retry: false`) and `usePayment` with deterministic bounded polling coordinator (max 10 attempts, ~3s interval, wired `AbortController`).
6. **UI Components** (`src/features/payments/components/`):
   - `PaymentForm`: Pre-submission validation, payload freeze, double-click protection.
   - `PaymentConfirmDialog`: Accessible confirmation dialog with focus trap.
   - `PaymentStatusBadge`: Visual status with semantic `role="status"` and accessible aria-labels.
   - `PaymentStatusCard`: Authoritative detail card with landmark region and dl/dt/dd metadata.
   - `PaymentReconciliationBanner`: Polite live alert for in-progress reconciliation with manual Check Status.
   - `PaymentErrorState`: Assertive live alert presenting RFC 7807 problem details and correlation tracking.
7. **Customer Routes**:
   - `/payments/new`: Protected payment creation flow.
   - `/payments/[id]`: Authoritative payment detail inspector.
8. **Navigation**: Minimum required addition of "Payments" in `CustomerSidebar`.

---

## 3. Verification Summary

- **Typecheck**: 0 errors (`npm run typecheck`).
- **Lint**: 0 errors, 0 warnings (`npm run lint`).
- **Unit/Component/Integration/A11y Tests**: 30 test files, 122 tests passed (100% pass).
- **Playwright E2E**: 12/12 tests passed (100% pass).
- **Build**: Successfully compiled, First Load JS < 136 kB (budget < 145 kB).
- **Security & Repo Verification**: All verification scripts passed (`verify-repo.ps1`, `check-secrets.ps1`, `verify-env.ps1`).

---

## 4. Status
**READY_FOR_FREEZE**
