# Phase F2 Implementation Plan — Accounts & Customer Dashboard

**Phase**: F2 — Accounts & Customer Dashboard  
**Date**: 2026-09-25  
**Author**: Antigravity Engineering Agent  
**Status**: IMPLEMENTATION_PLAN_READY  

---

## 1. Executive Summary

Phase F2 introduces the authenticated **Customer Dashboard Shell** and **Account Overview** for the Distributed Payment & Ledger Platform UI. 

Phase F0 established the verified engineering foundation (frozen), and Phase F1 implemented and verified the complete authentication and session management layer (verified `READY_FOR_FREEZE`). Phase F2 builds directly upon this foundation without redesigning authentication or modifying the frozen Spring Boot backend (`payment-ledger-platform-complete-agent-kit`).

The objective of Phase F2 is to deliver an accessible, secure, and responsive customer account dashboard integrated strictly with the single customer-facing account endpoint exposed by the backend: `GET /api/v1/accounts/{id}`. In accordance with system authority rules, PostgreSQL is the sole financial source of truth, the Spring Boot backend is the sole authority for identity and authorization, and the frontend is never an authority for financial state. Furthermore, because the backend `AccountResponse` does not include any balance field, Phase F2 strictly prohibits balance calculations, synthetic figures, or financial mutations.

---

## 2. Approved Gap Analysis Baseline

