# PHASE F8-D — ADMIN GOVERNANCE, NOTIFICATIONS, REFUNDS & PAYOUTS IMPLEMENTATION REPORT

**Platform:** Distributed Payment & Ledger Platform Frontend  
**Phase:** F8-D — Admin Governance, Notifications, Refunds & Payouts  
**Status:** F8-D 🔒 READY FOR FREEZE  
**Date:** September 26, 2026  
**Auditor / Engineer:** Senior Frontend Platform & Operations Reliability Engineer  

---

## 1. Executive Summary

Phase F8-D delivers the administrative governance, outbox notification monitoring, and financial refund/payout operational oversight surfaces for the Distributed Payment & Ledger Platform frontend.

All implemented interfaces strictly consume verified Spring Boot backend APIs. The frontend acts exclusively as a presentation, interaction, and API-consumption layer:
- **Zero client-side financial calculations:** All balances, refund values, and payout disbursements are formatted directly from authoritative integer minor units (`amountMinor`, `currency`) via `formatMoney`.
- **Zero speculative endpoints or unverified mutations:** Backend capabilities were verified against `AdminUserController`, `AdminNotificationController`, `AdminRefundController`, and `AdminPayoutController`. Supported mutations are restricted to `retryAdminNotification` and `runAdminNotificationWorker`.
- **Strict mutation safety:** All mutations enforce `retry: false`, require explicit confirmation via accessible dialog modals, prohibit optimistic updates, and invalidate authoritative TanStack Query caches upon completion.
- **Uncompromised access control:** The administrative boundary (`ProtectedRoute` with `allowedRoles={['ADMIN', 'SYSTEM']}`) halts unauthenticated visitors and unauthorized roles (`CUSTOMER`, `MERCHANT`) before any admin API queries execute.

Every verification gate passed completely: 80 Vitest test suites (636 tests passing), 7 Playwright E2E scenarios passing, 0 TypeScript errors, 0 ESLint errors/warnings, and an optimized production build.

---

## 2. Backend Contract Matrix

| Domain | HTTP Method | Exact Endpoint | Request Body / Params | Response DTO | Read / Mutation | Mutation Safety |
|---|---|---|---|---|---|---|
| **Users** | `GET` | `/api/v1/admin/users` | `page`, `size`, `sort`, `role`, `status`, `email` | `Page<UserAdminResponse>` | Read-only | N/A |
| **Users** | `GET` | `/api/v1/admin/users/{id}` | Path: `id` (UUID) | `UserAdminResponse` | Read-only | N/A |
| **Notifications** | `GET` | `/api/v1/admin/notifications` | `page`, `size`, `sort`, `status` | `Page<NotificationAdminResponse>` | Read-only | N/A |
| **Notifications** | `GET` | `/api/v1/admin/notifications/{id}` | Path: `id` (UUID) | `NotificationDetailResponse` | Read-only | N/A |
| **Notifications** | `POST` | `/api/v1/admin/notifications/{id}/retry` | Path: `id` (UUID) | `NotificationAdminResponse` | State-changing | `retry: false`, Modal Confirmation |
| **Notifications** | `POST` | `/api/v1/admin/notifications/run-worker` | Query: `limit?: number` | `number` (processed count) | State-changing | `retry: false`, Modal Confirmation |
| **Refunds** | `GET` | `/api/v1/admin/refunds` | `page`, `size`, `sort`, `paymentId`, `status` | `Page<RefundAdminResponse>` | Read-only | N/A |
| **Refunds** | `GET` | `/api/v1/admin/refunds/{id}` | Path: `id` (UUID) | `RefundAdminResponse` | Read-only | N/A |
| **Payouts** | `GET` | `/api/v1/admin/payouts` | `page`, `size`, `sort`, `accountId`, `status` | `Page<PayoutAdminResponse>` | Read-only | N/A |
| **Payouts** | `GET` | `/api/v1/admin/payouts/{id}` | Path: `id` (UUID) | `PayoutAdminResponse` | Read-only | N/A |

---

## 3. Contract Verification

Before authoring code, backend controllers in Spring Boot were verified:
1. **User Governance:** `AdminUserController` provides `GET /api/v1/admin/users` and `GET /api/v1/admin/users/{id}`. No administrative mutation endpoints (disable user, password reset, role modification) exist in the backend. As per non-negotiable rules, none were fabricated.
2. **Notifications:** `AdminNotificationController` provides query endpoints, single delivery redrive (`POST /{id}/retry`), and batch worker trigger (`POST /run-worker`).
3. **Refunds:** `AdminRefundController` provides directory query and detail query. Administrative override mutations do not exist; refunds are initiated via customer/merchant payment flows.
4. **Payouts:** `AdminPayoutController` provides directory query and detail query. Direct administrative payout mutations do not exist in the admin controller.

