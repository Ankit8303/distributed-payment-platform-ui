# PHASE F8 GAP ANALYSIS REPORT
## Comprehensive Architectural, Security, Financial, and Operational Assessment
**Distributed Payment & Ledger Platform Frontend**

**Document**: `docs/phases/PHASE-F8-GAP-ANALYSIS.md`  
**Date**: 2026-09-26  
**Status**: `F8_GAP_ANALYSIS_READY`  
**Baseline**: F0–F7-H Frozen  

---

## 1. Executive Summary

Phase F8 Gap Analysis provides an authoritative, contract-first, and implementation-ready assessment of the Distributed Payment & Ledger Platform frontend following the complete implementation and freeze of Phases F0 through F7-H.

The platform today comprises a robust, highly verified financial architecture:
- 69 Vitest test files containing **503 passing unit, component, and accessibility tests** (100% pass rate).
- 10 passing Playwright end-to-end specs across critical customer and administrative journeys.
- Next.js production build compiling cleanly with zero TypeScript errors and zero ESLint warnings across 15 static and dynamic route bundles.
- Strict double-entry accounting invariants, zero client-side balance mutations, lossless integer minor-unit formatting, and RFC 4122 v4 idempotency enforcement.

However, an exhaustive audit of the actual codebase, configuration, and verified backend contracts exposes **four distinct categories of gaps**:
1. **Unwired Verified Backend Capabilities**: The backend provides fully functioning, tested administrative endpoints for Reconciliation Cases (`GET/POST /api/v1/admin/reconciliation/**`), Notifications (`GET/POST /api/v1/admin/notifications/**`), User Directory (`GET /api/v1/admin/users/**`), and Admin Refunds/Payouts (`GET /api/v1/admin/refunds/**`, `GET /api/v1/admin/payouts/**`). In the frontend, the API functions exist in `admin-api.ts`, yet the corresponding UI routes contain only `.gitkeep` placeholders or remain unrouted.
2. **Production Hardening & Resilience Deficiencies**: The Next.js Content Security Policy (`next.config.ts`) hardcodes local HTTP ports (`http://localhost:8080`), rendering external or production deployment insecure; login redirect logic (`login-form.tsx`) lacks protocol-relative URL sanitization; and the application completely lacks root and route-level React Error Boundaries (`error.tsx`, `global-error.tsx`).
3. **CI/CD & Observability Gaps**: GitHub Actions (`ci.yml`) runs tests and builds but omits Playwright E2E execution, containerized Docker packaging, and automated axe-core accessibility regression scanning.
4. **Backend-Blocked Work**: Retail Customer Transaction History (Phase F4) and Retail Customer Reconciliation (Phase F6) remain permanently blocked because the frozen Spring Boot backend exposes zero customer-scoped ledger or reconciliation endpoints.

This report establishes the complete factual reality, provides concrete code evidence, and structures an actionable candidate subphase roadmap for Phase F8.

---

## 2. Current Frozen Baseline

| Phase | Description | Architecture / Route | Final Status |
|---|---|---|---|
| **F0** | Architecture, Methodology, RFC 7807, Design System | `src/lib/api/client.ts`, `globals.css` | 🔒 FROZEN |
| **F1** | Authentication & Session Management | `/login`, `/register`, `token-storage.ts` | 🔒 FROZEN |
| **F2** | Customer Accounts & Dashboard | `/dashboard`, `/accounts/[id]` | 🔒 FROZEN |
| **F3** | Customer Payments & Settlement Lifecycle | `/payments/new`, `/payments/[id]` | 🔒 FROZEN |
| **F4** | Customer Transactions & Ledger History | `/transactions` | 🔒 BLOCKED BY BACKEND |
| **F5** | Customer/Merchant Refunds, Reversals, Payouts | `/refunds/[id]`, `/reversals/[id]`, `/payouts/new`, `/payouts/[id]` | 🔒 FROZEN |
| **F6** | Customer Reconciliation Visibility | `/reconciliation` | 🔒 BLOCKED BY BACKEND |
| **F7-A** | Admin Foundation & Query Key Architecture | `query-keys.ts`, `src/lib/api/endpoints/admin-api.ts` | 🔒 FROZEN |
| **F7-B** | Admin Audit Log Exploration | `/admin/audit` | 🔒 FROZEN |
| **F7-C** | Admin Executive Summary Dashboard | `/admin/dashboard` | 🔒 FROZEN |
| **F7-D** | Admin Payment Operations & Inspection | `/admin/payments`, `/admin/payments/[id]` | 🔒 FROZEN |
| **F7-E** | Admin Payment Forensic Investigation Trace | `/admin/investigations/payments/[paymentId]` | 🔒 FROZEN |
| **F7-F** | Admin Standalone Ledger Exploration | `/admin/ledger/transactions`, `[id]`, `/admin/ledger/accounts/[id]` | 🔒 FROZEN |
| **F7-G** | Admin Account Explorer & Dual-Balance Governance | `/admin/accounts`, `[id]`, Lifecycle & Balance Modals | 🔒 FROZEN |
| **F7-H** | Admin Financial Adjustments & Execution Gate | `/admin/adjustments`, `/admin/adjustments/[id]` | 🔒 FROZEN |

