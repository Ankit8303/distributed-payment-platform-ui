# Phase F1 Gap Analysis — Authentication & Session Management

**Phase**: F1 — Authentication & Session Management  
**Date**: 2026-09-25  
**Author**: Antigravity Engineering Agent  
**Status**: GAP_ANALYSIS_COMPLETE  

---

## 1. Executive Summary

Phase F1 builds the authentication and session management layer for the Distributed Payment & Ledger Platform UI, integrating directly with the already-frozen Spring Boot backend. 

The preceding phase, Phase F0, established a verified engineering foundation (Next.js 15, React 19, TypeScript strict mode, Tailwind CSS, TanStack Query client-side server-state cache, Zod environment parsing, Vitest testing, Playwright E2E, and zero-defect security scanning). Phase F0 is currently frozen.

In Phase F1, the frontend must implement user registration and login workflows, maintain server-confirmed authentication state, handle access and refresh token lifecycles, and protect routes according to backend authorization realities—**without implementing any post-login business capabilities** (such as customer accounts, dashboards, payment processing, or admin operations, which belong to Phases F2 through F7).

This Gap Analysis provides an exhaustive audit of the frozen backend's authentication system, details the answers to all critical security and contract questions, identifies technical and architectural gaps in the current frontend repository, evaluates token storage strategies, and establishes the strict boundaries for Phase F1 implementation.

---

## 2. Frozen Backend Contract Audit (13 Critical Determinations)

An inspection of the frozen backend source code (`com.paymentledger.auth.*`, `SecurityConfig.java`, `JwtService.java`, and `AuthService.java` in `payment-ledger-platform-complete-agent-kit`) provides exact, definitive answers to all authentication questions:

| # | Question | Backend Reality & Contract Finding | Source / Evidence |
| :--- | :--- | :--- | :--- |
| **1** | **Does login return access token?** | **YES**. `LoginResponse` returns `accessToken` (HMAC-SHA256 JWT string). | `LoginResponse.java:11`, `AuthService.java:160` |
| **2** | **Does login return refresh token?** | **YES**. `LoginResponse` returns `refreshToken` (cryptographically random UUID string). | `LoginResponse.java:12`, `AuthService.java:161` |
| **3** | **Is refresh token cookie-based?** | **NO**. The backend does **not** emit a `Set-Cookie` header. It is returned purely in the JSON body. | `AuthController.java:70`, `AuthService.java:166` |
| **4** | **Is refresh token returned in JSON?** | **YES**. Returned as a top-level string property `"refreshToken": "..."` in the JSON response payload. | `LoginResponse.java:27` |
| **5** | **Are cookies HttpOnly?** | **N/A**. No cookies are created or managed by the backend; it is a purely stateless REST API. | `SecurityConfig.java:39` (`SessionCreationPolicy.STATELESS`) |
| **6** | **Are cookies Secure?** | **N/A**. No cookies set by the backend. | `SecurityConfig.java:39` |
| **7** | **SameSite policy?** | **N/A**. No cookies set. CORS explicitly permits `Authorization` and `X-Correlation-ID` headers for configured origins. | `SecurityConfig.java:65-75` |
| **8** | **Token expiration?** | **Access Token**: 900 seconds (15 minutes). Reported in `expiresInSeconds: 900`.<br>**Refresh Token**: 604,800 seconds (7 days) in database. | `application.yml:111-112`, `LoginResponse.java:35` |
| **9** | **Refresh rotation?** | **YES (Strict Exactly-Once)**. The backend enforces atomic single-use refresh token rotation. When refreshed, the database token is atomically revoked via `revokeByTokenHashIfNotRevoked()`. A new access token AND a new refresh token are generated. Replaying an already-consumed refresh token immediately triggers `401 INVALID_REFRESH_TOKEN` (`"Refresh token has already been consumed"`). | `AuthService.java:119-142` |
| **10**| **Logout/revocation behavior?** | **CONTRACT GAP**. The backend exposes **no** `/logout` or revocation endpoint. Refresh tokens expire via database TTL. Client logout must drop in-memory tokens and clear client storage. | `AuthController.java` (only register, login, refresh exist) |
| **11**| **CSRF requirements?** | **DISABLED**. `http.csrf(AbstractHttpConfigurer::disable)` in Spring Security. CSRF protection is unnecessary on the backend because authentication is via `Authorization: Bearer <JWT>`, not ambient browser cookies. | `SecurityConfig.java:37` |
| **12**| **Expected Authorization header?** | `Authorization: Bearer <accessToken>`. Validated by `JwtAuthenticationFilter`. | `JwtAuthenticationFilter.java:35` |
| **13**| **Exact request/response schemas?** | Fully verified and specified below in Section 6. | `RegisterRequest`, `RegisterResponse`, `LoginRequest`, `LoginResponse`, `RefreshTokenRequest` |