---

## 4. Scope

Implemented in F8-D:
- 8 Application Routes:
  - `/admin/users` (directory) & `/admin/users/[userId]` (detail)
  - `/admin/notifications` (directory) & `/admin/notifications/[id]` (detail)
  - `/admin/refunds` (directory) & `/admin/refunds/[id]` (detail)
  - `/admin/payouts` (directory) & `/admin/payouts/[id]` (detail)
- 10 TanStack Query Hooks across 6 feature modules
- 14 Domain UI Components (status badges, server-side filter bars, data tables, action confirmation modal)
- 4 comprehensive test suites (unit hooks, component tests, page integration tests, auth & financial safety tests)
- 1 end-to-end Playwright test suite covering all 7 critical scenarios

---

## 5. Authorization Model

The authorization architecture established in F8-A/F8-C is strictly enforced:
- **Enforcement Layer:** `src/app/(admin)/layout.tsx` wraps all admin routes in `<ProtectedRoute allowedRoles={['ADMIN', 'SYSTEM']}>`.
- **Pre-Execution Halt:** Unauthorized roles (`CUSTOMER`, `MERCHANT`) are blocked at the layout boundary and rendered an `access-restricted-alert` alert dialog before any child page mounts or query is dispatched.
- **Unauthenticated Visitors:** Automatically redirected to `/login?redirect=...`.
- **Backend Authority:** Backend remains authoritative; frontend validates session tokens without duplicating or overriding backend business policies.

---

## 6. User Governance

- **Route:** `/admin/users` & `/admin/users/[userId]`
- **Capabilities:**
  - Server-side paginated user table with sort ordering (`createdAt,desc`).
  - Server-supported filtering by `role` (`ADMIN`, `SYSTEM`, `MERCHANT`, `CUSTOMER`), `status` (`ACTIVE`, `SUSPENDED`, `LOCKED`, `DELETED`), and `email`.
  - Identity inspection: displays User UUID, Primary Email, Assigned Role, Status, Creation Date, and Last Updated Date.
  - Immutability notice: informs operator that user mutations are governed by internal identity provider tier.

---

## 7. Notifications

- **Route:** `/admin/notifications` & `/admin/notifications/[id]`
- **Capabilities:**
  - Multi-channel delivery monitoring (`EMAIL`, `SMS`, `WEBHOOK`).
  - Delivery status monitoring (`PENDING`, `PROCESSING`, `SENT`, `FAILED`, `EXHAUSTED`).
  - Server-side filtering by notification status.
  - Detail inspection: rendered subject, rendered body, worker lease ID, worker lease expiration, sent timestamp.
  - Delivery attempt timeline table displaying attempt number, worker ID, provider status, HTTP status code, error message, and timestamp.
  - Supported Administrative Mutations:
    - **Trigger Worker Sweep:** dispatches background worker for pending outbox events.
    - **Retry Delivery:** schedules immediate redelivery for failed/exhausted notifications.

---

## 8. Admin Refunds

- **Route:** `/admin/refunds` & `/admin/refunds/[id]`
- **Capabilities:**
  - Inspection of authoritative customer and merchant refund records.
  - Server-supported filtering by `paymentId` and `status` (`SETTLED`, `PROCESSING`, `REQUESTED`, `PENDING_RECONCILIATION`, `FAILED`).
  - Authoritative amount display formatted via `formatMoney(r.amountMinor, r.currency)`.
  - Lineage trace link directly into forensic payment investigation (`/admin/investigations/payments/{paymentId}`).
  - External banking/gateway reference tracking.
  - Strict financial invariance: zero client balance recomputations or fee deductions.

---

## 9. Admin Payouts

- **Route:** `/admin/payouts` & `/admin/payouts/[id]`
- **Capabilities:**
  - Inspection of authoritative merchant disbursement payouts.
  - Server-supported filtering by `accountId` and `status` (`SETTLED`, `PROCESSING`, `REQUESTED`, `PENDING_RECONCILIATION`, `FAILED`).
  - Authoritative disbursement amount display formatted via `formatMoney(p.amountMinor, p.currency)`.
  - Direct reference link to originating platform account (`/admin/accounts/{accountId}`).
  - Provider banking reference tracking and audit timestamps.
  - Zero client-side fee, net settlement, or reserve deductions.

---

## 10. Routes