---

## 3. Repository Reality Check

An inspection of the file tree and codebase reveals the exact operational reality:

```
distributed-payment-platform-ui/
├── .github/workflows/ci.yml         # Runs install, verify-repo, check-secrets, typecheck, lint, test, build. (Missing: Playwright, Docker, a11y)
├── docs/
│   ├── api/API-CONTRACT.md          # Published backend contract specifications
│   ├── phase-f4/                    # F4 backend gap resolution documents
│   ├── phase-reports/               # Historical reports for F0-F7
│   └── phases/                      # Authoritative phase verification & freeze reports
├── next.config.ts                   # Security headers; CSP connect-src hardcoded to localhost:8080
├── src/
│   ├── app/
│   │   ├── (admin)/admin/           # Admin route tree
│   │   │   ├── accounts/            # Implemented (F7-G)
│   │   │   ├── adjustments/         # Implemented (F7-H)
│   │   │   ├── audit/               # Implemented (F7-B)
│   │   │   ├── dashboard/           # Implemented (F7-C)
│   │   │   ├── investigations/      # Implemented payment trace (F7-E); no root list
│   │   │   ├── ledger/              # Implemented transactions & account entries (F7-F)
│   │   │   ├── payments/            # Implemented list & detail (F7-D)
│   │   │   ├── reconciliation/      # EMPTY (.gitkeep only)
│   │   │   └── users/               # EMPTY (.gitkeep only)
│   │   ├── (auth)/                  # /login, /register; /error is empty (.gitkeep)
│   │   ├── (customer)/              # Customer route tree
│   │   │   ├── accounts/[id]/       # Implemented (F2)
│   │   │   ├── dashboard/           # Implemented (F2)
│   │   │   ├── payments/            # Implemented new & detail (F3)
│   │   │   ├── payouts/             # Implemented new & detail (F5)
│   │   │   ├── reconciliation/      # EMPTY (.gitkeep only)
│   │   │   ├── refunds/[id]/        # Implemented (F5)
│   │   │   ├── reversals/[id]/      # Implemented (F5)
│   │   │   └── transactions/        # EMPTY (.gitkeep only)
│   │   ├── layout.tsx, page.tsx     # Landing page & Root Layout; NO error.tsx or global-error.tsx
│   ├── components/                  # Navigation, Layout, Admin, UI components
│   ├── config/env.ts                # Zod environment validation (NEXT_PUBLIC_API_URL)
│   ├── features/                    # Domain modules (admin, accounts, auth, payments, payouts, refunds)
│   ├── lib/
│   │   ├── api/client.ts            # Centralized apiFetch, ApiError, correlation UUIDs
│   │   ├── api/endpoints/admin-api.ts # Complete admin API functions (including reconciliation, users, notifications)
│   │   └── auth/token-storage.ts    # In-memory access token, sessionStorage refresh token
│   └── types/admin.ts, api.ts       # Authoritative TypeScript DTO interfaces
└── tests/
    ├── accessibility/               # 16 component-level a11y test suites (Vitest)
    ├── components/                  # 18 component test suites
    ├── e2e/                         # 13 Playwright spec files
    ├── integration/                 # 8 API and hook integration suites
    └── unit/                        # 16 unit test suites
```

---

## 4. Backend Contract Inventory

The published backend (`payment-ledger-platform-complete-agent-kit`) contract is documented in `docs/api/API-CONTRACT.md` and verified in `src/lib/api/endpoints/admin-api.ts`. Below is the complete capability inventory mapped to current frontend delivery:

### Table 1 — Capability Matrix

