# Phase F5 — Refunds, Reversals & Payouts

## Status
IMPLEMENTED (READY FOR FREEZE)

## Scope Summary
Phase F5 establishes the financial compensation and outbound transfer flows in the Distributed Payment & Ledger Platform UI, strictly adhering to the frozen Spring Boot backend contracts.

### Implemented Capabilities
1. **Refund Creation**: `POST /api/v1/payments/{paymentId}/refunds` with positive integer minor units, optional reason, UUIDv4 idempotency key, and two-step confirmation.
2. **Refund Detail**: `GET /api/v1/refunds/{refundId}` (`/refunds/[id]`) displaying authoritative receipt, status badge, provider reference, and compensating ledger transaction ID.
3. **Reversal Creation**: `POST /api/v1/payments/{paymentId}/reversal` with mandatory reason, full payment reversal guarantee (no amount input), UUIDv4 idempotency key, and two-step confirmation.
4. **Reversal Detail**: `GET /api/v1/reversals/{reversalId}` (`/reversals/[id]`).
5. **Payout Creation**: `POST /api/v1/payouts` (`/payouts/new`) with origin account ID, amount minor, currency, UUIDv4 idempotency key, two-step confirmation, and zero fee calculations/displays.
6. **Payout Detail**: `GET /api/v1/payouts/{payoutId}` (`/payouts/[id]`).

### Strictly Excluded Scope
- Customer Refund List / History (Admin-only backend endpoint `403 Forbidden`).
- Customer Payout List / History (Admin-only backend endpoint `403 Forbidden`).
- Backend modifications (Spring Boot backend is frozen).
- Ledger UI & Transaction History (Closed in F4 assessment).
- Fee display or calculation in Payouts.
- Synthetic balances or client-side ledger estimations.

## Invariants Maintained
- Idempotency key generated strictly upon explicit confirmation with frozen payload.
- Ambiguous network outcomes preserve K1; no automatic K2 generation.
- Bounded polling with AbortController for `PENDING_RECONCILIATION`.
- WCAG 2.1 AA compliant keyboard navigation, focus trap, and ARIA attributes.