| Path | File Location | Purpose |
|---|---|---|
| `/admin/users` | `src/app/(admin)/admin/users/page.tsx` | User directory list and server filters |
| `/admin/users/[userId]` | `src/app/(admin)/admin/users/[userId]/page.tsx` | User identity profile and audit details |
| `/admin/notifications` | `src/app/(admin)/admin/notifications/page.tsx` | Outbox notifications directory and worker trigger |
| `/admin/notifications/[id]` | `src/app/(admin)/admin/notifications/[id]/page.tsx` | Notification detail, rendered body, deliveries, retry action |
| `/admin/refunds` | `src/app/(admin)/admin/refunds/page.tsx` | Administrative refund directory and filters |
| `/admin/refunds/[id]` | `src/app/(admin)/admin/refunds/[id]/page.tsx` | Authoritative refund detail and payment trace link |
| `/admin/payouts` | `src/app/(admin)/admin/payouts/page.tsx` | Administrative payout directory and filters |
| `/admin/payouts/[id]` | `src/app/(admin)/admin/payouts/[id]/page.tsx` | Authoritative payout detail and account reference |

---

## 11. API Integration

Endpoints are consumed through standard API functions in `src/lib/api/endpoints/admin-api.ts`:
- `getAdminUsers(params)`
- `getAdminUser(id)`
- `getAdminNotifications(params)`
- `getAdminNotification(id)`
- `retryAdminNotification(id)`
- `runAdminNotificationWorker(params)`
- `getAdminRefunds(params)`
- `getAdminRefund(id)`
- `getAdminPayouts(params)`
- `getAdminPayout(id)`

All queries utilize TanStack Query `useQuery` wrapped in domain hooks with normalized parameters and centralized query key factories.

---

## 12. Filters

All filters map 1-to-1 to verified backend query parameters:
- **Users:** `role`, `status`, `email`
- **Notifications:** `status`
- **Refunds:** `paymentId`, `status`
- **Payouts:** `accountId`, `status`

No client-side dataset filtering is performed; active filters serialize to URL search parameters for back/forward navigation and reload fidelity.

---

## 13. Pagination

Standard Spring Data `Page<T>` contracts are consumed:
- `page`: 0-indexed integer passed to backend.
- `size`: Clamped between 1 and 100 (default 20).
- `PaymentPagination` component provides accessible previous/next navigation and records summary (`Showing X to Y of Z`).

---

## 14. Detail Views

Detail pages follow the structured standard:
1. **Information / Identification:** Resource UUID, Primary Subject / Recipient / Reference
2. **Operation / Resource Details:** Core attributes, trace links (e.g. payment investigation trace link, account link)
3. **Status:** Authoritative badge with semantic color variant
4. **Provider / External Reference:** External gateway reference ID
5. **Audit Information:** `createdAt` and `updatedAt` timestamps formatted in local timezone
6. **Financial Policy / Governance Note:** Explanatory guidance documenting PostgreSQL double-entry authority

---

## 15. Supported Actions

- **Run Notification Worker:** Dispatches pending outbox queue sweep (`POST /api/v1/admin/notifications/run-worker`).
- **Retry Notification Delivery:** Re-schedules gateway delivery attempt (`POST /api/v1/admin/notifications/{id}/retry`).

---

## 16. Confirmation UX

Operational mutations require explicit user confirmation through `NotificationActionModal`:
- Role: `dialog`, `aria-modal="true"`, with `aria-labelledby`.
- Displays operational title, contextual description, and an explicit `Consequence` warning banner.
- Accessible Cancel and Execute buttons with pending spinner state to prevent duplicate clicks.

---

## 17. Mutation Safety

- **`retry: false`:** Configured strictly on `useRetryAdminNotification` and `useRunAdminNotificationWorker`.
- **Zero Automatic Replays:** Network timeouts or ambiguous server outcomes do not automatically re-dispatch.
- **Cache Invalidation:** On success, queries are invalidated (`queryClient.invalidateQueries`) and refetched fresh from PostgreSQL authority.
- **Zero Optimistic Updates:** State updates only upon authoritative HTTP 200 responses.

---

## 18. Idempotency

- Mutations are caller-controlled and dispatched exactly once per user confirmation.
- No client-side key regeneration or mutation retry loops.

---

## 19. Error Handling

- Uses `AdminErrorState` conforming to RFC 7807 problem details.
- Displays sanitized titles and details with correlation IDs when provided by backend.
- Prohibits leakage of JWTs, authorization headers, database stack traces, or internal server paths.

---

## 20. Loading / Empty States

- Skeleton placeholders preserve layout stability during network latency.
- Meaningful empty states indicate when zero records match applied filter criteria.
- Zero fake rows, zero simulated data, and zero mock monetary amounts.

---

## 21. Security

- Authentication and authorization verified at route layout boundary.
- Zero credentials or tokens logged to browser console or telemetry.
- Safe rendering of notification body payloads (`whitespace-pre-wrap` with zero `dangerouslySetInnerHTML`).
- Direct database, Kafka, or Redis access = 0. All browser communication goes through approved REST endpoints.