| Capability | Backend Endpoint | HTTP Method | Auth Role | Frontend State | Status | Evidence / Notes |
|---|---|---|---|---|---|---|
| **Auth Register** | `/api/v1/auth/register` | `POST` | Anonymous | Implemented | `COMPLETE` | `src/features/auth/components/register-form.tsx` |
| **Auth Login** | `/api/v1/auth/login` | `POST` | Anonymous | Implemented | `COMPLETE` | `src/features/auth/components/login-form.tsx` |
| **Auth Refresh** | `/api/v1/auth/refresh` | `POST` | Anonymous | Implemented | `COMPLETE` | `src/lib/auth/token-storage.ts` |
| **Customer Account** | `/api/v1/accounts/{id}` | `GET` | `CUSTOMER`, `ADMIN` | Implemented | `COMPLETE` | `src/features/accounts/hooks/use-account.ts` |
| **Customer Account List** | `/api/v1/accounts` | `GET` | — | None | `BACKEND-BLOCKED` | Backend lacks customer list query; customers must look up by ID |
| **Customer Account Balance**| `/api/v1/accounts/{id}/balance` | `GET` | — | None | `BACKEND-BLOCKED` | Endpoint does not exist in backend `AccountController.java` |
| **Payment Creation** | `/api/v1/payments` | `POST` | `CUSTOMER` | Implemented | `COMPLETE` | `src/features/payments/components/payment-form.tsx` |
| **Payment Detail** | `/api/v1/payments/{id}` | `GET` | `CUSTOMER`, `ADMIN` | Implemented | `COMPLETE` | `src/app/(customer)/payments/[id]/page.tsx` |
| **Customer Ledger Trace** | `/api/v1/payments/{id}/trace` | `GET` | — | None | `BACKEND-BLOCKED` | Requires Phase F4-B backend contract extension |
| **Customer Transactions** | `/api/v1/accounts/{id}/transactions`| `GET` | — | None | `BACKEND-BLOCKED` | Backend lacks customer-scoped entry endpoint |
| **Payment Refund** | `/api/v1/payments/{id}/refunds` | `POST` | `MERCHANT`, `ADMIN` | Implemented | `COMPLETE` | `src/features/refunds/components/refund-modal.tsx` |
| **Refund Detail** | `/api/v1/refunds/{id}` | `GET` | `MERCHANT`, `ADMIN` | Implemented | `COMPLETE` | `src/app/(customer)/refunds/[id]/page.tsx` |
| **Payment Reversal** | `/api/v1/payments/{id}/reversal` | `POST` | `ADMIN` | Implemented | `COMPLETE` | `src/features/refunds/components/reversal-modal.tsx` |
| **Reversal Detail** | `/api/v1/reversals/{id}` | `GET` | `ADMIN` | Implemented | `COMPLETE` | `src/app/(customer)/reversals/[id]/page.tsx` |
| **Payout Creation** | `/api/v1/payouts` | `POST` | `MERCHANT` | Implemented | `COMPLETE` | `src/features/payouts/components/payout-form.tsx` |
| **Payout Detail** | `/api/v1/payouts/{id}` | `GET` | `MERCHANT`, `ADMIN` | Implemented | `COMPLETE` | `src/app/(customer)/payouts/[id]/page.tsx` |
| **Admin Dashboard** | `/api/v1/admin/dashboard/summary` | `GET` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | `src/app/(admin)/admin/dashboard/page.tsx` |
| **Admin Payments Search** | `/api/v1/admin/payments` | `GET` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | `src/app/(admin)/admin/payments/page.tsx` |
| **Admin Payment Detail** | `/api/v1/admin/payments/{id}` | `GET` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | `src/app/(admin)/admin/payments/[id]/page.tsx` |
| **Admin Investigation** | `/api/v1/admin/investigations/payments/{id}` | `GET` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | `src/app/(admin)/admin/investigations/payments/[paymentId]/page.tsx` |
| **Admin Ledger Search** | `/api/v1/admin/ledger/transactions` | `GET` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | `src/app/(admin)/admin/ledger/transactions/page.tsx` |
| **Admin Ledger Tx Detail** | `/api/v1/admin/ledger/transactions/{id}` | `GET` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | `src/app/(admin)/admin/ledger/transactions/[id]/page.tsx` |
| **Admin Account Journal** | `/api/v1/admin/ledger/accounts/{id}/entries` | `GET` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | `src/app/(admin)/admin/ledger/accounts/[accountId]/page.tsx` |
| **Admin Accounts Search** | `/api/v1/admin/accounts` | `GET` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | `src/app/(admin)/admin/accounts/page.tsx` |
| **Admin Account Inspector**| `/api/v1/admin/accounts/{id}` | `GET` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | `src/app/(admin)/admin/accounts/[id]/page.tsx` |
| **Admin Balance Audit** | `/api/v1/admin/accounts/{id}/balance-summary` | `GET` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | Modal in `src/features/admin/components/account-balance-consistency.tsx` |
| **Admin Account Freeze** | `/api/v1/admin/accounts/{id}/freeze` | `POST` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | Modal in `src/features/admin/components/account-lifecycle-modal.tsx` |
| **Admin Account Unfreeze**| `/api/v1/admin/accounts/{id}/unfreeze`| `POST` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | Modal in `src/features/admin/components/account-lifecycle-modal.tsx` |
| **Admin Adjustment Create**| `/api/v1/admin/adjustments` | `POST` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | `src/features/admin/components/adjustment-confirm-modal.tsx` |
| **Admin Adjustment Detail**| `/api/v1/admin/adjustments/{id}` | `GET` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | `src/app/(admin)/admin/adjustments/[id]/page.tsx` |
| **Admin Audit Logs List** | `/api/v1/admin/audit/logs` | `GET` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | `src/app/(admin)/admin/audit/page.tsx` |
| **Admin Audit Log Detail** | `/api/v1/admin/audit/logs/{id}` | `GET` | `ADMIN`, `SYSTEM` | Implemented | `COMPLETE` | Modal in `src/app/(admin)/admin/audit/page.tsx` |
| **Admin Reconciliation Cases** | `/api/v1/admin/reconciliation/cases` | `GET` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:495`; UI is `.gitkeep` |
| **Admin Case Detail** | `/api/v1/admin/reconciliation/cases/{id}` | `GET` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:516`; UI is `.gitkeep` |
| **Admin Case Reconcile** | `/api/v1/admin/reconciliation/cases/{id}/reconcile` | `POST` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:537`; UI is `.gitkeep` |
| **Admin Case Flag** | `/api/v1/admin/reconciliation/cases/{id}/flag` | `POST` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:558`; UI is `.gitkeep` |
| **Admin Run Reconciliation**| `/api/v1/admin/reconciliation/run` | `POST` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:574`; UI is `.gitkeep` |
| **Admin Ledger Audit Report**| `/api/v1/admin/reconciliation/reports/ledger-audit`| `GET`| `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:590`; UI is `.gitkeep` |
| **Admin Balance Audit Report**| `/api/v1/admin/reconciliation/reports/balance-audit`| `GET`| `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:606`; UI is `.gitkeep` |
| **Admin Notifications List**| `/api/v1/admin/notifications` | `GET` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:628`; UI route missing |
| **Admin Notification Detail**| `/api/v1/admin/notifications/{id}` | `GET` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:649`; UI route missing |
| **Admin Resend Notification**| `/api/v1/admin/notifications/{id}/resend`| `POST` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:670`; UI route missing |
| **Admin Notification Cleanup**| `/api/v1/admin/notifications/cleanup` | `POST` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:688`; UI route missing |
| **Admin Users Directory** | `/api/v1/admin/users` | `GET` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:753`; UI is `.gitkeep` |
| **Admin User Detail** | `/api/v1/admin/users/{id}` | `GET` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:774`; UI is `.gitkeep` |
| **Admin Refunds Search** | `/api/v1/admin/refunds` | `GET` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:409`; UI route missing |
| **Admin Refund Detail** | `/api/v1/admin/refunds/{id}` | `GET` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:430`; UI route missing |
| **Admin Payouts Search** | `/api/v1/admin/payouts` | `GET` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:452`; UI route missing |
| **Admin Payout Detail** | `/api/v1/admin/payouts/{id}` | `GET` | `ADMIN`, `SYSTEM` | Function only | `IMPLEMENTABLE` | Defined in `admin-api.ts:473`; UI route missing |