---

## 3. Current Frontend Repository State (Post-F0 Freeze)

- **Foundation**: Complete Next.js 15 App Router foundation with React 19, TypeScript strict mode, and Tailwind CSS.
- **Client Server-State Cache**: TanStack Query installed and configured with `retry: false` on mutations in `src/providers/app-providers.tsx`.
- **API Client**: `src/lib/api/client.ts` supports `X-Correlation-ID` generation, standard header injection, and typed RFC 7807 problem details parsing into `ApiError`. It has an optional `token?: string` parameter on `RequestOptions`, but no automatic session/token interceptor.
- **Route Tree**: `src/app/(auth)` contains only empty `.gitkeep` files in `src/app/(auth)/login` and `src/app/(auth)/error`.
- **Feature Slices**: `src/features/auth` contains only an empty `.gitkeep` file.
- **Components**: No authentication forms, buttons, or input groups exist.
- **Testing**: Vitest, React Testing Library, and Playwright configured and passing baseline smoke tests, but no authentication tests exist.

---

## 4. Authentication Architecture & State Classification

State in Phase F1 must follow strict architectural classification:

```text
[ User Interface ]
       │
       ▼
[ AuthContext / AuthProvider ] <───────── (Client-Side Session State)
       │                                     - status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
       │                                     - user: { id: string, role: string, email: string } | null
       │                                     - accessToken: string (IN-MEMORY ONLY)
       │                                     - refreshToken: string (Storage-backed for session continuity)
       ▼
[ API Client Interceptor ] <───────────── Attaches `Authorization: Bearer <accessToken>`
       │                                  Catches HTTP 401
       │                                  Executes atomic refresh loop (prevents concurrent duplicate refresh)
       ▼
[ Frozen Spring Boot REST API ] <──────── AUTHORITATIVE FOR AUTHENTICATION & AUTHORIZATION
       POST /api/v1/auth/login
       POST /api/v1/auth/register
       POST /api/v1/auth/refresh
```

### State Classification Rules
1. **Server State**: Identity validity, active roles, and token validity are authoritative on the backend.
2. **Client-Side Session Cache**: The active access token, decoded user identity (UUID, role), and session expiration timestamp reside in React Context.
3. **Form State**: Form inputs (`email`, `password`, `role`) and client validation errors are strictly local component state.
4. **Authoritative Constraint**: React state and client storage are **never** proof of authorization. Every protected backend endpoint verifies the cryptographic JWT signature and database user status.

---

## 5. Token Lifecycle & Storage Strategy Evaluation

Because the backend returns the refresh token as a JSON string and does not set an `HttpOnly` cookie, the frontend must adopt the most secure client-side storage architecture feasible:

### Option A: Both Tokens in `localStorage`
- **Pros**: Simple; survives page refreshes and new tabs.
- **Cons**: High vulnerability to Cross-Site Scripting (XSS). Malicious scripts can read `localStorage.getItem('token')`.
- **Evaluation**: **REJECTED** for the short-lived access token; highly discouraged as primary strategy for financial systems.

### Option B: Access Token in Memory + Refresh Token in `sessionStorage` (Recommended Strategy)
- **Architecture**:
  - `accessToken` is stored **strictly in memory** (React state / closure variable). Never written to `localStorage`, `sessionStorage`, or cookies.
  - `refreshToken` is stored in `sessionStorage` (scoped to the active browser tab, automatically destroyed when the tab/window is closed).
  - On page refresh, the in-memory access token is re-acquired by invoking `POST /api/v1/auth/refresh` using the stored refresh token.
