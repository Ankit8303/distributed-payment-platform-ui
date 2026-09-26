# Frontend Architecture Specification

**Platform**: Distributed Payment & Ledger Platform UI  
**Phase**: F0 — Architecture & Methodology Bootstrap  

---

## 1. System Context & Boundaries

```text
[ Browser / Client ]
       |
       | HTTPS (JSON / REST, Bearer JWT, X-Correlation-ID, Idempotency-Key)
       v
[ Next.js 15 App Router Frontend ]
       |
       | Server-Side / Client-Side Fetch
       v
[ Frozen Spring Boot Core Backend ]  <--- AUTHORITATIVE FOR ALL FINANCIAL STATE
       |
       +---> [ PostgreSQL ] (Double-entry ledger & idempotency store)
       +---> [ Redis ] (Locks & rate-limiting)
       +---> [ Kafka ] (Event streaming)
       +---> [ Stripe / Provider ] (External payment gateway)
```

### Architectural Principles
1. **Zero Financial Authority in Frontend**: The browser is strictly a presentation and interaction layer. It never computes account balances, settles payments, or declares transactions successful without authoritative confirmation from the Spring Boot backend.
2. **Contract-First Data Access**: All network interaction follows the backend's explicit REST endpoints, RFC 7807 problem details error format, and header standards (`X-Correlation-ID`, `Idempotency-Key`).
3. **Lossless Financial Representation**: Monetary values are stored and transferred as integer minor units (e.g. cents). Floating-point conversions are strictly isolated to localized display formatting.
4. **Server vs. Client State Separation**: TanStack Query serves strictly as a **client-side server-state cache** for query caching, deduplication, and lifecycle management with zero automatic retries for financial mutations. The backend is the sole authority for financial state, and PostgreSQL is the financial source of truth. The browser, React state, TanStack Query cache, local storage, session storage, and frontend calculations are NEVER authoritative for balances, payments, ledger entries, refunds, reversals, payouts, reconciliation, or financial status. UI state (modal open/closed, form field focus) remains strictly local.

---

## 2. Directory Structure & Modular Boundaries

The project enforces clean modular separation within `src/`:

```text
src/
├── app/                  # Next.js App Router (pages, layouts, routing)
│   ├── (admin)/          # Admin route grouping (Phase F7)
│   ├── (auth)/           # Authentication route grouping (Phase F1)
│   ├── (customer)/       # Customer dashboard & operations (Phases F2-F6)
│   ├── globals.css       # Core design tokens and Tailwind base
│   ├── layout.tsx        # Root HTML layout and global providers
│   └── page.tsx          # Phase F0 foundation status landing page
├── components/           # Reusable presentational components
│   ├── dialogs/          # Modal dialogs and confirmation windows
│   ├── feedback/         # Badges, banners, alerts
│   ├── financial/        # Minor-unit currency displays, status badges
│   ├── forms/            # Accessible inputs, validation indicators
│   ├── layout/           # Header, footer, shell, navigation sidebar
│   ├── tables/           # Sortable, paginated data tables
│   └── ui/               # Primitives (button, card, input)
├── config/               # Application configuration and Zod env validator
├── features/             # Feature slices (encapsulating domain logic)
│   ├── accounts/         # Account state, balance queries (Phase F2)
│   ├── admin/            # Administrative controls, audit logs (Phase F7)
│   ├── auth/             # Login, register, token refresh (Phase F1)
│   ├── ledger/           # Immutable ledger explorer (Phase F4)
│   ├── notifications/    # Webhook & system notifications (Phase F7)
│   ├── payments/         # Payment initiation & polling (Phase F3)
│   ├── payouts/          # Payout initiation & tracking (Phase F5)
│   ├── reconciliation/   # Discrepancy management (Phase F6)
│   └── refunds/          # Refund & reversal workflows (Phase F5)
├── hooks/                # Reusable React hooks
├── lib/                  # Utilities and technical infrastructure
│   ├── api/              # HTTP client, correlation injection, error handling
│   ├── formatting/       # Lossless minor unit money formatter
│   ├── security/         # Security sanitizers and storage adapters
│   ├── telemetry/        # Structured safe client logging
│   └── utils.ts          # Class merging helper (clsx + tailwind-merge)
├── providers/            # React context providers (TanStack Query)
└── types/                # Global TypeScript contracts
    ├── api.ts            # RFC 7807 problem details, error codes, pagination
    └── financial.ts      # Minor unit money, currency codes, status enums
```

---

## 3. Technology Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript 5.7+ (Strict Mode enabled)
- **Styling**: Tailwind CSS 3.4 with accessible design tokens
- **Client-Side Server-State Cache**: TanStack Query v5 (deduplication & cache; never authoritative)
- **Schema Validation**: Zod 3.24
- **Testing**:
  - Unit & Component: Vitest 2.1, React Testing Library, jsdom
  - End-to-End: Playwright
- **Static Analysis**: ESLint 9 (Flat config with `next/core-web-vitals` and TypeScript rules)