---

## 5. Customer Experience Gap Audit

1. **Authentication & Session (`/login`, `/register`)**:
   - `POST /api/v1/auth/register`: Returns `defaultAccountId`, but `register-form.tsx` immediately redirects to `/login` without storing or passing `defaultAccountId`.
   - `POST /api/v1/auth/login`: Backend contract does not return `defaultAccountId` or `userId`.
   - **Impact**: Upon logging in, the customer arrives at `/dashboard` with an empty account parameter (`/dashboard`), rendering `AccountEmptyState` instead of automatically displaying their active account.
   - **Mitigation/Gap**: Customer must manually enter their account UUID in `AccountLookupForm`.
2. **Account Balance Visibility**:
   - Customer account response (`AccountResponse`) contains: `id`, `accountNumber`, `ownerId`, `accountType`, `currency`, `status`, `createdAt`.
   - It contains **zero balance fields**. `materializedBalanceMinor` is only exposed via `AccountAdminResponse`.
   - Customers have no legitimate way to view their current balance without backend changes.
3. **Payments & Payouts**:
   - Payments creation (`/payments/new`) and settlement detail (`/payments/[id]`) are fully implemented and verified.
   - Payout creation (`/payouts/new`) is accessible via sidebar to customers, even though backend `POST /api/v1/payouts` restricts execution to `ROLE_MERCHANT`. Customer submissions fail with HTTP 403 Forbidden.
4. **Transactions & Ledger History (Phase F4)**:
   - Route `/transactions` contains only `.gitkeep`.
   - Blocked by backend: no customer-scoped transaction or statement endpoint exists.

---

## 6. Admin Experience Gap Audit

The administrative console is substantially complete for core financial workflows (Dashboard, Payments, Investigations, Ledger Transactions, Accounts Explorer, Balance Audits, Account Freeze/Unfreeze, Financial Adjustments, Audit Logs).

However, **five administrative capability sets exist in the API layer with zero UI presentation**:

1. **Reconciliation Case Governance (`/admin/reconciliation`)**:
   - Backend exposes: `GET /api/v1/admin/reconciliation/cases`, `GET /api/v1/admin/reconciliation/cases/{id}`, `POST .../reconcile`, `POST .../flag`, `POST .../run`, and reports `GET .../reports/ledger-audit`, `GET .../reports/balance-audit`.
   - All 7 functions are coded in `src/lib/api/endpoints/admin-api.ts` (lines 495–606).
   - Sidebar item exists (`src/components/admin/admin-sidebar.tsx:73`).
   - Route directory `src/app/(admin)/admin/reconciliation` contains only `.gitkeep`.
