# Phase F0 Implementation Plan — Distributed Payment Platform UI

**Phase**: F0 — Architecture & Methodology Bootstrap  
**Date**: 2026-09-25  
**Author**: Antigravity Engineering Agent  
**Status**: APPROVED_FOR_IMPLEMENTATION  

---

## 1. Objective

Implement the production-oriented Next.js frontend foundation for the Distributed Payment & Ledger Platform without implementing any business capabilities reserved for Phases F1 through F9. Establish all tooling, configurations, types, styling tokens, test frameworks, security checks, and verification automation.

---

## 2. Dependencies to Install

### 2.1 Production Dependencies
- `next`: `^15.1.0` (React framework with App Router)
- `react`: `^19.0.0` (UI library)
- `react-dom`: `^19.0.0` (React DOM renderer)
- `@tanstack/react-query`: `^5.62.0` (Client-side server-state cache)
- `zod`: `^3.24.0` (Schema validation for runtime environment and API contracts)
- `clsx`: `^2.1.1` (Conditional class formatting)
- `tailwind-merge`: `^2.6.0` (Conflict-free Tailwind class resolution)
- `lucide-react`: `^0.469.0` (Production SVG icons for system status and indicators)

### 2.2 Development Dependencies
- `typescript`: `^5.7.2` (Strict type safety)
- `@types/node`: `^22.10.2` (Node.js type definitions)
- `@types/react`: `^19.0.2` (React types)
- `@types/react-dom`: `^19.0.2` (React DOM types)
- `tailwindcss`: `^3.4.17` (CSS utility engine)
- `postcss`: `^8.4.49` (CSS transformation)
- `autoprefixer`: `^10.4.20` (Vendor prefixing)
- `eslint`: `^9.17.0` (Static code analysis)
- `eslint-config-next`: `^15.1.0` (Next.js ESLint configuration)
- `vitest`: `^3.0.0` (Modern test runner)
- `@testing-library/react`: `^16.1.0` (React component testing)
- `@testing-library/jest-dom`: `^6.6.3` (DOM matchers)
- `jsdom`: `^25.0.1` (Browser environment emulation for Vitest)
- `@vitejs/plugin-react`: `^4.3.4` (React support for Vitest)
- `@playwright/test`: `^1.49.1` (End-to-end browser testing)

---

## 3. Configuration Files to Create

1. **`tsconfig.json`**:
   - `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`.
   - `paths: { "@/*": ["./src/*"] }` for clean imports.
   - Module resolution: `bundler`. Target: `ES2022`.
2. **`next.config.ts`**:
   - Strict security response headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy).
   - `poweredByHeader: false`.
   - React strict mode enabled.
3. **`tailwind.config.ts`**:
   - Curated HSL color palette (slate neutrals, emerald financial green, amber pending, rose destructive).
   - Font family tokens using system fallbacks and Inter.
4. **`postcss.config.mjs`**:
   - Tailwind CSS and Autoprefixer plugins.
5. **`eslint.config.mjs`**:
   - Next.js core web vitals and typescript parser integration.
6. **`vitest.config.ts` & `vitest.setup.ts`**:
   - JSDOM environment, alias resolution pointing `@/` to `./src/`, auto-cleanup, and jest-dom matchers.
7. **`playwright.config.ts`**:
   - Local web server runner (`npm run dev`), headless browser target, port 3000.
8. **`.github/workflows/ci.yml`**:
   - GitHub Actions CI workflow executing lint, typecheck, tests, and build on Node.js 22.

---

## 4. Source Files to Create (`src/`)

1. **`src/types/api.ts`**:
   - RFC 7807 `ApiErrorResponse` interface.
   - `ErrorCode` enum matching the backend's `ErrorCode.java`.
   - Standard query and pagination parameters (`PageResponse<T>`, `PaginationParams`).
2. **`src/types/financial.ts`**:
   - `MinorUnitAmount` brand/type (`amountMinor: number`).
   - ISO 4217 `CurrencyCode` (`USD`, `EUR`, `GBP`, etc.).
   - `Money` value object (`amountMinor: number`, `currency: string`).
   - Core financial status enums matching backend: `PaymentStatus` (`CREATED`, `AUTHORIZING`, `AUTHORIZED`, `CAPTURING`, `SETTLED`, `PENDING_RECONCILIATION`, `DECLINED`, `FAILED`), `AccountStatus` (`ACTIVE`, `FROZEN`, `SUSPENDED`, `CLOSED`).
3. **`src/config/env.ts`**:
   - Safe client-side environment variable parser using Zod.
   - Validates `NEXT_PUBLIC_API_URL` with fallback to `http://localhost:8080`.
   - Guarantees no backend secrets or private keys can be accessed or configured.
