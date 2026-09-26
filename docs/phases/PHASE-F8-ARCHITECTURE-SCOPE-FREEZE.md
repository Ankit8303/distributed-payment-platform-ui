# PHASE F8 ARCHITECTURE & SCOPE FREEZE
## Distributed Payment & Ledger Platform Frontend

**Document**: `docs/phases/PHASE-F8-ARCHITECTURE-SCOPE-FREEZE.md`  
**Date**: 2026-09-26  
**Status**: `F8_ARCHITECTURE_SCOPE_FROZEN`  
**Authority**: Principal Frontend Architect & Release Governance  
**Baseline**: Phases F0 through F7-H Fully Verified & Frozen  

---

## 1. Executive Summary

Phase F8 Architecture & Scope Freeze establishes the authoritative, binding implementation contract for Phase F8 of the Distributed Payment & Ledger Platform frontend.

Building on the verified completion and release freeze of Phases F0 through F7-H and the approved findings of `PHASE-F8-GAP-ANALYSIS.md`, this document:
1. Freezes the exact scope, boundaries, non-goals, and implementation criteria for subphases **F8-A through F8-G**.
2. Explicitly seals the perimeter between Phase F8 (Hardening, Resilience, Operational Governance, and Containerization) and Phase F9 (Production Deployment & Release Readiness).
3. Defines the exact files, security invariants, financial invariants, and test coverage requirements for each subphase.
4. Provides the complete, execution-ready implementation contract for the immediate next phase: **F8-A (Security & Defenses Hardening)**.

No application code, backend contracts, or project dependencies are modified during this freeze phase.

---

## 2. Approved F8 Baseline

The entire preceding platform sequence is complete, verified, and frozen:

```
F0  🔒 Platform Foundation & RFC 7807 Architecture
F1  🔒 Authentication & Session Management
F2  🔒 Customer Accounts & Dashboard Lookup
F3  🔒 Payments Creation & Settlement Lifecycle
F4  🔒 Customer Transactions (Permanently Backend-Blocked)
F5  🔒 Refunds, Reversals & Payout Workflows
F6  🔒 Customer Reconciliation (Permanently Backend-Blocked)
F7-A 🔒 Admin Infrastructure & Query Keys
F7-B 🔒 Admin Audit Log Exploration
F7-C 🔒 Admin Summary Dashboard
F7-D 🔒 Admin Payments Operations
F7-E 🔒 Admin Forensic Payment Investigation Trace
F7-F 🔒 Admin Standalone Ledger Exploration
F7-G 🔒 Admin Account Explorer & Dual-Balance Governance (F7-G-A to F7-G-G)
F7-H 🔒 Admin Financial Adjustments & Idempotent Ledger Gate (F7-H-A to F7-H-E)
```

**Quality Baseline**:
- **503 / 503 Vitest tests** passing (unit, component, accessibility, integration).
- **10 / 10 Playwright E2E tests** passing in `admin-adjustments.spec.ts`.
- Next.js production build compiling cleanly with zero TypeScript errors and zero ESLint warnings across all 15 routes.
- Zero client-side financial calculations; integer minor units and single-use idempotency strictly maintained.

---

## 3. F8 Scope

Phase F8 is partitioned into seven sequential, independently verifiable, and individually frozen subphases:

```
F8-A: Security & Defenses Hardening
  ↓
F8-B: Error Resilience & UX Boundaries
  ↓
F8-C: Admin Reconciliation Operations
  ↓
F8-D: Admin Governance, Notifications & Operations
  ↓
F8-E: Accessibility Hardening (Axe-Core & Navigation)
  ↓
F8-F: Performance & Code-Splitting
  ↓
F8-G: CI/CD, Containerization & Final Release Freeze
```

---

## 4. F8 Non-Scope

The following items are **strictly prohibited** from Phase F8:

1. **Zero Backend Modifications**: No modifications to `payment-ledger-platform-complete-agent-kit`, Java classes, Spring controllers, DTOs, or database migrations.
2. **Zero Backend-Blocked Workaround Fabrication**:
   - No mock customer transaction history (Phase F4 remains blocked).
   - No mock customer balance query (customer balance remains blocked).
   - No mock customer reconciliation page (Phase F6 remains blocked).