2. **User Directory (`/admin/users`)**:
   - Backend exposes: `GET /api/v1/admin/users`, `GET /api/v1/admin/users/{id}` (`UserAdminResponse`).
   - Both functions are coded in `admin-api.ts` (lines 753–774).
   - Sidebar item exists (`src/components/admin/admin-sidebar.tsx:113`).
   - Route directory `src/app/(admin)/admin/users` contains only `.gitkeep`.
3. **Notification Operations (`/admin/notifications`)**:
   - Backend exposes: `GET /api/v1/admin/notifications`, `GET /api/v1/admin/notifications/{id}`, `POST .../resend`, `POST .../cleanup`.
   - All 4 functions exist in `admin-api.ts` (lines 628–688).
   - Sidebar item exists (`src/components/admin/admin-sidebar.tsx:109`).
   - Route directory does not exist on disk.
4. **Admin Refunds & Payouts Explorer (`/admin/refunds`, `/admin/payouts`)**:
   - Backend exposes: `GET /api/v1/admin/refunds`, `GET /api/v1/admin/refunds/{id}`, `GET /api/v1/admin/payouts`, `GET /api/v1/admin/payouts/{id}`.
   - All 4 functions exist in `admin-api.ts` (lines 409–473).
   - Sidebar items exist (`src/components/admin/admin-sidebar.tsx:63, 68`).
   - Route directories do not exist on disk.
5. **Investigation Root (`/admin/investigations`)**:
   - Sidebar links to `/admin/investigations`.
   - The route `/admin/investigations/payments/[paymentId]` exists, but there is no `/admin/investigations/page.tsx` search/lookup landing view.

---

## 7. Financial Safety Audit

### Table 4 — Financial Safety Invariants

| Invariant | Current State | Code Evidence | Gap / Assessment |
|---|---|---|---|
| **Integer Minor Units** | Fully enforced | `src/lib/formatting/money.ts:1-25` (`formatMinorUnits`, `parseMinorUnits`) | `ZERO_GAP` — Zero floating-point math; minor units preserved throughout |
| **Zero Client Arithmetic**| Fully enforced | Audit of `src/features/admin` and `src/app/(admin)` | `ZERO_GAP` — No client-side balance, fee, or FX calculations |
| **Double-Entry Traceability**| Fully enforced | `src/app/(admin)/admin/adjustments/[id]/page.tsx:479-542` | `ZERO_GAP` — Compensating ledger transactions linked losslessly |
| **Mutation Retry Lock** | Fully enforced | `src/providers/app-providers.tsx:31` (`mutations: { retry: false }`) | `ZERO_GAP` — No silent retries on financial mutations |
| **Idempotency Execution** | Fully enforced | `src/features/admin/components/adjustment-confirm-modal.tsx:191-205` | `ZERO_GAP` — Single UUIDv4 generated at confirm; reused on ambiguity |
| **Authority Boundary** | Fully enforced | `src/providers/app-providers.tsx:8-10` | `ZERO_GAP` — Server state is cached; backend PostgreSQL remains authority |

---

## 8. Security Gap Audit

### Table 3 — Security Gaps

| Area | Current State | Gap | Severity | Evidence |
|---|---|---|---|---|
| **Content Security Policy** | Configured in `next.config.ts` | `connect-src` hardcodes `http://localhost:8080 http://127.0.0.1:8080`. External/staging/production API URLs will be blocked by browser CSP. | **P1 (High)** | `next.config.ts:37` |
| **Open Redirect Vulnerability** | `LoginForm` handles redirect param | `redirectUrl = searchParams?.get("redirect") \|\| "/"` does not validate against protocol-relative (`//evil.com`) or absolute external URLs (`https://evil.com`). | **P1 (High)** | `src/features/auth/components/login-form.tsx:28, 50` |
| **Role-Guard Specificity** | `ProtectedRoute` checks roles | `/payouts/new` does not restrict to `MERCHANT` role at route level; CUSTOMER sees form and only fails upon backend 403. | **P2 (Medium)** | `src/app/(customer)/payouts/new/page.tsx:22` |
| **Token Storage** | Memory + SessionStorage | Access token in memory, refresh token in sessionStorage. Zero tokens in localStorage. Strict tab isolation. | `ZERO_GAP` | `src/lib/auth/token-storage.ts:1-60` |
| **Credential Logging** | Zero console logs | Clean audit across all source files; zero credentials, tokens, or financial payloads logged. | `ZERO_GAP` | Codebase grep search |
| **Direct Infrastructure** | Zero raw DB/Redis/Kafka | All operations routed strictly via authenticated HTTPS REST gateway (`apiFetch`). | `ZERO_GAP` | Codebase grep search |

---

## 9. Accessibility Gap Audit (WCAG 2.1 AA)

1. **Current Coverage**:
   - 16 dedicated accessibility test suites exist under `tests/accessibility/`.
   - Single `<h1>` per page enforced across all customer and administrative views.
   - Dialogs (`role="dialog"`, `aria-modal="true"`) implement proper initial focus on safe cancel buttons (e.g. `adjustment-confirm-modal.tsx`).
   - Semantic `<fieldset>`, `<legend>`, `<label for="...">`, and ARIA live regions (`aria-live="polite"`) implemented.