This plan builds strictly upon the findings approved in [`docs/phase-reports/PHASE-F2-GAP-ANALYSIS.md`](file:///c:/Users/Ankit/Downloads/distributed-payment-platform-ui-complete-agent-kit-v1/distributed-payment-platform-ui-complete-agent-kit/docs/phase-reports/PHASE-F2-GAP-ANALYSIS.md):

1. **Endpoint Exclusivity**: The backend exposes strictly `GET /api/v1/accounts/{id}` for non-admin callers. Endpoints `GET /api/v1/accounts`, `GET /api/v1/accounts/me`, `GET /api/v1/accounts/{id}/balance`, and `POST /api/v1/accounts` do not exist and will not be called or mocked.
2. **Account Response Structure**: `AccountResponse` contains strictly identification and status metadata (`accountId`, `accountNumber`, `ownerId`, `accountType`, `currency`, `status`, `createdAt`). Zero financial balances are returned.
3. **Account Discovery Gap**: Because neither JWT nor login response contains an `accountId`, the dashboard provides deep-link routing (`/accounts/[id]`, `/dashboard?accountId=...`), session context memory, and an accessible fallback lookup mechanism.
4. **IDOR Defense-in-Depth**: The backend checks `findByIdAndOwnerId(id, ownerId)` and returns HTTP `404 Not Found` (`RESOURCE_NOT_FOUND`) on unauthorized access to prevent account existence enumeration.
5. **Phase Isolation**: Zero payment, transaction, ledger, refund, payout, reconciliation, or admin features (Phases F3–F7) are in scope.

---

## 3. Architecture

```text
[ Browser Context ]
   │
   ├── ProtectedRoute (gated on 'CUSTOMER' | 'MERCHANT')
   │    │
   │    └── CustomerLayout (src/app/(customer)/layout.tsx)
   │         ├── CustomerNavbar (User Identity Badge, Sign-Out)
   │         ├── CustomerSidebar (Navigation: Dashboard, Accounts)
   │         │
   │         └── App Router Page Hierarchy:
   │              ├── /dashboard (src/app/(customer)/dashboard/page.tsx)
   │              │    ├── Customer Overview Banner
   │              │    ├── Active Account Summary Card (if context/param exists)
   │              │    └── Account Switcher / Fallback Lookup Form
   │              │
   │              └── /accounts/[id] (src/app/(customer)/accounts/[id]/page.tsx)
   │                   ├── Account Header & Status Badge
   │                   ├── Account Identification & Metadata Grid
   │                   └── Back to Dashboard Navigation Link
   │
   ├── API & Data Layer (src/features/accounts/)
   │    ├── apiFetch<AccountResponse>('/api/v1/accounts/{id}')
   │    │    └── Injects Authorization: Bearer <accessToken> (from F1 in-memory storage)
   │    │    └── Injects X-Correlation-ID
   │    │
   │    └── TanStack Query (useAccount hook)
   │         └── queryKey: ['accounts', 'detail', accountId]
   │         └── Client-side server-state cache (staleTime: 30s, gcTime: 5m)
```

---

## 4. Backend Contract

### Target Endpoint
- **HTTP Method**: `GET`
- **Path**: `/api/v1/accounts/{id}`
- **Security**: Bearer token via `Authorization` header
- **Path Variable**: `id` (RFC 4122 UUID string, e.g. `123e4567-e89b-12d3-a456-426614174000`)
- **Query Parameters**: None
- **Request Body**: None

### Response Payload Schema (`200 OK`)
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

### Response Status Codes
- `200 OK`: Account exists and belongs to the authenticated user.
- `401 UNAUTHORIZED`: Missing, expired, or invalid token.
- `404 NOT_FOUND`: Account does not exist OR belongs to another owner (`RESOURCE_NOT_FOUND`).
- `429 TOO_MANY_REQUESTS`: Rate limit exceeded (`RATE_LIMIT_EXCEEDED`).
- `500 INTERNAL_SERVER_ERROR`: Server error (`INTERNAL_SERVER_ERROR`).

---

## 5. Account Data Model

Defined in `src/types/account.ts`:

```typescript
export type AccountType = 
  | 'CUSTOMER' 
  | 'MERCHANT' 
  | 'FEES' 
  | 'INTERNAL_SETTLEMENT' 
  | 'ESCROW';

export type AccountStatus = 
  | 'ACTIVE' 
  | 'FROZEN' 
  | 'CLOSED' 
  | 'PENDING_VERIFICATION';

export interface AccountResponse {
  accountId: string;
  accountNumber: string;
  ownerId: string;
  accountType: AccountType;
  currency: string;
  status: AccountStatus;
  createdAt: string;
}

export interface AccountSummaryVM {
  accountId: string;
  accountNumber: string;
  ownerId: string;
  accountType: AccountType;
  currency: string;
  status: AccountStatus;
  createdAtFormatted: string;
}
```

---

## 6. Account-ID Strategy

The backend provides no customer account listing endpoint (`GET /api/v1/accounts` does not exist), and does not embed the account ID in the JWT. To prevent raw UUID entry from becoming a confusing primary experience while adhering to backend reality:

1. **Direct Deep-Link Navigation (`/accounts/[id]`)**:
   - The primary route for inspecting any specific account is `/accounts/[id]`.
   - The page reads the route parameter `params.id`, validates UUID formatting, and queries the authoritative backend via TanStack Query.
2. **Dashboard Query Context (`/dashboard?accountId=...`)**:
   - If an `accountId` query parameter is present, the dashboard renders the active account overview card at the top of the dashboard.
   - When viewing an account, users can bookmark or share deep-links.
3. **Session Context Memory**:
   - When a valid account is fetched, its ID is remembered in active session memory (`AccountSessionContext`), so returning to `/dashboard` automatically retains and displays the active account.
4. **Graceful Empty State**:
   - If no account ID is available in URL or session context, `/dashboard` displays an **Account Selection & Lookup** empty state.
   - The empty state explains that an Account ID is required to inspect account details and provides an accessible input to query an account.
5. **No Synthetic Endpoints**:
   - No fake `/api/v1/accounts/me` endpoint is manufactured.
   - No assumptions that `userId === accountId` are made.
   - The backend remains the sole authority for account ownership.

---

## 7. Dashboard Architecture

### Page Responsibilities
- **`src/app/(customer)/layout.tsx`**:
  - Gated by `ProtectedRoute` (`allowedRoles={['CUSTOMER', 'MERCHANT']}`).
  - Provides customer navigation chrome (header, sidebar, skip-link).
  - Supplies `AccountSessionProvider` for active account context.
- **`src/app/(customer)/dashboard/page.tsx`**:
  - Welcome banner with authenticated customer identity (`user.email`, `user.role`).
  - Active account card if an account is selected.
  - Fallback lookup form to switch or load an account by UUID.
  - Navigation quick links to `/accounts/[id]`.
- **`src/app/(customer)/accounts/[id]/page.tsx`**:
  - Dedicated account inspection view.
  - Displays account number, type, currency, status, and creation date.
  - Handles loading skeletons, error states, and unowned account notices.

---

## 8. Component Architecture

All components located in `src/features/accounts/components/`:

| Component | Responsibility | Props / Inputs | Accessibility / States |
| :--- | :--- | :--- | :--- |
| **`AccountCard`** | Renders formatted account information, currency, and type. | `account: AccountResponse` | Semantic `<section>`, `aria-labelledby`, accessible list. |
| **`AccountStatusBadge`** | Visual and screen-reader accessible badge for account status. | `status: AccountStatus` | Explicit `aria-label`, high-contrast color tokens for `ACTIVE`, `FROZEN`, `CLOSED`, `PENDING_VERIFICATION`. |
| **`AccountLookupForm`** | Validated form to query an account by UUID. | `onSubmit(id: string)`, `isLoading?: boolean` | Programmatic `<label>`, `aria-describedby` for UUID format hint, inline error messages. |
| **`AccountSkeleton`** | Loading placeholder during data fetch. | None | `aria-busy="true"`, `aria-live="polite"`, animated pulse. |
| **`AccountErrorState`** | Displays RFC 7807 error details and correlation ID. | `error: ApiError \| Error`, `onRetry?: () => void` | `role="alert"`, `aria-live="assertive"`, correlation ID display. |
| **`AccountEmptyState`** | Informational guide when no account is selected. | `onSelectAccount?: (id: string) => void` | Accessible illustration/icon, clear heading, input action. |

Navigation components in `src/components/navigation/`:
- **`CustomerNav`**: Top navigation header with user profile badge, active role, and sign-out button.
- **`CustomerSidebar`**: Responsive sidebar menu with `aria-current="page"` active link indication.

---

## 9. API Architecture

Implemented in `src/features/accounts/api/accounts-api.ts`:

```typescript
import { apiFetch } from '@/lib/api/client';
import { AccountResponse } from '@/types/account';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return UUID_REGEX.test(id.trim());
}

export async function getAccount(accountId: string): Promise<AccountResponse> {
  const trimmed = accountId.trim();
  if (!isValidUuid(trimmed)) {
    throw new Error('Invalid Account ID format. Expected a valid UUID.');
  }
  return apiFetch<AccountResponse>(`/api/v1/accounts/${trimmed}`);
}
```

- Reuses `apiFetch<T>` from `src/lib/api/client.ts`.
- Injects in-memory access token via `Authorization: Bearer <accessToken>`.
- Injects and propagates `X-Correlation-ID`.
- Throws typed `ApiError` on HTTP failure.

---

## 10. TanStack Query Strategy

Implemented in `src/features/accounts/hooks/use-account.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { getAccount, isValidUuid } from '../api/accounts-api';
import { AccountResponse } from '@/types/account';
import { ApiError } from '@/types/api';

export const accountKeys = {
  all: ['accounts'] as const,
  detail: (id: string) => [...accountKeys.all, 'detail', id] as const,
};

export function useAccount(accountId: string | null | undefined) {
  return useQuery<AccountResponse, ApiError>({
    queryKey: accountKeys.detail(accountId ?? ''),
    queryFn: () => getAccount(accountId!),
    enabled: Boolean(accountId && isValidUuid(accountId)),
    staleTime: 30_000,       // 30 seconds
    gcTime: 300_000,         // 5 minutes
    retry: (failureCount, error) => {
      // Do NOT retry 401, 403, or 404
      if (error instanceof ApiError && [401, 403, 404].includes(error.status)) {
        return false;
      }
      return failureCount < 2;
    },
    refetchOnWindowFocus: true,
  });
}
```

---

## 11. Error Handling

| Scenario | HTTP Status | Backend Error Code | UI Component | Action |
| :--- | :--- | :--- | :--- | :--- |
| **Invalid UUID Format** | Client | N/A | `AccountLookupForm` | Inline client validation error: "Please enter a valid 36-character UUID." |
| **Token Expired / Missing** | `401` | `UNAUTHORIZED` | Handled by F1 mutex | Auto-refresh access token; if refresh fails, redirect to `/login?redirect=...`. |
| **Account Not Found / Unowned (IDOR)** | `404` | `RESOURCE_NOT_FOUND` | `AccountErrorState` | Display: "Account Not Found. The requested account could not be found or you do not have permission to view it." Displays correlation ID. |
| **Rate Limited** | `429` | `RATE_LIMIT_EXCEEDED` | `AccountErrorState` | Display: "Rate limit exceeded. Please wait a moment before trying again." |
| **Server / Network Error** | `500` / `503` | `INTERNAL_SERVER_ERROR` | `AccountErrorState` | Display: "Service temporarily unavailable. Please try again later." Provides "Retry" button. |

---

## 12. Security Plan

1. **Token In-Memory Protection**: Access token continues to reside exclusively in memory. No tokens are written to `localStorage`, `sessionStorage`, cookies, or URLs.
2. **Zero URL Credential Leakage**: Only the public non-secret account UUID appears in route URLs.
3. **No Sensitive Telemetry**: `logger.ts` redacts sensitive fields; account IDs and numbers are logged safely without exposing personal credentials.
4. **Client Gating vs. Authoritative Enforcement**: `ProtectedRoute` provides client UX convenience only. Spring Security (`JwtAuthenticationFilter` + `AccountService.findByIdAndOwnerId`) enforces strict authorization on every network request.

---

## 13. IDOR Protection

When a user attempts to access an account owned by another customer:
1. The backend executes `accountRepository.findByIdAndOwnerId(accountId, ownerId)`.
2. Because the `ownerId` does not match, the query returns empty.
3. The backend throws `AccountNotFoundException("Account not found or access denied")`.
4. `GlobalExceptionHandler` converts this to `404 Not Found` with `RESOURCE_NOT_FOUND`.
5. The frontend displays:
   > "Account Not Found. The requested account could not be found or you do not have permission to view it."
6. **No Existence Leakage**: The frontend does not reveal whether the account exists under another user.

---

## 14. Accessibility Plan (WCAG 2.1 AA)

- **Semantic Landmarks**: Each page contains `<header>`, `<nav aria-label="Customer Navigation">`, `<main id="main-content">`, and `<footer>`.
- **Single `<h1>`**: Every route has exactly one `<h1>` ("Customer Dashboard" or "Account Details").
- **Keyboard Navigation & Focus**:
  - Skip link (`<a href="#main-content">Skip to content</a>`).
  - High-contrast focus rings on all inputs and links (`focus-visible:ring-2 focus-visible:ring-offset-2`).
- **Screen Reader Announcements**:
  - `AccountSkeleton` uses `aria-busy="true"` and `aria-live="polite"`.
  - `AccountErrorState` uses `role="alert"` and `aria-live="assertive"`.
  - Active navigation links use `aria-current="page"`.
  - Account status badges use descriptive labels (e.g. `aria-label="Account status: Active"`).

---

## 15. Responsive Design Plan

- **Mobile (< 768px)**:
  - Collapsible navigation drawer toggled via accessible hamburger button.
  - Single-column layout for dashboard summary and account details.
  - Minimum touch target sizing (44x44px).
- **Tablet (768px - 1024px)**:
  - 2-column grid layout for overview statistics and account card.
- **Desktop (>= 1024px)**:
  - Persistent left sidebar with navigation icons and text labels.
  - Fixed-width container with responsive layout grids.

---

## 16. Performance Plan

- **Server Component Layout**: `(customer)/layout.tsx` renders static structural layout on the server.
- **Query Deduplication**: TanStack Query deduplicates concurrent requests for the same `accountId`.
- **Cache Reuse**: `staleTime: 30_000` prevents redundant network fetches when switching between tabs.
- **Bundle Footprint**: Reuses existing icons and styling; zero new npm dependencies.

---

## 17. Testing Plan

### Layer 1: Unit Tests
- `tests/unit/account-types.test.ts`: Validate AccountResponse structure and UUID validation guard.
- `tests/unit/account-query-keys.test.ts`: Validate query key factory consistency.
- `tests/unit/account-error-mapping.test.ts`: Test RFC 7807 error status and message mapping.

### Layer 2: Component Tests
- `tests/components/account-card.test.tsx`: Test rendering of account number, currency, type, and date.
- `tests/components/account-status-badge.test.tsx`: Test badge styling and accessible text for each `AccountStatus`.
- `tests/components/account-lookup-form.test.tsx`: Test UUID validation, form submission, and loading state.
- `tests/components/customer-nav.test.tsx`: Test navigation landmarks, user info badge, and sign-out action.

### Layer 3: Integration Tests
- `tests/integration/accounts-api.test.ts`: Mocked `apiFetch` integration tests verifying Bearer token inclusion, correlation ID propagation, 200 OK parsing, 401 handling, and 404 error handling.

### Layer 4: Accessibility Tests
- `tests/accessibility/dashboard-a11y.test.tsx`: Automated axe/landmark audit on dashboard shell, account card, and lookup form.

### Layer 5: Playwright E2E Tests
- `tests/e2e/customer-dashboard.spec.ts`:
  1. Authenticated user navigates to `/dashboard`.
  2. Unauthenticated user is redirected to `/login?redirect=%2Fdashboard`.
  3. Dashboard renders customer identity banner and account lookup form.
  4. User enters valid UUID -> navigates to `/accounts/[id]` -> displays account card.
  5. User queries non-existent or foreign account -> displays 404 error state.
  6. Sign out terminates session and redirects to `/login`.

---

## 18. Observability Plan

- Structured logging in `logger.ts` for account navigation events.
- Correlation IDs (`X-Correlation-ID`) received from backend responses are captured in error states and displayed to users for support reference.
- Zero sensitive account information or authentication tokens logged.

---

## 19. Documentation Plan

Phase F2 will produce:
- `docs/accounts/account-architecture.md`: Specification of account data model, query architecture, and IDOR mitigation.
- `docs/phase-reports/PHASE-F2-IMPLEMENTATION-PLAN.md`: This implementation plan.
- `docs/phase-reports/PHASE-F2-FINAL.md`: Phase F2 closure report.
- `docs/phases/PHASE-F2.md`: Phase status tracking updated to `READY_FOR_FREEZE`.

---

## 20. File-by-File Implementation Plan

| File Path | Action | Purpose & Implementation Responsibility | Dependencies | Tests |
| :--- | :--- | :--- | :--- | :--- |
| `src/types/account.ts` | Create | DTO types (`AccountResponse`, `AccountType`, `AccountStatus`). | None | `tests/unit/account-types.test.ts` |
| `src/features/accounts/api/accounts-api.ts` | Create | `getAccount(id)` API fetch function with UUID guard. | `src/lib/api/client.ts` | `tests/integration/accounts-api.test.ts` |
| `src/features/accounts/hooks/use-account.ts` | Create | TanStack Query hook `useAccount` and query keys. | `@tanstack/react-query`, `accounts-api.ts` | `tests/unit/account-query-keys.test.ts` |
| `src/features/accounts/components/account-status-badge.tsx` | Create | Accessible badge displaying account status. | `src/types/account.ts` | `tests/components/account-status-badge.test.tsx` |
| `src/features/accounts/components/account-card.tsx` | Create | Account details display card (metadata, currency, date). | `account-status-badge.tsx` | `tests/components/account-card.test.tsx` |
| `src/features/accounts/components/account-lookup-form.tsx` | Create | Accessible UUID lookup input with client validation. | `accounts-api.ts` | `tests/components/account-lookup-form.test.tsx` |
| `src/features/accounts/components/account-skeleton.tsx` | Create | WCAG-compliant loading skeleton with `aria-busy`. | None | Tested in dashboard/account page |
| `src/features/accounts/components/account-empty-state.tsx` | Create | Informative empty state when no account is selected. | None | Tested in dashboard page |
| `src/features/accounts/components/account-error-state.tsx` | Create | RFC 7807 error view with correlation ID. | `src/types/api.ts` | Tested in account detail page |
| `src/components/navigation/customer-nav.tsx` | Create | Header navigation with user email and sign-out button. | `useAuth()` | `tests/components/customer-nav.test.tsx` |
| `src/components/navigation/customer-sidebar.tsx` | Create | Responsive navigation drawer and desktop sidebar. | `customer-nav.tsx` | `tests/components/customer-nav.test.tsx` |
| `src/app/(customer)/layout.tsx` | Create | Customer layout shell wrapped in `ProtectedRoute`. | `ProtectedRoute`, `CustomerNav`, `CustomerSidebar` | Tested in E2E |
| `src/app/(customer)/dashboard/page.tsx` | Create | Dashboard landing page with overview and lookup form. | `AccountCard`, `AccountLookupForm`, `AccountEmptyState` | `tests/e2e/customer-dashboard.spec.ts` |
| `src/app/(customer)/accounts/[id]/page.tsx` | Create | Account detail view by UUID with loading/error handling. | `useAccount`, `AccountCard`, `AccountSkeleton`, `AccountErrorState` | `tests/e2e/customer-dashboard.spec.ts` |
| `docs/accounts/account-architecture.md` | Create | Architecture specification for customer accounts. | None | N/A |
| `docs/phases/PHASE-F2.md` | Modify | Update phase status to `IN_PROGRESS` then `READY_FOR_FREEZE`. | None | N/A |

---

## 21. Implementation Order

```text
Step 1:  Account types & contracts (src/types/account.ts)
Step 2:  Account API client (src/features/accounts/api/accounts-api.ts)
Step 3:  TanStack Query hook & keys (src/features/accounts/hooks/use-account.ts)
Step 4:  Account status badge & card (account-status-badge.tsx, account-card.tsx)
Step 5:  Account skeleton, empty state & error state components
Step 6:  Account lookup form component
Step 7:  Customer navigation components (customer-nav.tsx, customer-sidebar.tsx)
Step 8:  Customer layout shell (src/app/(customer)/layout.tsx)
Step 9:  Dashboard landing page (src/app/(customer)/dashboard/page.tsx)
Step 10: Account detail page (src/app/(customer)/accounts/[id]/page.tsx)
Step 11: Unit & Component tests
Step 12: Integration & Accessibility tests
Step 13: Playwright E2E customer dashboard suite
Step 14: Security & secret scanning verification
Step 15: Documentation (account-architecture.md, PHASE-F2-FINAL.md)
Step 16: Full repository verification & freeze audit
```

---

## 22. Verification Gates

Every gate must pass cleanly with **Exit Code 0**:

| Gate | Command | Verification Purpose |
| :--- | :--- | :--- |
| **Type Check** | `npm run typecheck` (`tsc --noEmit`) | Strict TypeScript compilation across all new files with 0 errors. |
| **Lint** | `npm run lint` (`next lint`) | Zero ESLint warnings or errors. |
| **Unit & Component Tests** | `npm run test` (`vitest run`) | 100% pass across all unit, component, and integration suites. |
| **Production Build** | `npm run build` (`next build`) | Prerender all routes successfully (including `/dashboard` and dynamic `/accounts/[id]`). |
| **Playwright E2E** | `npx playwright test` | Complete end-to-end user journeys pass in headless Chromium. |
| **Repository Hygiene** | `powershell ... verify-repo.ps1` | Valid directory structure, zero forbidden files. |
| **Secret Scan** | `powershell ... check-secrets.ps1` | Zero credentials, private keys, or illicit `.env` files. |
| **Environment Check** | `powershell ... verify-env.ps1` | Valid `NEXT_PUBLIC_*` configuration. |

---

## 23. Scope Boundary

- **Phase F2 WILL implement**:
  - Authenticated customer dashboard shell.
  - Customer navigation and user identity badge.
  - Account identification and metadata display.
  - Single-account query (`GET /api/v1/accounts/{id}`).
  - Account status presentation (`ACTIVE`, `FROZEN`, `CLOSED`, `PENDING_VERIFICATION`).
  - Loading skeletons, empty states, and RFC 7807 error handling.
  - WCAG 2.1 AA accessibility and responsive layout.
  - Unit, component, integration, and E2E tests.
- **Phase F2 WILL NOT implement**:
  - Financial balances (not returned by backend `AccountResponse`).
  - Payment creation, submission, or approval (Phase F3).
  - Transaction history or ledger entry views (Phase F4).
  - Refunds or payout workflows (Phase F5).
  - Reconciliation cases or audits (Phase F6).
  - Admin controls, user management, or account freeze/unfreeze (Phase F7).
  - Synthetic or client-side financial calculations.

---

## 24. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| **Customer Lacks Account ID** | High | Medium | Provide an accessible Account Lookup form and empty state guiding users to input or deep-link their account UUID. |
| **Expectation of Balance Display** | High | Low | Explicitly document that backend `AccountResponse` does not include balance data. Do not show synthetic figures. |
| **IDOR URL Tampering** | Medium | Low | Rely on authoritative backend checks (`findByIdAndOwnerId`) returning 404, preventing enumeration. |
| **Session Invalidation During Use** | Low | Medium | Re-use single-flight refresh mutex; redirect to `/login` if refresh fails. |

---

## 25. Rollback Strategy

If a blocking defect is identified during Phase F2 implementation:
1. Revert newly added files in `src/app/(customer)/` and `src/features/accounts/`.
2. Phase F0 and Phase F1 baselines remain completely unaffected and frozen.
3. Git working tree can be restored cleanly to Phase F1 freeze state without impact on earlier deliverables.

---

## 26. Final Approval Gate

**IMPLEMENTATION_PLAN_READY**

The Phase F2 Implementation Plan is complete, fully specified, and adheres strictly to the frozen backend contract. No implementation has been started. Implementation will proceed only upon explicit human approval.
