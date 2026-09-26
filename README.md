# Distributed Payment & Ledger Platform UI

Production-oriented Next.js frontend integrated with the frozen Distributed Payment & Ledger Platform Spring Boot backend.

---

## Technical Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Client-Side Server-State Cache**: TanStack Query v5 (client-side cache; never authoritative)
- **Schema Validation**: Zod
- **Unit & Component Testing**: Vitest 2, Testing Library, jsdom
- **End-to-End Testing**: Playwright
- **Linting & Code Quality**: ESLint 9

---

## Architectural Principles

1. **Backend is the Financial Authority**: The browser is strictly a presentation and interaction layer. It never computes account balances, settles payments, or makes authoritative financial decisions.
2. **Contract-First Integration**: All client communications conform strictly to the verified REST endpoints, standard headers (`X-Correlation-ID`, `Idempotency-Key`), and RFC 7807 problem details error format.
3. **Integer Minor Unit Representation**: Monetary values are stored and transferred as integer minor units (`amountMinor`). Floating-point money math is strictly prohibited.
4. **Phase-Gated Engineering**: Development proceeds through frozen phases (F0 through F9). No business capability from a future phase is introduced ahead of schedule.

---

## Getting Started

### Prerequisites
- Node.js `v22.x` or later
- npm `v11.x` or later

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Verification & Quality Gates

Run the standard quality validation suite:
```bash
# Typecheck
npm run typecheck

# Linting
npm run lint

# Unit & Component Tests
npm run test

# Production Build
npm run build

# Repository Hygiene & Secret Scan
powershell -ExecutionPolicy Bypass -File scripts/verification/verify-repo.ps1
powershell -ExecutionPolicy Bypass -File scripts/security/check-secrets.ps1
```

---

## Phase Roadmap

| Phase | Description | Boundary | Status |
|---|---|---|---|
| **F0** | Architecture, Methodology, Tooling & Core Foundation | No business features | **READY_FOR_FREEZE** |
| **F1** | Authentication, Sessions & Protected Routes | No payment UI | NOT_STARTED |
| **F2** | Customer Accounts & Dashboard | No admin actions | NOT_STARTED |
| **F3** | Payments Initiation & Status Tracking | No refunds/payouts | NOT_STARTED |
| **F4** | Immutable Ledger & Journal Explorer | Presentation only | NOT_STARTED |
| **F5** | Refunds, Reversals & Payout Workflows | Controlled workflows | NOT_STARTED |
| **F6** | Discrepancy & Reconciliation Views | Operational visibility | NOT_STARTED |
| **F7** | Admin Financial Operations | Backend authority | NOT_STARTED |
| **F8** | Hardening, Performance & Accessibility | No new features | NOT_STARTED |
| **F9** | Production Deployment & Verification | Release readiness | NOT_STARTED |