2. **Identified Gaps**:
   - **No Automated Axe-Core CI Harness**: Existing a11y tests use custom Testing Library queries (`getByRole`, `toHaveAttribute`) rather than full-document `axe(container)` scans, potentially missing subtle color contrast, focus trap edge cases, or sub-pixel touch-target violations.
   - **Skip Links**: Neither `CustomerLayout` nor `AdminLayout` includes a visible-on-focus "Skip to main content" link at the top of the DOM.

---

## 10. Performance Gap Audit

1. **Bundle Measurements (Next.js 15.5.26)**:
   - Shared First Load JS: **103 kB** across all routes.
   - Largest Dynamic Route: `/admin/accounts/[id]` at **11.5 kB** (143 kB total).
   - Adjustment Detail: `/admin/adjustments/[id]` at **6.54 kB** (136 kB total).
   - No route exceeds the 150 kB initial bundle budget.
2. **Identified Gaps**:
   - **Duplicate Lookups**: Customer dashboard requires manual account lookup (`/dashboard?accountId=...`) because user account IDs are not cached from registration or auth token claims.
   - **Client Component Boundaries**: Many pages declare `"use client"` at the route page level rather than isolating client state to interactive forms/modals. While acceptable for bundle size, server-component streaming is not leveraged.

---

## 11. Testing Gap Audit

### Table 5 — Testing Coverage & Gaps

| Area | Existing Tests | Missing Coverage | Required Future Phase |
|---|---|---|---|
| **Unit & Hooks** | 16 test files (120+ tests) | Edge cases for network offline transitions during query execution | F8-B / F8-H |
| **Components** | 18 test files (150+ tests) | Root error boundary rendering under simulated render crashes | F8-B |
| **Accessibility** | 16 test files (80+ tests) | Automated axe-core rule evaluation across all pages | F8-F |
| **E2E (Playwright)** | 13 spec files (40+ scenarios) | CI integration (currently not executed in GitHub Actions `ci.yml`) | F8-H |
| **Contract (Pact/OpenAPI)**| 0 tests (`tests/contract/.gitkeep`) | Automated contract schema validation against backend OpenAPI spec | F8-H |

---

## 12. CI/CD Gap Audit

1. **Current State (`.github/workflows/ci.yml`)**:
   - Executes: checkout, node setup, `npm ci`, `verify-repo.ps1`, `check-secrets.ps1`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`.
2. **Gaps**:
   - **Playwright Not Executed**: `npx playwright test` is omitted from `ci.yml` due to lack of headless browser installation (`npx playwright install --with-deps`).
   - **No Dependency Vulnerability Gate**: `npm audit --audit-level=high` is not enforced in CI.
   - **No Docker Build Verification**: No `Dockerfile` or container build validation exists in the repository.

---

## 13. Production Deployment Gap Audit

### Table 6 — Production Readiness

| Area | Current State | Gap | Proposed Phase |
|---|---|---|---|
| **Environment Config** | Validated via Zod (`src/config/env.ts`) | Defaults to `http://localhost:8080`; no staging/production environment profiles | F8-A / F8-H |
| **Content Security Policy** | Hardcoded in `next.config.ts` | Does not dynamically inject `process.env.NEXT_PUBLIC_API_URL` into `connect-src` | F8-A |
| **Containerization** | Missing | No `Dockerfile` or `.dockerignore` for Kubernetes or ECS deployment | F8-H |
| **Error Handling Boundary**| Missing | No `src/app/error.tsx` or `src/app/global-error.tsx` | F8-B |
| **Deployment Platform** | Unspecified | Cloud target (Vercel, AWS ECS, GCP Cloud Run) not declared | F8-H (Open Decision) |

---

## 14. Observability Gap Audit

1. **Correlation Tracing**:
   - Every API call injects `X-Correlation-ID` via `generateCorrelationId()` in `src/lib/api/client.ts`.
   - RFC 7807 problem details capture and expose `correlationId`.
2. **Gaps**:
   - **Correlation ID Visibility**: When an unhandled error or problem details banner appears on customer pages, the `correlationId` is not consistently displayed for user support reporting.
   - **Telemetry / Error Monitoring**: No client-side structured exception telemetry (e.g. Sentry/OpenTelemetry SDK) is integrated.

---

## 15. Failure & Disaster Recovery UX Analysis

1. **Network Timeout on Query**:
   - React Query handles GET query failures cleanly with retry: 1 and displays `AdminErrorState` or `AccountErrorState`.
2. **Network Timeout on Financial Mutation**:
   - Fully protected in Phase F7-H-C: `AdjustmentConfirmModal` detects ambiguous outcomes, prevents key regeneration, preserves `activeIdempotencyKey`, and allows safe retry with the identical key.
