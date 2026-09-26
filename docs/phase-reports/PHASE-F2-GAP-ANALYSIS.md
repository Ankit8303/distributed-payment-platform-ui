# Phase F2 Gap Analysis — Accounts & Customer Dashboard

**Phase**: F2 — Accounts & Customer Dashboard  
**Date**: 2026-09-25  
**Author**: Antigravity Engineering Agent  
**Status**: GAP_ANALYSIS_COMPLETE  

---

## 1. Executive Summary

Phase F2 focuses on establishing the authenticated **Customer Dashboard Shell** and **Account Overview** for the Distributed Payment & Ledger Platform UI. 

Phase F0 established the core engineering foundation (Next.js 15, React 19, TypeScript strict mode, Tailwind CSS, TanStack Query client-side server-state cache, Zod validation, Vitest unit/component testing, Playwright E2E, and zero-defect security verification), and is frozen. Phase F1 established the complete authentication and session management layer (JWT decoding, in-memory access token isolation, tab-scoped refresh storage with atomic single-flight mutex protection, WCAG 2.1 AA login/register flows, and route protection), and is verified `READY_FOR_FREEZE`.

The objective of Phase F2 is to build the customer dashboard shell and account information view integrated directly with the frozen Spring Boot backend (`payment-ledger-platform-complete-agent-kit`), while strictly respecting the system authority boundaries:
1. The Spring Boot backend remains the authoritative source of identity, accounts, and financial truth.
2. PostgreSQL remains the sole financial source of truth.
3. The frontend is **never** a source of financial truth. TanStack Query serves strictly as a client-side server-state cache.
4. Phase F2 must **not** implement financial mutations (payments, transfers, refunds, payouts, reconciliation) or administrative operations.

This Gap Analysis provides a comprehensive audit of the frozen backend's account management subsystem, answers all 30 backend contract determinations, details the security/IDOR model, analyzes server-state and UI state boundaries, identifies architectural gaps and necessary accommodations, and establishes the strict boundaries for Phase F2.

---

## 2. F0/F1 Baseline Audit

The existing repository was audited to confirm that Phase F0 and F1 foundations are intact and ready to support Phase F2:

| Component | Status | Integration Points for F2 |
| :--- | :--- | :--- |
| **API Client (`src/lib/api/client.ts`)** | Active | Provides typed `apiFetch<T>` with automated in-memory Bearer token injection, correlation ID propagation (`X-Correlation-ID`), and RFC 7807 error parsing (`ApiError`). |
| **Auth Provider (`src/features/auth/auth-context.tsx`)** | Active | Exposes `useAuth()`, managing authenticated user identity (`id`, `email`, `role`) and authentication status (`authenticated`, `unauthenticated`, `loading`). |
| **Route Guard (`src/components/layout/protected-route.tsx`)** | Active | Wraps authenticated views; redirects unauthenticated visitors to `/login?redirect=...` and verifies roles. |
| **Token Storage (`src/lib/auth/token-storage.ts`)** | Active | Isolates access token in-memory; maintains tab-scoped refresh token in `sessionStorage` with single-flight mutex. |
| **Formatting (`src/lib/formatting/money.ts`)** | Active | Implements integer minor units money formatting (`formatMoney(amountMinor, currency)`). Preserves minor-unit arithmetic rules. |
| **Telemetry (`src/lib/telemetry/logger.ts`)** | Active | Provides structured logging with automated secret/credential redaction. |
| **Providers (`src/providers/app-providers.tsx`)** | Active | Configured with TanStack `QueryClientProvider` and `AuthProvider`. |

**Verdict**: The F0 and F1 baselines are robust, fully operational, and require zero architectural changes to support F2.

---

## 3. Frozen Backend Account Contract (30 Determinations)

An exhaustive audit of the frozen Spring Boot backend (`payment-ledger-platform-complete-agent-kit`) across controllers, services, repositories, domain entities, and security configurations resolves all 30 critical determinations:

| # | Contract Determination | Backend Reality & Evidence | Source Reference |
| :--- | :--- | :--- | :--- |
| **1** | **What account endpoints actually exist?** | **Only ONE customer-accessible account endpoint exists**: `GET /api/v1/accounts/{id}`. (Admin endpoints exist on `/api/v1/admin/accounts/**` requiring `ADMIN`/`SYSTEM` role). | `AccountController.java:23`, `AdminAccountController.java:27` |
| **2** | **Which HTTP methods exist?** | **`GET` only** for customer accounts. There are no customer-facing `POST`, `PUT`, `PATCH`, or `DELETE` endpoints on `/api/v1/accounts`. | `AccountController.java:23` |
| **3** | **Exact URL paths?** | `/api/v1/accounts/{id}` | `AccountController.java:14,23` |
| **4** | **Path variables?** | `{id}`: UUID string representing the `accountId`. | `AccountController.java:24` |
| **5** | **Query parameters?** | **None** on `GET /api/v1/accounts/{id}`. (Pagination query params only exist on the admin endpoint `/api/v1/admin/accounts`). | `AccountController.java:23-32` |
| **6** | **Request headers?** | `Authorization: Bearer <accessToken>` (required), `X-Correlation-ID: <string>` (optional, generated if missing). | `SecurityConfig.java:51`, `CorrelationIdFilter.java:31` |
| **7** | **Authorization requirements?** | Requires a valid, unexpired JWT signed by the backend. Stateless validation via `JwtAuthenticationFilter`. | `SecurityConfig.java:53`, `JwtAuthenticationFilter.java:42` |
| **8** | **Required roles?** | Any authenticated role (`CUSTOMER`, `MERCHANT`, `ADMIN`, `SYSTEM`). Caller role dictates ownership check enforcement. | `AccountController.java:30`, `AccountService.java:128` |
| **9** | **Exact response DTO?** | `com.paymentledger.account.api.dto.AccountResponse` | `AccountResponse.java:10` |
| **10** | **Exact JSON field names?** | `accountId` (UUID), `accountNumber` (String), `ownerId` (UUID), `accountType` (String enum), `currency` (String), `status` (String enum), `createdAt` (Instant). | `AccountResponse.java:11-17` |
| **11** | **Data types?** | `accountId`: UUID string; `accountNumber`: string; `ownerId`: UUID string; `accountType`: string; `currency`: string (3 chars); `status`: string; `createdAt`: ISO 8601 string. | `AccountResponse.java:11-17` |
| **12** | **Money representation?** | **No money or balance field is returned** in `AccountResponse`. | `AccountResponse.java:10-31` |
| **13** | **Currency representation?** | String, ISO-4217 3-letter code (e.g., `"USD"`, `"EUR"`, `"GBP"`). Uppercase enforced by service. | `AccountService.java:99`, `AccountResponse.java:15` |
| **14** | **Account status values?** | `ACTIVE`, `FROZEN`, `CLOSED`, `PENDING_VERIFICATION`. | `AccountStatus.java:3-8` |
| **15** | **Account ownership semantics?** | Account is owned by `ownerId` (matching the user's `userId` / JWT `sub`). Non-admins can only read accounts where `ownerId == principal.userId`. | `AccountService.java:132` |
| **16** | **What happens when an account does not exist?** | Backend throws `AccountNotFoundException`. `GlobalExceptionHandler` maps it to HTTP `404 Not Found`, `errorCode: "RESOURCE_NOT_FOUND"`. | `GlobalExceptionHandler.java:114`, `AccountService.java:133` |
| **17** | **What happens on IDOR attempt (accessing another user's account)?** | `AccountService` executes `accountRepository.findByIdAndOwnerId(accountId, ownerId)`. If not owned by caller, throws `AccountNotFoundException("Account not found or access denied")` returning HTTP `404 Not Found` (NOT 403), masking resource existence. | `AccountService.java:132-133`, `GlobalExceptionHandler.java:114` |
| **18** | **Exact HTTP status codes?** | `200 OK` (success), `401 UNAUTHORIZED` (unauthenticated / bad token), `404 NOT_FOUND` (not found or not owned), `429 TOO_MANY_REQUESTS` (rate limit), `500 INTERNAL_SERVER_ERROR`. | `GlobalExceptionHandler.java`, `SecurityConfig.java` |
| **19** | **Exact RFC 7807 error codes?** | `RESOURCE_NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_SERVER_ERROR`. | `ErrorCode.java`, `GlobalExceptionHandler.java` |
| **20** | **Whether balances are actually returned by the endpoint?** | **NO**. `AccountResponse` does **NOT** contain any balance field. | `AccountResponse.java:10-31` |
| **21** | **Whether account status is returned?** | **YES**. `status` field is present in `AccountResponse`. | `AccountResponse.java:16` |
| **22** | **Whether account metadata is returned?** | **YES**. `accountNumber`, `accountType`, `currency`, `createdAt` are returned. | `AccountResponse.java:11-17` |
| **23** | **Whether there can be multiple accounts per user?** | **YES** at the database/repository level (`accountRepository.findByOwnerId(...)`), but there is no customer listing endpoint. | `AccountRepository.java:14` |
| **24** | **How the authenticated user's account ID is determined?** | **CRITICAL GAP**: Account ID is **not** present in JWT claims, not in `LoginResponse`, and not in `RegisterResponse`. Nor is there a customer endpoint to list accounts. | `JwtService.java:35`, `LoginResponse.java:10`, `AccountController.java:14` |
| **25** | **Whether account ID must come from JWT or another backend response?** | Not in JWT (`sub` is `userId`). In the backend, `PaymentController` resolves `accountId` via direct DB query `accountRepository.findByOwnerId(userId)`. For customer frontend, `accountId` must be supplied via route parameter (`/accounts/{id}`) or manual selection. | `PaymentController.java:36-41` |
| **26** | **Whether backend exposes a "current user/current account" endpoint?** | **NO**. Endpoints like `GET /api/v1/users/me` or `GET /api/v1/accounts/me` do **NOT** exist in the backend. | Complete backend controller audit |
| **27** | **Whether account access is customer-only or also merchant-accessible?** | **Both**. Both `CUSTOMER` and `MERCHANT` roles can access `GET /api/v1/accounts/{id}` for accounts they own. | `AccountController.java:30`, `AccountService.java:128-134` |
| **28** | **Whether ADMIN access exists and belongs to F7?** | **YES**. `/api/v1/admin/accounts/**` exists, requires `ROLE_ADMIN` / `ROLE_SYSTEM`, and strictly belongs to Phase F7. | `AdminAccountController.java:28` |
| **29** | **Whether account data is mutable or read-only through F2 endpoints?** | Strictly **READ-ONLY**. Only `GET` is exposed on `/api/v1/accounts/{id}`. | `AccountController.java:23` |
| **30** | **Whether any caching constraints exist?** | Backend caches accounts in Redis (`AccountReadCacheService`, 3600s TTL). In frontend, TanStack Query cache must treat data as non-authoritative server-state cache with recommended `staleTime: 30_000` (30s) and `gcTime: 300_000` (5 min). | `AccountService.java:136`, `AccountReadCacheService.java` |

---

## 4. Account Endpoint Verification

### Real Endpoint Contract
- **Method**: `GET`
- **Path**: `/api/v1/accounts/{id}`
- **Security**: Bearer token in `Authorization` header
- **Path Variable**: `id` (UUID format: 8-4-4-4-12 hex characters)
- **Request Body**: None

### Response Payload (`200 OK`)
```json
{
  "accountId": "a3b4c5d6-e7f8-4901-a234-56789abcdef0",
  "accountNumber": "ACC-USD-104928",
  "ownerId": "f1e2d3c4-b5a6-4789-8012-3456789abcde",
  "accountType": "CUSTOMER",
  "currency": "USD",
  "status": "ACTIVE",
  "createdAt": "2026-09-25T18:30:00Z"
}
```

### Non-Existent Endpoints (Contract Discrepancy Clarification)
The following endpoints **do not exist** on the frozen backend and must **never** be called:
- `GET /api/v1/accounts` (DOES NOT EXIST)
- `GET /api/v1/accounts/me` (DOES NOT EXIST)
- `GET /api/v1/accounts/{id}/balance` (DOES NOT EXIST)
- `GET /api/v1/accounts/{id}/transactions` (DOES NOT EXIST)
- `POST /api/v1/accounts` (DOES NOT EXIST)

---

## 5. Authentication Integration

Phase F2 reuses the frozen F1 authentication foundation without modification:
1. **Token Injection**: `src/lib/api/client.ts` automatically attaches the in-memory access token as `Authorization: Bearer <accessToken>`.
2. **Session Context**: `useAuth()` provides the current user's `id` (which corresponds to `ownerId`), `email`, and `role`.
3. **Session Expiry Handling**: When an access token expires, `client.ts` triggers single-flight token refresh. If refresh fails or the session is revoked, the user is redirected to `/login`.
4. **Route Protection**: All customer dashboard pages will be guarded by `ProtectedRoute` specifying `allowedRoles={['CUSTOMER', 'MERCHANT']}`.
5. **No Parallel Auth**: No duplicate storage, no alternative tokens, and no client-side JWT signing.

---

## 6. Account Ownership Model & Gap Resolution

### The Ownership Gap
1. The backend stores accounts linked to `ownerId == userId`.
2. However, the backend provides **no discovery endpoint** for a customer to retrieve a list of their owned `accountId`s.
3. In the backend's own `PaymentController`, this was resolved by injecting `AccountRepository` and looking up accounts directly by `ownerId`. The frontend cannot do this because it only has access to the REST API.

### F2 Frontend Architecture Resolution
To support robust dashboard navigation and account display within the frozen backend boundaries:
1. **Route Parameterization**: The account overview route is modeled as `/accounts/[id]` and the customer dashboard as `/dashboard`.
2. **Account Selection & Lookup Component**: The dashboard shell includes an accessible Account Selection / Lookup view where users can:
   - Access their active account via direct URL route `/accounts/[id]`.
   - Enter or switch their `accountId` (UUID) to load and inspect account details.
   - Retain the most recently viewed `accountId` in session context / URL query parameter (`/dashboard?accountId=...`) during the active session.
3. **Graceful Empty State**: If no `accountId` is specified, the dashboard renders an informative Empty State explaining that an Account ID is required to inspect account details, providing an accessible input field to query an account.
4. **Authoritative Backend Validation**: Entering any `accountId` triggers an authenticated call to `GET /api/v1/accounts/{id}`. The backend validates whether the account exists and is owned by the user.

---

## 7. IDOR (Insecure Direct Object Reference) Analysis

### Backend Defense-in-Depth Mechanism
When an authenticated user (e.g., User A) enters or navigates to an `accountId` belonging to another user (User B):
1. `AccountController.getAccount(id, principal)` resolves User A's `userId` from the JWT principal.
2. `AccountService.getAccount(accountId, ownerId, userRole)` executes:
   ```java
   account = accountRepository.findByIdAndOwnerId(accountId, ownerId)
           .orElseThrow(() -> new AccountNotFoundException("Account not found or access denied"));
   ```
3. The query filters simultaneously by `accountId` AND `ownerId`. Because User A does not own User B's account, zero rows are returned.
4. An `AccountNotFoundException` is thrown.
5. `GlobalExceptionHandler` converts this to:
   - **HTTP Status**: `404 Not Found`
   - **RFC 7807 Error Code**: `RESOURCE_NOT_FOUND`
   - **Detail**: `"Account not found or access denied"`

### Security & UX Principles
- **No Resource Enumeration**: The backend intentionally returns `404 Not Found` rather than `403 Forbidden`. This prevents attackers from enumerating valid account UUIDs.
- **Frontend IDOR Handling**: The frontend must treat `404 Not Found` gracefully: display a clear, accessible "Account Not Found" message ("The requested account could not be found or you do not have permission to view it").
- **Client Route Guard Limitation**: The frontend route guard only checks if the user is authenticated. It cannot and does not pretend to know if the user owns a specific account. The backend remains the sole authoritative gatekeeper.

---

## 8. State Classification

All state in Phase F2 is strictly categorized:

| State Category | Data Items | Storage / Management Mechanism | Invariants |
| :--- | :--- | :--- | :--- |
| **Server State** | `AccountResponse` (`accountId`, `accountNumber`, `ownerId`, `accountType`, `currency`, `status`, `createdAt`) | TanStack Query Cache (`queryKey: ['accounts', accountId]`) | Strictly client-side cache of server state. Never treated as financial authority. |
| **Auth / Session State** | Authenticated user (`id`, `email`, `role`), token validity | `AuthContext` (in-memory + tab `sessionStorage`) | Server-confirmed session state from Phase F1. |
| **Route / Navigation State** | Active route, selected `accountId` parameter | Next.js App Router URL (`/accounts/[id]` or `?accountId=...`) | Shareable, bookmarkable, reproducible state. |
| **UI State** | Mobile menu open/closed, lookup input validation, banner dismissal | React Component State (`useState`) | Transient, local to browser UI lifecycle. |
| **Financial State** | None (Balances are out-of-scope / omitted from backend `AccountResponse`) | N/A | **Zero client-side calculations or balance mutations**. |

---

## 9. Dashboard Architecture

### Layout Hierarchy
```text
src/app/(customer)/
  ├── layout.tsx                     <-- Customer layout wrapped in ProtectedRoute (CUSTOMER, MERCHANT)
  │    ├── CustomerNavbar            <-- Top bar with brand, user identity badge, sign-out button
  │    ├── CustomerSidebar           <-- Navigation menu (Dashboard, Accounts)
  │    └── Main Content Area         <-- Accessible landmark <main id="main-content">
  │
  ├── dashboard/
  │    └── page.tsx                  <-- Dashboard summary shell (overview cards, quick account lookup)
  │
  └── accounts/
       └── [id]/
            └── page.tsx             <-- Dedicated account detail & status view
```

### Component Structure
- `src/features/accounts/components/`:
  - `account-card.tsx`: Accessible display of account number, currency, account type, and creation date.
  - `account-status-badge.tsx`: Visual and screen-reader accessible badge for `ACTIVE`, `FROZEN`, `CLOSED`, `PENDING_VERIFICATION`.
  - `account-lookup-form.tsx`: Validated form to query an account by UUID.
  - `account-skeleton.tsx`: WCAG-compliant loading skeleton with `aria-busy="true"`.
  - `account-error-view.tsx`: RFC 7807 error presentation with correlation ID display.
  - `account-empty-state.tsx`: Informative empty state when no account is selected.
- `src/components/navigation/`:
  - `customer-nav.tsx`: Accessible navigation bar with active route indicators (`aria-current="page"`).
  - `customer-sidebar.tsx`: Collapsible navigation drawer for mobile and fixed sidebar for desktop.

---

## 10. API Client Architecture

Phase F2 will introduce a typed endpoint module in `src/lib/api/endpoints/accounts.ts`:

```typescript
export interface AccountResponse {
  accountId: string;
  accountNumber: string;
  ownerId: string;
  accountType: 'CUSTOMER' | 'MERCHANT' | 'FEES' | 'INTERNAL_SETTLEMENT' | 'ESCROW';
  currency: string;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED' | 'PENDING_VERIFICATION';
  createdAt: string;
}

export async function getAccount(accountId: string): Promise<AccountResponse> {
  return apiFetch<AccountResponse>(`/api/v1/accounts/${accountId}`);
}
```

- Reuses `apiFetch<T>` from `src/lib/api/client.ts`.
- Validates UUID format prior to network dispatch to avoid unnecessary 400 bad requests.
- Retains correlation ID from backend response for troubleshooting.

---

## 11. Server-State / TanStack Query Strategy

### Query Key Structure
All account queries follow hierarchical query keys:
```typescript
export const accountKeys = {
  all: ['accounts'] as const,
  detail: (id: string) => [...accountKeys.all, 'detail', id] as const,
};
```

### Cache Configuration
- `staleTime: 30_000` (30 seconds): Data remains fresh for 30s to eliminate redundant network hops during tab switches.
- `gcTime: 300_000` (5 minutes): Inactive cache garbage collected after 5 minutes.
- `retry: 1`: Retries once on network failure; **zero retries** on `401`, `403`, or `404` errors.
- `refetchOnWindowFocus: true`: Re-validates account status when returning to the tab.

---

## 12. Error Handling & RFC 7807 Mapping

Every potential error scenario is mapped to a tailored, secure UX pattern:

| HTTP Status | Error Code | Backend Condition | Frontend UX Presentation | Action |
| :--- | :--- | :--- | :--- | :--- |
| **401** | `UNAUTHORIZED` | Expired or invalid access token | Handled by token refresh mutex; if refresh fails, redirect to `/login?redirect=...` | Re-authenticate |
| **403** | `FORBIDDEN` | Accessing admin accounts or unauthorized endpoint | "Access Denied: You do not have permission to view this resource." | Return to Dashboard |
| **404** | `RESOURCE_NOT_FOUND` | Account does not exist OR owned by another user | "Account Not Found: The requested account does not exist or you do not have permission to view it." Displays correlation ID. | Check Account ID |
| **422** | `ACCOUNT_FROZEN` | Account operations restricted | Renders prominent Warning Banner: "This account is currently FROZEN. Transactions are suspended." | Informational |
| **429** | `RATE_LIMIT_EXCEEDED` | Exceeded rate limit (IP/User) | "Too many requests. Please wait a few seconds before trying again." | Wait and retry |
| **500 / 503** | `INTERNAL_SERVER_ERROR` | Backend or database failure | "Service temporarily unavailable. Please try again later." Displays correlation ID. | Retry button |

---

## 13. Security Threat Model

| Threat | Risk Level | Mitigation Strategy |
| :--- | :--- | :--- |
| **IDOR (Tampering with Account ID)** | High | The backend enforces `findByIdAndOwnerId(id, ownerId)` on every query. The frontend route parameter is strictly an identifier passed to the authoritative backend. |
| **Resource Enumeration** | Medium | The backend returns `404 Not Found` for unauthorized accounts, preventing enumeration of existing account IDs. |
| **Token Leakage** | Critical | Access token remains strictly in-memory. Never written to URLs, query strings, localStorage, or telemetry. |
| **PII / Financial Data Exposure** | Medium | Account numbers and details are sanitized in logs. `logger.ts` redacts sensitive fields. |
| **Injection via Account ID** | Low | Path parameter is validated against strict UUID regex (`^[0-9a-fA-F-]{36}$`) before request dispatch. |
| **Client Route Bypass** | High | `ProtectedRoute` provides UX gating only; backend validates every request via `JwtAuthenticationFilter`. |

---

## 14. Accessibility Requirements (WCAG 2.1 AA)

1. **Landmarks**:
   - Single `<h1>` per page (e.g., "Customer Dashboard", "Account Details").
   - Semantic `<header>`, `<nav aria-label="Customer Navigation">`, `<main id="main-content">`, `<footer>`.
2. **Keyboard Navigation & Visible Focus**:
   - Skip to main content link (`<a href="#main-content">Skip to content</a>`).
   - All interactive elements (navigation links, lookup buttons, inputs) reachable via Tab with high-contrast visible focus rings.
3. **Screen Reader Announcements**:
   - Loading skeletons equipped with `aria-busy="true"` and `aria-live="polite"`.
   - Error messages announced with `role="alert"` and `aria-live="assertive"`.
   - Active navigation item indicated via `aria-current="page"`.
   - Account status badges provide accessible text (e.g., `aria-label="Account status: Active"`).
4. **Contrast & Typography**:
   - Text-to-background contrast ratio >= 4.5:1.
   - Large text contrast >= 3:1.

---

## 15. Responsive Design Requirements

- **Mobile (< 768px)**:
  - Collapsible mobile navigation menu with accessible hamburger button (`aria-expanded`, `aria-controls`).
  - Single-column card layout for account details and lookup form.
  - Generous touch targets (min 44x44px).
- **Tablet (768px - 1024px)**:
  - 2-column grid layout for overview statistics and account card.
- **Desktop (>= 1024px)**:
  - Persistent sidebar navigation with icon and text labels.
  - Structured dashboard grid with responsive account view panels.

---

## 16. Performance Requirements

- **Server vs. Client Components**: Layout shells and static chrome are Server Components where possible; interactive views (lookup forms, query hooks) are isolated Client Components.
- **Bundle Footprint**: Reuses existing Lucide icons and utilities; zero new third-party dependencies.
- **Network Optimization**: TanStack Query dedupes concurrent requests; stale time prevents redundant fetches.
- **Target Metrics**:
  - First Load JS increase < 15 kB for customer routes.
  - Page generation clean prerender for static dashboard shells.

---

## 17. Testing Strategy

A layered test suite adhering to the project test pyramid:

1. **Unit Tests**:
   - `tests/unit/account-types.test.ts`: Zod/type validation and UUID format guards.
   - `tests/unit/account-query-keys.test.ts`: Query key factory consistency.
   - `tests/unit/account-error-mapping.test.ts`: Mapping RFC 7807 error responses to user-friendly messages.
2. **Component Tests**:
   - `tests/components/account-card.test.tsx`: Correct rendering of account data, currency, and date.
   - `tests/components/account-status-badge.test.tsx`: Status variants and accessible labels.
   - `tests/components/account-lookup-form.test.tsx`: Form input validation, UUID masking, and submission.
   - `tests/components/customer-nav.test.tsx`: Navigation landmarks and `aria-current` state.
3. **Integration Tests**:
   - `tests/integration/account-api.test.ts`: Integration test for `getAccount()` with mock server (200 OK, 401, 404, 429).
4. **Accessibility Tests**:
   - `tests/accessibility/dashboard-a11y.test.tsx`: Automated landmark and keyboard navigation audit.
5. **Playwright E2E Tests**:
   - `tests/e2e/customer-dashboard.spec.ts`: Authenticated login -> navigate to dashboard -> inspect account card -> handle non-existent account -> verify unauthenticated redirect.

---

## 18. Observability & Telemetry

- Requests to `/api/v1/accounts/{id}` log route transitions and duration at `DEBUG`/`INFO` level.
- Correlation IDs (`X-Correlation-ID`) received from backend responses are included in error telemetry and presented on error cards for customer support reference.
- **Zero Sensitive Data Logging**: Account tokens, credentials, or PII are strictly excluded from telemetry.

---

## 19. Documentation Requirements

The following documentation must be produced or updated during Phase F2:
- `docs/accounts/account-architecture.md`: Specification of account data model, query architecture, and IDOR mitigation.
- `docs/phase-reports/PHASE-F2-IMPLEMENTATION-PLAN.md`: Step-by-step implementation plan.
- `docs/phase-reports/PHASE-F2-FINAL.md`: Phase closure report.
- `docs/phases/PHASE-F2.md`: Phase status tracking.

---

## 20. Proposed File Structure

The proposed additions are strictly modular, minimal, and aligned with the repository's feature-driven architecture:

```text
src/
├── app/
│   └── (customer)/
│       ├── layout.tsx                              # Customer dashboard layout shell
│       ├── dashboard/
│       │   └── page.tsx                            # Customer dashboard summary page
│       └── accounts/
│           └── [id]/
│               └── page.tsx                        # Account detail view
├── components/
│   └── navigation/
│       ├── customer-nav.tsx                        # Header navigation
│       └── customer-sidebar.tsx                    # Responsive navigation sidebar
├── features/
│   └── accounts/
│       ├── api/
│       │   └── accounts-api.ts                     # Account API fetch function
│       ├── hooks/
│       │   └── use-account.ts                      # TanStack Query hook
│       └── components/
│           ├── account-card.tsx                    # Account summary card
│           ├── account-status-badge.tsx            # Status indicator
│           ├── account-lookup-form.tsx             # UUID lookup component
│           ├── account-skeleton.tsx                # Accessible loading skeleton
│           ├── account-empty-state.tsx             # Empty selection state
│           └── account-error-state.tsx             # RFC 7807 error view
└── types/
    └── account.ts                                  # Account DTO interfaces & enums
```

---

## 21. Scope Boundary

- **In Scope for F2**:
  - Customer dashboard shell.
  - Authenticated customer navigation.
  - Account overview & status presentation.
  - Account identification & metadata.
  - Single-account query (`GET /api/v1/accounts/{id}`).
  - Loading, error, and empty states.
  - Server-state caching via TanStack Query.
  - Responsive layout (mobile, tablet, desktop).
  - WCAG 2.1 AA accessibility.
  - Layered tests and documentation.

- **Strictly Out of Scope (Phases F3 - F7)**:
  - Payment initiation, submission, or approval (Phase F3).
  - Transaction history or ledger entry exploration (Phase F4).
  - Refunds or payout workflows (Phase F5).
  - Reconciliation cases or audits (Phase F6).
  - Admin controls, account freeze/unfreeze, user management (Phase F7).
  - Any financial mutation or local balance calculations.

---

## 22. F3+ Scope Leakage Audit

A search across the current workspace confirms:
- `src/app/(customer)/payments/`: Contains only `.gitkeep` (no implementation).
- `src/app/(customer)/payouts/`: Contains only `.gitkeep` (no implementation).
- `src/app/(customer)/reconciliation/`: Contains only `.gitkeep` (no implementation).
- `src/app/(customer)/refunds/`: Contains only `.gitkeep` (no implementation).
- `src/app/(customer)/transactions/`: Contains only `.gitkeep` (no implementation).
- `src/features/payments/`: Contains only `.gitkeep`.
- `src/features/ledger/`: Contains only `.gitkeep`.
- `src/features/admin/`: Contains only `.gitkeep`.

**Audit Result**: Zero premature F3+ implementation or scope leakage exists in the repository.

---

## 23. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| **No Account Discovery Endpoint** | Definite | High | Provide a clear Account Lookup interface and support URL-based account loading (`/accounts/[id]`, `/dashboard?accountId=...`) with informative empty states. |
| **No Balance Field in AccountResponse** | Definite | Medium | Strictly document that `AccountResponse` is an account identification and status entity. Do not manufacture or guess balances on the frontend. |
| **IDOR Attempts by Users** | High | Low | Backend enforces `findByIdAndOwnerId`; frontend gracefully handles backend 404 responses without leaking existence. |
| **Account Frozen Status Confusion** | Medium | Low | Display explicit, accessible warning badges when `status === 'FROZEN'` explaining that operations are restricted by the platform. |

---

## 24. Gap Classification

| Gap ID | Description | Severity | Remediation Plan | Phase |
| :--- | :--- | :--- | :--- | :--- |
| **GAP-F2-01** | Backend does not expose an account listing endpoint for customers (`GET /api/v1/accounts`). | HIGH | Implement an Account Selection / Lookup UI allowing direct lookup and route loading via UUID. | F2 |
| **GAP-F2-02** | Backend does not return account balance in `AccountResponse`. | MEDIUM | Preserve backend contract: display account metadata, currency, and status; do not fabricate balance data. | F2 |
| **GAP-F2-03** | Backend does not expose `GET /api/v1/accounts/{id}/balance` for customers. | MEDIUM | Note as a backend limitation; balances remain unexposed until administrative or transaction features in later phases. | F2 |
| **GAP-F2-04** | User registration does not automatically provision an account in the database. | LOW | Display informative empty state guiding the customer to input their account identifier. | F2 |

---

## 25. Required Remediation

1. Model account types strictly matching backend `AccountResponse` (UUID `accountId`, `accountNumber`, UUID `ownerId`, `accountType`, `currency`, `status`, `createdAt`).
2. Implement `useAccount(accountId)` TanStack Query hook with safe error and loading states.
3. Design dashboard shell with responsive navigation, account lookup input, and detailed account status presentation.
4. Ensure zero financial calculations or balance manufacturing occurs on the client.

---

## 26. Verification Plan

Prior to proposing freeze for Phase F2, the following verification suite must pass with Exit Code 0:
1. `npm run typecheck` (`tsc --noEmit`): Strict TypeScript validation with 0 errors.
2. `npm run lint` (`next lint`): Zero ESLint errors or warnings.
3. `npm run test` (`vitest run`): 100% pass on unit, component, and integration test suites.
4. `npm run build` (`next build`): Clean production bundle generation.
5. `npx playwright test`: Full E2E suite passing in Chromium.
6. `scripts/verification/verify-repo.ps1`: Zero forbidden files or broken structures.
7. `scripts/security/check-secrets.ps1`: Zero secrets or unauthorized environment files.
8. `scripts/verification/verify-env.ps1`: Environment configuration compliance.

---

## 27. Final Gap Status

**GAP_ANALYSIS_COMPLETE**

The Phase F2 Gap Analysis is complete. All 30 backend contract determinations have been audited and verified against the frozen Spring Boot backend source code. All architectural patterns, security mitigations, and implementation boundaries have been established. Ready for implementation planning upon human approval.