4. **`src/lib/formatting/money.ts`**:
   - Lossless financial formatting function `formatMinorUnits(amountMinor, currency)`.
   - Prevents floating-point rounding errors by using integer math and Intl.NumberFormat without decimal multiplication.
5. **`src/lib/api/client.ts`**:
   - Resilient fetch wrapper attaching `X-Correlation-ID` and parsing RFC 7807 error responses into a typed `ApiError`.
6. **`src/lib/telemetry/logger.ts`**:
   - Client-side structured logger with log levels and redaction for sensitive fields (tokens, credentials).
7. **`src/lib/utils.ts`**:
   - Standard `cn` helper combining `clsx` and `twMerge`.
8. **`src/providers/app-providers.tsx`**:
   - React Query `QueryClientProvider` configured with:
     - `staleTime: 30_000` (prevents unnecessary re-fetching).
     - `retry: false` for financial mutations to respect idempotency.
9. **`src/app/globals.css`**:
   - Modern Tailwind layers, custom scrollbars, focus rings, accessible transitions.
10. **`src/app/layout.tsx`**:
    - Next.js root layout with semantic HTML (`<html>`, `<body>`), meta tags, font configuration, and AppProviders wrapper.
11. **`src/app/page.tsx`**:
    - F0 Architecture & System Foundation Overview page.
    - Displays platform identity, frozen backend boundary rules, system architecture, and verification status.
    - Zero authentication screens, zero payment forms, zero dashboard data.

---

## 5. Test Suite Implementation (`tests/`)

1. **`tests/unit/money.test.ts`**:
   - Tests `formatMinorUnits` across various currencies (USD, EUR, GBP, JPY with 0 decimals).
   - Tests edge cases: 0 cents, negative values, large numbers.
2. **`tests/unit/env.test.ts`**:
   - Tests valid URL parsing and default fallback behavior.
3. **`tests/unit/api-error.test.ts`**:
   - Tests RFC 7807 error deserialization and helper functions.
4. **`tests/components/foundation-smoke.test.tsx`**:
   - Component test rendering `src/app/page.tsx` wrapped in `AppProviders`.
   - Verifies system architecture headings and accessibility attributes.
5. **`tests/accessibility/smoke-a11y.test.ts`**:
   - Validates structural semantic tags, aria attributes, and button contracts.

---

## 6. Scripts & Hygiene to Update

1. **`scripts/security/check-secrets.ps1`**:
   - Implement active scanning across repo files for private keys, AWS/Stripe keys, database URIs, JWTs, and forbidden `.env` files.
2. **`scripts/verification/verify-env.ps1`**:
   - Ensure `.env.example` exists, contains only public prefixes, and contains no real credentials.
3. **`scripts/verification/verify-repo.ps1`**:
   - Check file hygiene, `.gitignore` entries, absence of rogue `.env` files, and clean directory structure.

---

## 7. Documentation Updates

1. **`docs/api/API-CONTRACT.md`**:
   - Fully document the audited backend REST API standards, RFC 7807 problem details, error codes, and the complete 18 controller endpoints discovered from `payment-ledger-platform-complete-agent-kit`.
2. **`docs/architecture/frontend-architecture.md`**:
   - Expand with detailed component architecture, server/client boundaries, and data flow.
3. **`docs/financial/financial-ui-principles.md`**:
   - Comprehensive rules on minor unit integrity, idempotency header handling, and reconciliation states.
4. **`docs/security/threat-model.md`**:
   - Complete browser threat model (XSS, CSRF, Token storage, CSP headers, rate-limiting UX).
5. **`README.md`**:
   - Updated with project architecture, prerequisite Node/npm versions, run commands, and phase governance rules.

---

## 8. Verification Commands & Acceptance Gates

The F0 phase will be verified by running the following sequential commands:
1. `npm install` — clean dependency install with zero peer-dependency errors.
2. `npm run typecheck` — `tsc --noEmit` must exit with code 0.
3. `npm run lint` — `next lint` must pass with code 0.
4. `npm run test` — `vitest run` must execute all unit and component tests with 100% pass rate.
5. `npm run build` — `next build` must generate an optimized production bundle.
6. `powershell -ExecutionPolicy Bypass -File scripts/verification/verify-repo.ps1` — pass with code 0.
7. `powershell -ExecutionPolicy Bypass -File scripts/security/check-secrets.ps1` — pass with code 0.

---

## 9. Scope Leakage Prevention Checklist

- [x] No login form or authentication route logic.
- [x] No customer account or balance fetching UI.
- [x] No payment submission form or Stripe/gateway tokenization logic.
- [x] No transaction list or ledger ledger view.
- [x] No refund, reversal, or payout actions.
- [x] No admin dashboard, user management, or reconciliation actions.
- [x] All business capability directories in `src/app/` and `src/features/` remain empty or scaffolded boundaries.