3. **Unhandled Component Render Exceptions**:
   - **Severe Gap**: If a client component throws during render, Next.js will crash to an unhandled white-screen or default error overlay because `error.tsx` does not exist in `src/app`.

---

## 16. Documentation Gap Analysis

1. **Roadmap Alignment**:
   - `docs/FRONTEND-ROADMAP.md` line 13 designates Phase F8 as "Security/UX/accessibility/performance hardening — No new business capability".
   - The roadmap must be formally updated or supplemented to account for whether remaining Admin Operations (Reconciliation, Notifications, Users) belong to F8 or an operational subphase sequence.
2. **Missing Runbooks**:
   - `docs/runbooks/` and `scripts/performance/` contain only `.gitkeep`. Performance profiling procedures are not yet formalized.

---

## 17. Portfolio / Demo Gap Analysis

The application is demonstrable in the following areas:
- Customer registration, login, role-based session lifecycle.
- Customer payment creation, idempotency validation, pending reconciliation simulation, and payment detail inspection.
- Merchant refund, reversal, and payout workflows.
- Admin dashboard summary metrics, payment search, forensic investigation distributed trace, immutable ledger transactions, account explorer with dual-balance audit, account freeze/unfreeze, and manual financial adjustments with ledger link traceability.

**Demo Limitations**:
- Customer dashboard requires manual account ID entry.
- Admin Reconciliation Cases, User Directory, and Notifications views cannot be demonstrated because their pages are `.gitkeep` stubs.

---

## 18. Backend-Blocked Capabilities

### Table 2 — Backend-Blocked Work

| Capability | Missing Backend Contract | Impact | Proposed Future Path |
|---|---|---|---|
| **Customer Transactions (F4)** | `GET /api/v1/accounts/{id}/transactions` does not exist; backend ledger queries are `@PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM')")`. | Retail customers cannot view account statements or transaction history. | Implement Phase F4-B backend contract extension in Spring Boot backend. |
| **Customer Ledger Settlement Trace** | No customer-safe payment trace endpoint (`GET /api/v1/payments/{id}/trace` does not exist). | Customers cannot trace payment settlement into the double-entry ledger. | Implement Phase F4-B backend contract extension. |
| **Customer Balance Query** | `GET /api/v1/accounts/{id}/balance` does not exist in `AccountController.java`. | Customer accounts display metadata but zero balances. | Add balance field to `AccountResponse` or implement customer balance endpoint. |
| **Customer Reconciliation (F6)** | Zero customer reconciliation endpoints exist (`GET /api/v1/reconciliation/**` does not exist). | Dedicated customer reconciliation page `/reconciliation` cannot be implemented. | Remain blocked; customer reconciliation visibility remains entity-embedded (F3/F5). |
| **Customer Account List** | `GET /api/v1/accounts` does not exist for customers (only admin search exists). | Customer dashboard cannot automatically list all accounts owned by the user. | Add customer account list query or return `defaultAccountId` in login response. |

---

## 19. Scope Exclusions

The following capabilities are **explicitly excluded** from Phase F8:
- Backend modifications, Spring Boot controller creation, or database schema migrations.
- Implementation of customer transaction history (Phase F4 remains blocked).
- Implementation of customer reconciliation pages (Phase F6 remains blocked).
- Direct browser connections to PostgreSQL, Redis, or Kafka.
- Client-side balance, fee, FX, or debit/credit arithmetic.
- Optimistic financial mutations or automatic mutation retries.
- Fake financial data fabrication or mocking in production bundles.

---

## 20. Proposed F8 Subphase Architecture

Based on the actual findings, Phase F8 should be executed as a structured sequence of hardened subphases:

### Table 7 — Proposed F8 Subphases

| Phase | Subphase Name | Objective | Dependencies | Scope & Key Deliverables | Freeze Gate |
|---|---|---|---|---|---|
| **F8-A** | **Security & Defenses Hardening** | Harden CSP, sanitize open redirects, enforce role guards. | F7-H frozen | Dynamic CSP in `next.config.ts` binding `connect-src` to `NEXT_PUBLIC_API_URL`; sanitize `redirect` param in `login-form.tsx`; restrict `/payouts/new` to `MERCHANT`. | `F8-A_READY_FOR_FREEZE` |
| **F8-B** | **Error Resilience & UX Boundaries** | Eliminate white-screen crashes via Next.js error boundaries. | F8-A | Create `src/app/error.tsx`, `src/app/global-error.tsx`, and `(admin)/error.tsx` with RFC 7807 support, correlation ID display, and safe recovery. | `F8-B_READY_FOR_FREEZE` |
| **F8-C** | **Admin Reconciliation Operations** | Wire existing verified reconciliation backend endpoints to UI. | F8-B, `admin-api.ts` | Implement `/admin/reconciliation` (Cases list, detail modal, trigger reconcile, flag case, ledger/balance audit reports). Strictly read/action within existing backend DTOs. | `F8-C_READY_FOR_FREEZE` |
| **F8-D** | **Admin Governance & Notifications** | Wire existing User Directory & Notification backend endpoints. | F8-C, `admin-api.ts` | Implement `/admin/users` (list, detail) and `/admin/notifications` (list, detail, resend, cleanup). | `F8-D_READY_FOR_FREEZE` |
| **F8-E** | **Accessibility Hardening (Axe-Core)** | Implement automated axe-core audit harness and skip navigation. | F8-D | Add `@axe-core/react` or Vitest axe runner; add "Skip to main content" links in layouts; audit touch targets and contrast. | `F8-E_READY_FOR_FREEZE` |
| **F8-F** | **Performance & Code-Splitting** | Optimize bundle boundaries, caching policies, and dynamic imports. | F8-E | Code-split heavy modals (lifecycle, balance summary, confirm); optimize query cache garbage collection; profile render waterfalls. | `F8-F_READY_FOR_FREEZE` |
| **F8-G** | **CI/CD, Containerization & Final Release Freeze** | Integrate Playwright in CI, add Dockerfile, comprehensive verification. | F8-F | Add Playwright step in `ci.yml`; create multi-stage production `Dockerfile`; run full regression suite; final freeze gate. | `F8-G_READY_FOR_FREEZE` |