- **Mitigation against XSS**: XSS attacks cannot extract the access token from persistent disk storage. Even if an attacker reads `sessionStorage`, the refresh token is single-use and rotated immediately upon invocation.
- **Evaluation**: **SELECTED**. Provides the strongest security posture compatible with the backend's pure JSON contract.

### Refresh Concurrency & Race Condition Handling
Because the backend enforces atomic single-use refresh token rotation (`revokeByTokenHashIfNotRevoked`), if two parallel API queries receive HTTP 401 simultaneously and both try to refresh, the second request will fail with `"Refresh token has already been consumed"` and destroy the user's session.
- **Remediation**: The frontend API client must implement a **mutex/queue-based token refresher**. While a refresh request is in flight, all subsequent 401s must wait on the same refresh promise rather than issuing concurrent refresh requests.

---

## 6. Request & Response Schemas

### 6.1 Register: `POST /api/v1/auth/register`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Correlation-ID: <uuid>`
- **Request Body**:
  ```typescript
  {
    email: string;      // NonBlank, valid email format
    password: string;   // NonBlank, MINIMUM 12 CHARACTERS (enforced by backend @Size(min=12))
    role: "CUSTOMER" | "MERCHANT"; // Case-insensitive in backend, normalized to uppercase
  }
  ```
- **Response `201 Created`**:
  ```typescript
  {
    userId: string;     // UUID
    email: string;
    role: "CUSTOMER" | "MERCHANT";
    createdAt: string;  // ISO 8601 UTC timestamp
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `INVALID_PAYLOAD` (e.g. password < 12 characters, invalid email, illegal role such as "ADMIN")
  - `409 Conflict`: `EMAIL_ALREADY_EXISTS` ("An account with this email already exists")

### 6.2 Login: `POST /api/v1/auth/login`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Correlation-ID: <uuid>`
- **Request Body**:
  ```typescript
  {
    email: string;      // NonBlank
    password: string;   // NonBlank
  }
  ```
