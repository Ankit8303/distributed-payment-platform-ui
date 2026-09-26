# Phase F1 Implementation Plan — Authentication & Session Management

**Phase**: F1 — Authentication & Session Management  
**Date**: 2026-09-25  
**Author**: Antigravity Engineering Agent  
**Status**: APPROVED_FOR_IMPLEMENTATION  

---

## 1. Objective

Implement robust, secure, and accessible user authentication and session lifecycle management for the Distributed Payment Platform UI, communicating with the frozen Spring Boot backend (`/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/refresh`). Implement strictly the F1 scope while preserving all F0 architectural boundaries and preventing any leakage into F2+ capabilities.

---

## 2. Architecture & Design Decisions

1. **Token Storage Strategy**:
   - `accessToken`: Maintained strictly in-memory (React context / module state). Never written to `localStorage`, `sessionStorage`, or cookies.
   - `refreshToken`: Stored in `sessionStorage` (scoped to browser tab lifecycle) to enable session rehydration on page reload.
   - Single-flight refresh mutex: When refreshing, all concurrent calls await a single refresh promise to prevent duplicate consumption of the single-use rotated refresh token.
2. **Backend Financial Authority**:
   - Client authentication state does not represent authorization to perform financial actions. Every request transmits `Authorization: Bearer <token>` for backend validation.
3. **Password Policy**:
   - Enforce 12-character minimum password constraint matching backend `@Size(min = 12)` in `RegisterRequest.java`.
4. **Accessible UX**:
   - WCAG 2.1 AA compliant forms, ARIA error relationships, show/hide password toggles, and screen-reader announcements.

---

## 3. Files to Create & Modify

### 3.1 New Types & Infrastructure
- `src/types/auth.ts`: Authentication request/response DTOs, session state, user model.
- `src/lib/auth/jwt.ts`: Lightweight JWT payload decoding utility (extracting `sub`, `role`, `exp`).
- `src/lib/auth/token-storage.ts`: In-memory access token holder, `sessionStorage` refresh token adapter, single-flight refresh queue.
- `src/lib/auth/auth-api.ts`: Typed fetch calls for `/api/v1/auth/register`, `/login`, `/refresh`.

### 3.2 Authentication Context & Components
- `src/features/auth/auth-context.tsx`: `AuthProvider` context and `useAuth` hook managing login, registration, rehydration, and logout.
- `src/features/auth/components/login-form.tsx`: Accessible, interactive login component with error handling.
- `src/features/auth/components/register-form.tsx`: Accessible registration component with 12-character password validation and role selection (`CUSTOMER` / `MERCHANT`).
- `src/components/layout/protected-route.tsx`: Client-side route guard handling loading skeletons, unauthenticated redirects, and role validation.

### 3.3 Pages
- `src/app/(auth)/login/page.tsx`: Production login page wrapped in layout.
- `src/app/(auth)/register/page.tsx`: Production registration page.
- `src/providers/app-providers.tsx`: Update to wrap component tree with `AuthProvider`.

### 3.4 API Client Integration
- `src/lib/api/client.ts`: Update to automatically attach in-memory access token when available.

---

## 4. Test Suite Implementation

1. **`tests/unit/auth-validation.test.ts`**:
   - Tests Zod schemas for login and registration.
   - Verifies 12-character password minimum rejection/acceptance.
   - Verifies role restriction (`CUSTOMER` and `MERCHANT` allowed; `ADMIN` rejected).
2. **`tests/unit/jwt-decode.test.ts`**:
   - Tests decoding of JWT claims (userId UUID, role, expiration timestamp).
3. **`tests/unit/token-storage.test.ts`**:
   - Tests in-memory access token isolation and `sessionStorage` fallback.
4. **`tests/components/login-form.test.tsx`**:
   - Tests form rendering, invalid input feedback, loading state, and error alerts.
5. **`tests/components/register-form.test.tsx`**:
   - Tests role selection, password strength requirements, and duplicate email error display.
6. **`tests/components/protected-route.test.tsx`**:
   - Tests loading state, redirect when unauthenticated, and rendering children when authenticated.
7. **`tests/accessibility/auth-a11y.test.tsx`**:
   - Tests ARIA attributes, label associations, focus indicators, and semantic landmarks.
8. **`tests/e2e/auth.spec.ts`**:
   - Playwright test verifying navigation between login, register, and foundation home page.

---

## 5. Verification Commands

1. `npm run typecheck` (`tsc --noEmit`)
2. `npm run lint` (`next lint`)
3. `npm run test` (`vitest run`)
4. `npm run build` (`next build`)
5. `npx playwright test`
6. `powershell -ExecutionPolicy Bypass -File scripts/verification/verify-repo.ps1`
7. `powershell -ExecutionPolicy Bypass -File scripts/security/check-secrets.ps1`
8. `powershell -ExecutionPolicy Bypass -File scripts/verification/verify-env.ps1`

---

## 6. Scope Boundaries & Prohibitions

- No customer dashboards, account lists, or balance views (Phase F2).
- No payment initiation or ledger viewers (Phases F3, F4).
- No admin operations (Phase F7).
- No backend modifications.