---

## 21. Dependency Graph

```
F7-H 🔒 (Frozen Baseline)
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
F8-D (Admin Governance & Notifications)
  │
  ▼
F8-E (Accessibility Hardening & Axe-Core)
  │
  ▼
F8-F (Performance & Code-Splitting)
  │
  ▼
F8-G (CI/CD, Containerization & Final Freeze)
  │
  ▼
F8 🔒 (Complete & Final Frozen)
  │
  ▼
F9 (Production Deployment & Release Readiness)
```

---

## 22. Risk Register

| Risk ID | Description | Severity | Probability | Mitigation Strategy |
|---|---|---|---|---|
| **RSK-01** | CSP connect-src blocks production API | High | High | F8-A: Bind CSP connect-src dynamically to `process.env.NEXT_PUBLIC_API_URL`. |
| **RSK-02** | Open redirect in login query parameter | High | Medium | F8-A: Validate redirect parameter starts with `/` and not `//`. |
| **RSK-03** | Unhandled client component render crash | High | Medium | F8-B: Implement root `error.tsx` and `global-error.tsx`. |
| **RSK-04** | Admin reconciliation cases lack UI | Medium | High | F8-C: Implement `/admin/reconciliation` using existing frozen `admin-api.ts`. |
| **RSK-05** | CI passes without running E2E tests | Medium | High | F8-G: Add headless Playwright workflow in `.github/workflows/ci.yml`. |
| **RSK-06** | Financial arithmetic creep | Critical | Low | Zero-tolerance invariant checks enforced at every subphase gate. |

---

## 23. Open Decisions

1. **Scope of Admin Operational Closure (F8-C, F8-D)**:
   - *Option A (Recommended)*: Deliver F8-C and F8-D as part of F8 to achieve 100% UI coverage for all verified backend admin endpoints.
   - *Option B*: Defer F8-C and F8-D to a separate Phase F7-I/F7-J, keeping F8 strictly limited to non-functional hardening (security, a11y, perf, error boundaries).
2. **Production Deployment Target**:
   - Cloud deployment runtime (Docker on ECS/K8s vs Vercel vs Cloud Run) remains unselected. Propose providing a multi-stage production Dockerfile as cloud-agnostic baseline.

---

## 24. Recommended Implementation Order

1. **Step 1**: Review and freeze this **F8 Gap Analysis Report**.
2. **Step 2**: Begin with **F8-A (Security & Defenses Hardening)**.
3. **Step 3**: Implement **F8-B (Error Resilience & UX Boundaries)**.
4. **Step 4**: Implement **F8-C (Admin Reconciliation Operations)**.
5. **Step 5**: Implement **F8-D (Admin Governance & Notifications)**.
6. **Step 6**: Implement **F8-E (Accessibility Hardening)**.
7. **Step 7**: Implement **F8-F (Performance & Code-Splitting)**.
8. **Step 8**: Complete **F8-G (CI/CD, Containerization & Final Release Freeze)**.

---

## 25. F8 Entry Criteria

Phase F8 implementation may commence once:
1. `PHASE-F8-GAP-ANALYSIS.md` is reviewed and approved.
2. The open decision regarding F8-C/F8-D scope is resolved.
3. The scope of F8-A is frozen.

---

## 26. F8 Freeze Criteria

Phase F8 will achieve final freeze when:
1. All approved F8 subphases are implemented, tested, and individually frozen.
2. Zero TypeScript, lint, or build errors exist.
3. All unit, component, integration, accessibility, and Playwright E2E tests pass.
4. Zero security vulnerabilities or open redirect vectors exist.
5. All financial safety invariants remain strictly zero (zero client-side balance math, zero optimistic mutations).

---

## 27. Final Status

**`F8_GAP_ANALYSIS_READY`**

*(Stop condition reached. No code modifications or phase implementations have been performed.)*