- **Response `200 OK`**:
  ```typescript
  {
    accessToken: string;       // JWT signed with HMAC-SHA256
    refreshToken: string;      // UUID
    tokenType: "Bearer";
    expiresInSeconds: number;  // 900
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: `INVALID_CREDENTIALS` ("Invalid email or password" or inactive user)
  - `429 Too Many Requests`: `RATE_LIMIT_EXCEEDED` ("Too many login attempts. Please retry later.")

### 6.3 Refresh: `POST /api/v1/auth/refresh`
- **Headers**:
  - `Content-Type: application/json`
  - `X-Correlation-ID: <uuid>`
- **Request Body**:
  ```typescript
  {
    refreshToken: string; // UUID of active token
  }
  ```
- **Response `200 OK`**:
  ```typescript
  {
    accessToken: string;       // New JWT
    refreshToken: string;      // Rotated new UUID
    tokenType: "Bearer";
    expiresInSeconds: number;  // 900
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: `INVALID_REFRESH_TOKEN` ("Refresh token is invalid", "Refresh token has expired", "Refresh token has been revoked", or "Refresh token has already been consumed")

---

## 7. Error Handling & RFC 7807 Mapping

The authentication UI must map backend RFC 7807 error responses to clear, accessible, and user-friendly visual feedback without leaking internal system details:

| Backend Error Code | HTTP Status | User-Facing Presentation | Actionable Guidance |
| :--- | :--- | :--- | :--- |
| `INVALID_CREDENTIALS` | `401` | "Invalid email or password." | Prompt user to check credentials. Do not reveal whether email exists. |
| `EMAIL_ALREADY_EXISTS` | `409` | "An account with this email address already exists." | Prompt user to log in instead. |
| `INVALID_PAYLOAD` | `400` | Highlight specific input field errors (e.g. "Password must be at least 12 characters"). | Render field-level validation messages next to inputs. |
| `INVALID_REFRESH_TOKEN` | `401` | "Your session has expired. Please sign in again." | Clear session state and redirect to `/login?reason=expired`. |
| `RATE_LIMIT_EXCEEDED` | `429` | "Too many attempts. Please wait a few moments before trying again." | Disable submit button temporarily; display retry countdown if available. |
| `SERVICE_UNAVAILABLE` | `503` | "The authentication service is temporarily unavailable." | Advise user to try again later. |

---

## 8. Route Protection & Authorization Boundaries

### Architecture
- Route groups exist in Next.js:
  - `src/app/(auth)/login/page.tsx` (Public, redirects to `/dashboard` if already authenticated)
  - `src/app/(auth)/register/page.tsx` (Public, redirects to `/dashboard` if already authenticated)
  - Protected route shell component / layout guard (`src/components/layout/protected-route.tsx`) that checks `authContext.status`:
    - If `status === 'loading'`: Display accessible skeleton / loading state.
    - If `status === 'unauthenticated'`: Redirect to `/login?redirect=<targetPath>`.
    - If `status === 'authenticated'`: Render children.
- Invariant: Client-side route protection is strictly a UX convenience to prevent unauthenticated users from seeing empty or broken dashboards. The Spring Boot backend enforces true authorization on every API call.

---

## 9. UI & Accessibility Requirements

### 9.1 Visual Excellence & Design System
- Maintain the enterprise dark mode aesthetic established in Phase F0: deep slate background (`#090d16`), card backgrounds (`#0f172a`), emerald accents (`#10b981`), high-contrast slate text (`#f8fafc`).
- Clean, focused form layouts with distinct card surfaces, micro-animations on interaction, and clear status indicators.

### 9.2 Accessibility (WCAG 2.1 AA)
- Form inputs must have explicitly associated `<label>` elements via `htmlFor` and `id`.
- Error messages must use `aria-describedby` pointing to error text elements with `role="alert"`.
- Buttons must display clear focus rings (`focus-visible:ring-2 focus-visible:ring-emerald-500`).
- Passwords must have an accessible "Show/Hide Password" toggle with proper `aria-label` and `aria-pressed`.
- Screen reader announcements for loading and submission status using `aria-live="polite"`.

---

## 10. Testing Strategy

Layered testing pyramid for Phase F1:

1. **Unit Tests (`tests/unit/`)**:
   - `auth-validation.test.ts`: Zod validation schemas for register (12-char password min, email format, valid roles) and login.
   - `token-manager.test.ts`: Refresh token queueing, in-memory token storage, and expiration calculation.
   - `jwt-decode.test.ts`: JWT claim extraction (userId, role, expiration) without external heavy libraries.
2. **Component Tests (`tests/components/`)**:
   - `login-form.test.tsx`: Form rendering, input validation, submission loading states, and error alerts.
   - `register-form.test.tsx`: Password length validation, role selection, submission, and duplicate email error display.
   - `protected-route.test.tsx`: Route guard behavior across loading, unauthenticated, and authenticated states.
3. **Accessibility Tests (`tests/accessibility/`)**:
   - `auth-a11y.test.tsx`: Form labels, ARIA error associations, keyboard navigation order, and contrast compliance.
4. **Integration / E2E Tests (`tests/e2e/`)**:
   - `auth-flow.spec.ts`: Playwright test verifying the full login and registration navigation flow, form interactions, error state displays, and route protection redirection.

---

## 11. Security & Threat Modeling

1. **Token In-Memory Isolation**: The short-lived access token is stored exclusively in memory. No persistent storage is used for access tokens.
2. **Refresh Token Tab Isolation**: Stored in `sessionStorage` to prevent cross-session persistence on shared workstations.
3. **Log Sanitization**: [logger.ts](file:///c:/Users/Ankit/Downloads/distributed-payment-platform-ui-complete-agent-kit-v1\distributed-payment-platform-ui-complete-agent-kit/src/lib/telemetry/logger.ts) redacts passwords and tokens from all telemetry.
4. **Password Length Enforcement**: Form validation strictly requires at least 12 characters to align with backend security policies and prevent unnecessary 400 round-trips.
5. **No Client Role Escalation**: The registration form only permits selection of `CUSTOMER` or `MERCHANT`. The backend explicitly rejects `ADMIN` or `SYSTEM` roles during registration.

---

## 12. Observability & Telemetry Gaps

- Need a structured telemetry hook or event tracker in `src/lib/telemetry/auth-events.ts` to log authentication attempts, successes, failures, and token refreshes (without logging passwords or token strings) with `correlationId` tracking.

---

## 13. Backend Contract Discrepancies & Formal Gaps

1. **No Logout Endpoint**: As identified in Section 2 (Determination 10), the backend has no `POST /api/v1/auth/logout` endpoint. The frontend must implement client-side session termination (discarding tokens from memory and `sessionStorage`).
2. **No Cookie Support**: The backend does not support `Set-Cookie` for refresh tokens. Client storage is required for session preservation across reloads.
3. **Password Minimum Length**: The backend requires a 12-character minimum password (`@Size(min = 12)` in `RegisterRequest.java`). Generic 8-character assumptions must not be used in frontend validation schemas.

---

## 14. Explicit Phase F1 Scope vs. F2+ Exclusions

### Strictly In Scope for F1
- `src/features/auth/`: Registration form, Login form, AuthContext, session hooks (`useAuth`), token manager.
- `src/app/(auth)/login/page.tsx`: Production login page.
- `src/app/(auth)/register/page.tsx`: Production registration page.
- `src/components/layout/protected-route.tsx`: Route protection component.
- Unit, component, accessibility, and E2E test suites for authentication.
- Updating documentation and API contract notes.

### Strictly Out of Scope (Forbidden in F1)
- Customer dashboard views (Phase F2).
- Accounts list or balance displays (Phase F2).
- Payment forms or payment submission (Phase F3).
- Ledger views or transaction tables (Phase F4).
- Refund, reversal, or payout workflows (Phase F5).
- Reconciliation views (Phase F6).
- Admin dashboard or administrative account management (Phase F7).

---

## 15. Required Remediation & Verification Plan

### Files to Create in F1:
- `src/types/auth.ts`: Auth request, response, user session, and token types.
- `src/lib/auth/token-storage.ts`: In-memory access token storage and `sessionStorage` refresh token adapter.
- `src/lib/auth/jwt.ts`: Lightweight client-side JWT payload decoder.
- `src/lib/auth/auth-api.ts`: API functions for register, login, refresh.
- `src/features/auth/auth-context.tsx`: Core session state provider and `useAuth` hook.
- `src/features/auth/components/login-form.tsx`: Accessible, validated login component.
- `src/features/auth/components/register-form.tsx`: Accessible, validated registration component.
- `src/components/layout/protected-route.tsx`: Route protection wrapper.
- `src/app/(auth)/login/page.tsx`: Login route.
- `src/app/(auth)/register/page.tsx`: Register route.
- Test suites in `tests/unit/`, `tests/components/`, `tests/accessibility/`, and `tests/e2e/`.

### Verification Commands:
1. `npm run typecheck` (`tsc --noEmit`)
2. `npm run lint` (`next lint`)
3. `npm run test` (`vitest run`)
4. `npm run build` (`next build`)
5. `npx playwright test`
6. `powershell -ExecutionPolicy Bypass -File scripts/verification/verify-repo.ps1`
7. `powershell -ExecutionPolicy Bypass -File scripts/security/check-secrets.ps1`
8. `powershell -ExecutionPolicy Bypass -File scripts/verification/verify-env.ps1`

---

## 16. Risks & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Concurrent Refresh Token Invalidation** | High | Mutex/single-flight refresh promise ensures only one refresh request is dispatched even if multiple queries receive HTTP 401 simultaneously. |
| **Password Validation Mismatch** | Medium | Align frontend Zod schema strictly with backend 12-character minimum. |
| **Token Leakage in Logs** | Critical | Use `logger.ts` which automatically sanitizes credentials and tokens. |
| **XSS Token Extraction** | Critical | Store access token exclusively in memory; store refresh token in `sessionStorage` rather than `localStorage`. |

---

## 17. Final Gap Analysis Status

**GAP_ANALYSIS_COMPLETE**

All backend authentication controllers, security configurations, DTOs, and token handling behaviors have been audited. The repository is ready for Phase F1 implementation planning.