---

## 22. Accessibility

- Semantic HTML headings (`h1`, `h2`, `h3`) with logical structure.
- Accessible table headers using `scope="col"`.
- Associated `<label htmlFor="...">` on all filter inputs and selects.
- Accessible modal dialogs with focus traps, aria attributes, and keyboard operability.
- No color-only status indicators; badges display text labels.

---

## 23. Performance

- Server-side pagination and database-level query filtering prevent massive DOM nodes.
- TanStack Query stale time caching (`staleTime: 30 * 1000`) avoids redundant network roundtrips.
- Code splitting and dynamic route chunking managed natively by Next.js App Router.

---

## 24. Unit/Component Test Matrix

| Test Suite | File | Tests | Status |
|---|---|---|---|
| Admin Governance Hooks | `tests/unit/admin-governance-hooks.test.tsx` | 14 | ✅ PASS |
| Admin Governance Components | `tests/components/admin-governance-components.test.tsx` | 15 | ✅ PASS |
| Admin Governance Pages | `tests/components/admin-governance-pages.test.tsx` | 8 | ✅ PASS |
| Auth & Financial Safety | `tests/unit/admin-governance-authorization-safety.test.tsx` | 7 | ✅ PASS |

---

## 25. Playwright Results

File: `tests/e2e/admin-governance.spec.ts` (Execution completed with exit code 0):

```
Running 7 tests using 7 workers

[1/7] [chromium] › 2. CUSTOMER role is denied access to admin governance surfaces
[2/7] [chromium] › 3. MERCHANT role is denied access to admin governance surfaces
[3/7] [chromium] › 7. ADMIN access to Payouts: directory renders formatted amounts, navigates to detail
[4/7] [chromium] › 5. ADMIN access to Notifications: inspect list, run worker sweep, inspect detail, retry mutation
[5/7] [chromium] › 1. Unauthenticated visitor is redirected from /admin/users to /login
[6/7] [chromium] › 4. ADMIN access to User Governance: lists users and navigates to detail
[7/7] [chromium] › 6. ADMIN access to Refunds: directory renders formatted amounts, navigates to detail

  7 passed (18.9s)
```

---

## 26. Typecheck

Command: `npm run typecheck`  
Result: Exit code 0 (0 errors)

---

## 27. Lint

Command: `npm run lint`  
Result: Exit code 0 (0 errors, 0 warnings)

---

## 28. Build

Command: `npm run build`  
Result: Exit code 0 (Compiled successfully, static & dynamic routes generated)

---

## 29. Verify

Command: `npm run verify`  
Pipeline: `typecheck && lint && test && build`  
Result: Exit code 0 (80 test files passed, 636 tests passed)

---

## 30. Dependency Audit

- New npm packages added: **0**
- `package.json` modifications: **0**
- `package-lock.json` modifications: **0**

---

## 31. Git Scope Audit

- Backend Spring Boot modifications: **0**
- Flyway database migration modifications: **0**
- Database schema changes: **0**
- Customer/Merchant checkout flow regressions: **0**
- Unrelated files modified: **0**

---

## 32. Financial Integrity Audit

- Client balance calculations = **0**
- Debit / credit math = **0**
- Fee calculations = **0**
- FX calculations = **0**
- Refundable amount calculations = **0**
- Payout calculations = **0**
- Projected balances = **0**
- Discrepancy calculations = **0**
- Optimistic financial updates = **0**
- Automatic financial mutation retries = **0**
- Automatic mutation replay = **0**
- Idempotency regeneration = **0**
- Fabricated financial values = **0**
- Direct PostgreSQL access = **0**
- Direct Redis access = **0**
- Direct Kafka access = **0**
- Secrets / JWTs logged = **0**

---

## 33. Regression Audit

- Phase F7 Admin Operations: Fully functional (Accounts, Payments, Ledger, Adjustments, Investigations)
- Phase F8-A Security & Defenses: Intact (session refresh, JWT sanitization, rate-limiting headers, safe redirects)
- Phase F8-B Error Resilience: Intact (Global, Admin, Customer error boundaries, RFC 7807 handling)
- Phase F8-C Admin Reconciliation: Intact (reconciliation cases, sweep actions, ledger audits, balance audits)

---

## 34. Known Limitations

- User governance is read-only because Spring Boot backend tier has not exposed administrative user management mutation endpoints.
- Refunds and payouts in this admin phase are monitoring/oversight surfaces; execution of new customer refunds or merchant payouts is performed via dedicated customer/merchant APIs.

---

## 35. Final Freeze Decision

All verification criteria, backend contracts, financial invariants, authorization barriers, and automated suites have passed without deviation.

Phase F8-D is declared:
```
F8-D_READY_FOR_FREEZE
```
