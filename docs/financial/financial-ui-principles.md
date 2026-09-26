# Financial UI Principles & Invariants

**Platform**: Distributed Payment & Ledger Platform UI  
**Phase**: F0 — Architecture & Methodology Bootstrap  

---

## 1. Zero Client Financial Authority

The frontend is never authoritative for financial calculations.
- Account balances are calculated exclusively by the backend double-entry ledger.
- Settlement status is determined strictly by the Spring Boot payment orchestration engine.
- The UI must never display an unconfirmed optimistic balance as settled.
- Ambiguous network failures (e.g. HTTP 504 Gateway Timeout or HTTP 202 Accepted) must transition to an explicit `PENDING_RECONCILIATION` state rather than showing success or failure.

---

## 2. Integer Minor Unit Representation

1. **No Floating-Point Arithmetic**:
   - Money must never be stored as floating-point numbers (`0.1 + 0.2 = 0.30000000000000004`).
   - All internal monetary representations use integer minor units (`amountMinor: number`).
   - For example: `$50.00 USD` is represented as `5000` minor units.
2. **Explicit Currency Association**:
   - Every monetary figure must specify an ISO 4217 currency code (e.g. `USD`, `EUR`, `GBP`, `JPY`).
3. **Lossless Display Formatting**:
   - Display conversion is performed at the boundary using `Intl.NumberFormat` with explicit currency fractions (e.g., JPY has 0 decimals, USD has 2, KWD has 3).

---

## 3. Idempotency & Mutation Safety

1. **Mandatory Unique Keys**:
   - Every state-mutating operation (`POST /api/v1/payments`, `POST /api/v1/refunds`, `POST /api/v1/payouts`) must include an `Idempotency-Key` header with a client-generated UUID v4.
2. **Zero Silent Retries**:
   - Mutations in React Query are configured with `retry: false`.
   - If an HTTP request fails ambiguously, the UI must prompt the user or poll for existing transaction status rather than silently re-issuing a payment request.
3. **Handling Idempotency Conflicts**:
   - `409 IDEMPOTENCY_CONCURRENT_REQUEST`: Inform user that payment is actively processing.
   - `409 IDEMPOTENCY_KEY_PAYLOAD_MISMATCH`: Critical client defect; prevent reuse of keys across divergent payloads.