3. **Zero Financial Invariant Violations**:
   - Zero client-side balance, fee, FX, or debit/credit arithmetic.
   - Zero floating-point calculations for financial amounts.
   - Zero optimistic financial state mutations.
   - Zero automatic mutation retries.
4. **Zero Cloud Infrastructure Provisioning**:
   - No DNS, domain, TLS certificate provisioning, or cloud IAM setup (deferred to Phase F9).
   - No managed database or Kafka provisioning (deferred to Phase F9).

---

## 5. F8-A Scope Freeze: Security & Defenses Hardening

**Objective**: Eliminate high-priority security vulnerabilities in Content Security Policy (CSP), login redirect processing, and route authorization.

### Inclusions:
1. **Dynamic CSP connect-src**:
   - In `next.config.ts`, replace the hardcoded `connect-src 'self' http://localhost:8080 http://127.0.0.1:8080` with dynamic derivation from `process.env.NEXT_PUBLIC_API_URL`.
   - Must support both local development URLs and configured staging/production HTTPS origins without wildcarding.
   - Retain `'self'` and all existing security headers (`X-Frame-Options: DENY`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).
2. **Open Redirect Validation**:
   - In `src/features/auth/components/login-form.tsx`, implement a strict, auditable `getSafeRedirectUrl(target: string | null): string` helper.
   - Rules:
     - Must begin with a single `/`.
     - Must NOT begin with `//` (rejects protocol-relative redirection).
     - Must NOT contain `\` (rejects backslash bypasses).
     - Must NOT contain URI scheme indicators (`:`) prior to path separators (rejects `javascript:`, `data:`, `https:`).
     - If validation fails, fallback strictly to `"/"`.
3. **Payout Route Authorization Guard**:
   - In `src/app/(customer)/payouts/new/page.tsx`, enforce role boundary restricting access to `MERCHANT`, `ADMIN`, and `SYSTEM`.
   - Prevent `CUSTOMER` users from rendering the payout form or generating unauthenticated/forbidden mutation attempts.
4. **Automated Security Regression Tests**:
   - Add unit tests validating `getSafeRedirectUrl` against comprehensive attack vectors.
   - Add Playwright E2E and component tests verifying `CUSTOMER` role exclusion from `/payouts/new`.
   - Verify dynamic CSP header generation.

### Forbidden in F8-A:
- No error boundary implementation (deferred to F8-B).
- No reconciliation UI (deferred to F8-C).
- No dependency changes.

---

## 6. F8-B Scope Freeze: Error Resilience & UX Boundaries

**Objective**: Eliminate unhandled white-screen crashes and provide structured, accessible error recovery.

### Inclusions:
1. **Root & Segment Error Boundaries**:
   - Implement `src/app/error.tsx` (segment error boundary) and `src/app/global-error.tsx` (root error boundary for layout failures).
   - Implement `src/app/(admin)/error.tsx` for admin console resilience.
2. **Standardized Error Recovery UX**:
   - Render RFC 7807 problem details (title, status, detail, `correlationId`).
   - Provide a safe "Try Again" / "Reload Session" action.
   - Maintain clear separation: ordinary GET query retries are permitted, but financial mutation retry controls must never be silently automated.
3. **Offline / Network Disconnection Indicator**:
   - Implement subtle, accessible network status indicator alerting users to severed internet connectivity before mutations are attempted.

---

## 7. F8-C Scope Freeze: Admin Reconciliation Operations

**Objective**: Implement the authoritative administrative reconciliation interface for verified backend endpoints under `/api/v1/admin/reconciliation/**`.

### Inclusions:
1. **Reconciliation Cases Workspace (`/admin/reconciliation`)**:
   - Paginated discrepancy cases table via `getAdminReconciliationCases()`.
   - Case detail drawer/modal via `getAdminReconciliationCase(caseId)`.
2. **Authoritative Case Actions**:
   - Manual reconciliation trigger via `reconcileAdminCase(caseId)` with explicit operator confirmation.
   - Manual flagging via `flagAdminCase(caseId)` with reason prompt.
   - Batch reconciliation job dispatch via `runAdminReconciliation()`.
3. **Reconciliation Audit Reports**:
   - Ledger integrity report viewer via `getAdminReconciliationLedgerAuditReport()`.
   - Balance audit report viewer via `getAdminReconciliationBalanceAuditReport()`.

### Forbidden in F8-C:
- No customer reconciliation UI (permanently blocked).
- No local calculation of discrepancy balances or resolution values.

---

## 8. F8-D Scope Freeze: Admin Governance, Notifications & Operations

**Objective**: Deliver administrative interfaces for verified User Directory, Notification Operations, and Admin Refunds & Payouts Exploration.

### Inclusions:
1. **User Directory (`/admin/users`)**:
   - Paginated user list via `getAdminUsers()` with role, status, and creation timestamps.
   - User detail inspector via `getAdminUser(userId)`.
2. **Notification Operations (`/admin/notifications`)**:
   - Notification event log via `getAdminNotifications()`.
   - Notification detail modal via `getAdminNotification(id)`.
   - Explicit single-item resend action via `resendAdminNotification(id)`.
   - Stale notification cleanup dispatch via `cleanupAdminNotifications()`.
3. **Admin Refunds & Payouts Exploration (`/admin/refunds`, `/admin/payouts`)**:
   - Read-only paginated search and detail views for administrative inspection of platform-wide refunds (`getAdminRefunds`) and payouts (`getAdminPayouts`).

### Forbidden in F8-D:
- No user password modification, user deletion, or role tampering (unsupported by backend).
- No customer-facing notification subscription features.

---

## 9. F8-E Scope Freeze: Accessibility Hardening

**Objective**: Upgrade testing and layout accessibility to certified WCAG 2.1 AA compliance.

### Inclusions:
1. **Automated Axe-Core Test Harness**:
   - Introduce `@axe-core/react` or Vitest-compatible axe-core rule evaluation into component test suites.
2. **Layout Skip Navigation**:
   - Add visible-on-focus "Skip to main content" links at the top of `CustomerLayout` and `AdminLayout`.
3. **Focus & Contrast Audit**:
   - Formalize focus trapping in all modals.
   - Verify color contrast ratios ($\ge 4.5:1$ for normal text, $\ge 3:1$ for large text and UI components) across all light and dark themes.

---

## 10. F8-F Scope Freeze: Performance & Code-Splitting

**Objective**: Optimize bundle architecture and resource loading based on measured evidence.

### Inclusions:
1. **Evidence-Based Baseline**:
   - Measure First Load JS and component chunk sizes prior to modifications.
2. **Modal Dynamic Imports**:
   - Dynamically code-split heavy administrative modals (`AccountLifecycleModal`, `AccountBalanceConsistencyModal`, `AdjustmentConfirmModal`).
3. **Cache Policy Refinement**:
   - Review and tune TanStack Query `staleTime` and `gcTime` for non-critical lookup lists to eliminate duplicate background fetches.
4. **Verification**:
   - Document before/after bundle size benchmarks; ensure no regression in accessibility or interaction responsiveness.

---

## 11. F8-G Scope Freeze: CI/CD, Containerization & Final Release Freeze

**Objective**: Finalize automated CI quality gates, produce containerized deployment artifacts, and execute the final regression freeze.

### Inclusions:
1. **Headless Playwright in GitHub Actions**:
   - Update `.github/workflows/ci.yml` to install browser dependencies and execute the complete Playwright E2E suite on every pull request.
2. **Production Containerization**:
   - Create a hardened, multi-stage production `Dockerfile` with non-root user execution (`node:22-alpine`), standalone output tracing, and minimal layer footprint.
   - Create `.dockerignore` excluding tests, documentation, and local caches.
3. **Dependency Vulnerability Gate**:
   - Enforce `npm audit --audit-level=high` in CI pipeline.
4. **Final Regression Verification**:
   - Execute the complete verification pipeline (`typecheck`, `lint`, `test`, `build`, `e2e`).
   - Declare **Phase F8 Frozen**.

---

## 12. F9 Boundary

The boundary between Phase F8 and Phase F9 is strictly defined:

| Capability | Phase F8 | Phase F9 |
|---|---|---|
| Security hardening & CSP derivation | ✅ Included (F8-A) | — |
| Error boundaries & failure UX | ✅ Included (F8-B) | — |
| Admin operations & reconciliation | ✅ Included (F8-C, F8-D) | — |
| Accessibility & axe-core testing | ✅ Included (F8-E) | — |
| Performance code-splitting | ✅ Included (F8-F) | — |
| Container Dockerfile & CI Playwright | ✅ Included (F8-G) | — |
| Cloud infrastructure (AWS/GCP/Vercel) | ❌ Excluded | ✅ Included (F9) |
| Production DNS & TLS certificates | ❌ Excluded | ✅ Included (F9) |
| Managed PostgreSQL/Redis/Kafka cloud instances | ❌ Excluded | ✅ Included (F9) |
| Production secrets management | ❌ Excluded | ✅ Included (F9) |
| Production live monitoring & APM | ❌ Excluded | ✅ Included (F9) |

---

## 13. Backend Contract Matrix

Every endpoint permitted during Phase F8 is listed below. All endpoints are verified to exist in the frozen Spring Boot backend:

| Subphase | Endpoint | Method | Role | Purpose | Mutation | Idempotency Header |
|---|---|---|---|---|---|---|
| **F8-C** | `/api/v1/admin/reconciliation/cases` | `GET` | `ADMIN`, `SYSTEM` | Query discrepancy cases | No | No |
| **F8-C** | `/api/v1/admin/reconciliation/cases/{id}` | `GET` | `ADMIN`, `SYSTEM` | Single case details | No | No |
| **F8-C** | `/api/v1/admin/reconciliation/cases/{id}/reconcile` | `POST` | `ADMIN`, `SYSTEM` | Trigger case reconciliation | Yes | No |
| **F8-C** | `/api/v1/admin/reconciliation/cases/{id}/flag` | `POST` | `ADMIN`, `SYSTEM` | Flag case for review | Yes | No |
| **F8-C** | `/api/v1/admin/reconciliation/run` | `POST` | `ADMIN`, `SYSTEM` | Run reconciliation job | Yes | No |
| **F8-C** | `/api/v1/admin/reconciliation/reports/ledger-audit` | `GET` | `ADMIN`, `SYSTEM` | Ledger audit report | No | No |
| **F8-C** | `/api/v1/admin/reconciliation/reports/balance-audit` | `GET` | `ADMIN`, `SYSTEM` | Balance audit report | No | No |
| **F8-D** | `/api/v1/admin/users` | `GET` | `ADMIN`, `SYSTEM` | Query user directory | No | No |
| **F8-D** | `/api/v1/admin/users/{id}` | `GET` | `ADMIN`, `SYSTEM` | Single user details | No | No |
| **F8-D** | `/api/v1/admin/notifications` | `GET` | `ADMIN`, `SYSTEM` | Query notifications log | No | No |
| **F8-D** | `/api/v1/admin/notifications/{id}` | `GET` | `ADMIN`, `SYSTEM` | Single notification details | No | No |
| **F8-D** | `/api/v1/admin/notifications/{id}/resend` | `POST` | `ADMIN`, `SYSTEM` | Resend notification | Yes | No |
| **F8-D** | `/api/v1/admin/notifications/cleanup` | `POST` | `ADMIN`, `SYSTEM` | Clean processed notifications | Yes | No |
| **F8-D** | `/api/v1/admin/refunds` | `GET` | `ADMIN`, `SYSTEM` | Query platform refunds | No | No |
| **F8-D** | `/api/v1/admin/refunds/{id}` | `GET` | `ADMIN`, `SYSTEM` | Single refund details | No | No |
| **F8-D** | `/api/v1/admin/payouts` | `GET` | `ADMIN`, `SYSTEM` | Query platform payouts | No | No |
| **F8-D** | `/api/v1/admin/payouts/{id}` | `GET` | `ADMIN`, `SYSTEM` | Single payout details | No | No |

---

## 14. Backend-Blocked Work

The following features remain permanently **BACKEND-BLOCKED**:

| Blocked Capability | Reason | Invariant Protection |
|---|---|---|
| **Customer Transactions (F4)** | Backend lacks customer-scoped ledger query API. | Prohibits inventing fake customer statement APIs or unverified endpoints. |
| **Customer Payment Settlement Trace** | Backend lacks customer-safe payment settlement trace endpoint. | Prohibits exposing internal admin investigation endpoints to retail customers. |
| **Customer Account Balance Query** | Backend `AccountController.java` lacks customer balance endpoint. | Prohibits calculating or fabricating balances on the client. |
| **Customer Reconciliation (F6)** | Backend reconciliation engine is strictly admin-only. | Prohibits creating artificial customer reconciliation views. |

---

## 15. File Ownership Matrix

| Subphase | Permitted Existing Files to Modify | Permitted New Files to Create | Strictly Forbidden Areas |
|---|---|---|---|
| **F8-A** | `next.config.ts`, `src/features/auth/components/login-form.tsx`, `src/app/(customer)/payouts/new/page.tsx`, `tests/e2e/auth.spec.ts`, `tests/e2e/payouts.spec.ts` | `src/lib/auth/safe-redirect.ts`, `tests/unit/safe-redirect.test.ts` | Backend, database, admin views, error boundaries, UI styling overhaul |
| **F8-B** | `src/components/layout/protected-route.tsx` | `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/(admin)/error.tsx`, `tests/components/error-boundary.test.tsx` | Financial mutation hooks, backend APIs |
| **F8-C** | `src/components/admin/admin-sidebar.tsx` | `src/app/(admin)/admin/reconciliation/**`, `src/features/admin/reconciliation/**`, tests | Customer views, database schemas |
| **F8-D** | `src/components/admin/admin-sidebar.tsx` | `src/app/(admin)/admin/users/**`, `src/app/(admin)/admin/notifications/**`, `src/app/(admin)/admin/refunds/**`, `src/app/(admin)/admin/payouts/**`, tests | Customer views, database schemas |
| **F8-E** | `src/app/(customer)/layout.tsx`, `src/app/(admin)/layout.tsx` | Accessibility test harnesses, skip-link components | Business logic, mutation flows |
| **F8-F** | Lazy imports in modal consumers | Bundle analysis scripts | Financial calculation files |
| **F8-G** | `.github/workflows/ci.yml`, `package.json` (scripts only) | `Dockerfile`, `.dockerignore` | Application feature code |

---

## 16. Dependency Policy

| Subphase | Allowed Dependencies | Classification | Justification |
|---|---|---|---|
| **F8-A** | None | — | Pure TypeScript standard library implementation |
| **F8-B** | None | — | Next.js built-in error boundary primitives |
| **F8-C** | None | — | Reuses existing `@tanstack/react-query`, `lucide-react`, and `apiFetch` |
| **F8-D** | None | — | Reuses existing admin infrastructure |
| **F8-E** | `@axe-core/react` or `axe-core` | `devDependencies` ONLY | Required for automated WCAG 2.1 AA test assertions |
| **F8-F** | `@next/bundle-analyzer` (optional) | `devDependencies` ONLY | Required for bundle optimization measurement |
| **F8-G** | None | — | Standard Docker and GitHub Actions runners |

*Zero production runtime dependencies may be introduced across all of Phase F8 without explicit architectural justification.*

---

## 17. Security Invariants

The following security invariants are frozen across all F8 subphases:

1. **Authentication Authority**: Spring Boot backend issues and verifies JWT access tokens.
2. **Authorization Authority**: Spring Boot backend evaluates method-level `@PreAuthorize` security checks; frontend route guards act solely as UX perimeters.
3. **Zero Token Leakage**:
   - Access tokens remain in memory only.
   - Refresh tokens remain in `sessionStorage` (per-tab isolation, destroyed on tab close).
   - Zero tokens in `localStorage` or URL query parameters.
4. **Zero Credential Logging**: Zero `console.log` statements for credentials, tokens, idempotency keys, or financial request payloads.
5. **No Direct Infrastructure Access**: Browser connects exclusively via authenticated HTTPS REST gateway (`apiFetch`). Zero direct PostgreSQL, Redis, or Kafka connections.

---

## 18. Financial Invariants

The following financial invariants are frozen across all F8 subphases:

1. **Integer Minor Units**: All monetary values are represented and transmitted exclusively as integer minor units (`amountMinor: number`) paired with ISO 4217 currency (`currency: string`).
2. **Zero Floating-Point Arithmetic**: The frontend never calculates fractional currency amounts.
3. **Zero Client Balance Math**: The frontend never computes debit/credit sums, projected balances, remaining balances, fees, or foreign exchange rates.
4. **Zero Optimistic Financial Updates**: TanStack Query cache is strictly a client-side server-state cache. Financial state is updated solely upon authoritative backend HTTP responses.
5. **Mutation Retry Lockout**: `mutations: { retry: false }` is permanently enforced on all financial mutations.
6. **Caller-Owned Idempotency**: Idempotency keys are RFC 4122 v4 UUIDs generated on demand at confirmation boundaries; ambiguous network outcomes preserve the identical key for retries.

---

## 19. Accessibility Invariants (WCAG 2.1 AA)

1. Single `<h1>` per page with a strictly logical `<h2>`–`<h6>` hierarchy.
2. Every interactive form element has an explicit, accessible `<label>` association.
3. All modal dialogs implement `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`, focus trap, and safe initial focus on cancel.
4. Live announcements for errors and status changes use `aria-live="polite"` or `role="alert"`.
5. Zero color-only status indicators.

---

## 20. Performance Invariants

1. Initial shared First Load JS must remain $\le 120\text{ kB}$ (currently 103 kB).
2. No single page route bundle may exceed $150\text{ kB}$ total JS.
3. Zero unnecessary N+1 queries.
4. Polling intervals must be bounded, terminating, and limited to legitimate asynchronous operations.

---

## 21. Testing Strategy

Every F8 subphase must deliver automated tests across the pyramid:

```
          [ Playwright E2E ]
         [ Axe-Core A11y Tests ]
       [ Integration / API Tests ]
      [ Component & Boundary Tests ]
     [ Unit Tests (Logic & Schemas) ]
```

- Financial and administrative workflows require negative authorization tests (CUSTOMER blocked, MERCHANT blocked).
- Security changes require negative attack vector tests (XSS, open redirect bypasses).

---

## 22. CI/CD Strategy

1. **Local Verification Pipeline**: `npm run verify` (`typecheck && lint && test && build`).
2. **GitHub Actions Workflow**:
   - `npm ci`
   - Repository hygiene & secret scan scripts
   - TypeScript compilation (`tsc --noEmit`)
   - ESLint validation
   - Vitest unit/component/accessibility suite
   - Playwright E2E suite (added in F8-G)
   - Next.js production build (`next build`)
   - Container build verification (`docker build`)

---

## 23. F8 Dependency Graph

```
F7-H 🔒 (Baseline Complete)
   │
   ▼
F8-A (Security & Defenses Hardening)
   │
   ▼
F8-B (Error Resilience & UX Boundaries)
   │
   ▼
F8-C (Admin Reconciliation Operations)
   │
   ▼
F8-D (Admin Governance, Notifications & Operations)
   │
   ▼
F8-E (Accessibility Hardening & Axe-Core)
   │
   ▼
F8-F (Performance & Code-Splitting)
   │
   ▼
F8-G (CI/CD, Containerization & Final Release Freeze)
   │
   ▼
F8 🔒 (Complete & Frozen)
   │
   ▼
F9 (Production Deployment & Release Readiness)
```

*Subphases must execute strictly in this sequential order. Skipping or reordering subphases is prohibited.*

---

## 24. Risk Register

| Risk ID | Description | Severity | Mitigation in F8 |
|---|---|---|---|
| **RSK-01** | External API domain blocked by CSP connect-src | High | **F8-A**: Dynamic connect-src binding to `NEXT_PUBLIC_API_URL`. |
| **RSK-02** | Malicious redirect to external phishing domain | High | **F8-A**: `getSafeRedirectUrl` validation reject non-internal paths. |
| **RSK-03** | Customer persona initiates payout request | Medium | **F8-A**: Enforce `MERCHANT` role guard on `/payouts/new`. |
| **RSK-04** | Client component render crash causes white screen | High | **F8-B**: Implement root and route error boundaries. |
| **RSK-05** | Admin reconciliation endpoints unwired | Medium | **F8-C**: Implement `/admin/reconciliation` using existing DTOs. |
| **RSK-06** | CI passes without running E2E tests | Medium | **F8-G**: Integrate Playwright in `.github/workflows/ci.yml`. |

---

## 25. Open Decisions: Resolution

### Resolution on Admin Refunds & Payouts (Section 12 of prompt)
- **Decision**: **Option A** is formally approved.
- **Rationale**: `getAdminRefunds` and `getAdminPayouts` are read-only paginated search queries that already exist in `src/lib/api/endpoints/admin-api.ts`. Rather than proliferating subphases, their UI exploration is integrated directly into **F8-D** alongside User Directory and Notification governance. This achieves 100% UI coverage for all published backend admin endpoints without fragmenting the roadmap.

---

## 26. F8-A Implementation Contract

This section defines the execution contract for the immediate next phase: **F8-A (Security & Defenses Hardening)**.

### Exact Objective
1. Make `connect-src` in `next.config.ts` dynamically support the configured `process.env.NEXT_PUBLIC_API_URL` without weakening CSP or using wildcards.
2. Implement strict open-redirect sanitization in `login-form.tsx` via `src/lib/auth/safe-redirect.ts`.
3. Guard `/payouts/new` to block `CUSTOMER` persona and permit `MERCHANT`, `ADMIN`, `SYSTEM`.
4. Add comprehensive unit, component, and E2E security regression tests.

### Exact Files Allowed to Change
- `next.config.ts`
- `src/lib/auth/safe-redirect.ts` (NEW)
- `src/features/auth/components/login-form.tsx`
- `src/app/(customer)/payouts/new/page.tsx`
- `tests/unit/safe-redirect.test.ts` (NEW)
- `tests/e2e/auth.spec.ts`
- `tests/e2e/payouts.spec.ts`
- `docs/phases/PHASE-F8-A-IMPLEMENTATION.md` (NEW)

### Forbidden Changes in F8-A
- Do NOT touch `package.json` or add dependencies.
- Do NOT implement error boundaries (`error.tsx`).
- Do NOT implement reconciliation, notification, or user pages.
- Do NOT modify backend code or contracts.

### Verification Commands
```bash
npm run typecheck
npm run lint
npm test
npm run build
npx playwright test tests/e2e/auth.spec.ts tests/e2e/payouts.spec.ts
npm run verify
```

### Freeze Gate
Output: **`F8-A_READY_FOR_FREEZE`**

---

## 27. F8 Freeze Criteria

The entire Phase F8 will achieve final freeze when:
1. Subphases F8-A through F8-G are all implemented, tested, and individually frozen.
2. All 503+ unit/component/a11y tests and all Playwright E2E tests pass 100%.
3. Production Docker container builds and starts cleanly.
4. Zero security vulnerabilities or unhandled open redirect vectors exist.
5. All zero-tolerance financial checks are verified at 0.

---

## 28. Final Status

**`F8_ARCHITECTURE_SCOPE_FROZEN`**

*(Stop condition reached. Architecture and scope are frozen. Awaiting prompt to begin Phase F8-A.)*
