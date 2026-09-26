# Distributed Payment & Ledger Platform UI

Production-oriented Next.js frontend integrated with the frozen Distributed Payment & Ledger Platform Spring Boot backend.

---

## Technical Stack

- **Framework**: Next.js 15 (App Router, Standalone Output, React 19)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **Client-Side Server-State Cache**: TanStack Query v5 (read cache only; never authoritative for financial state)
- **Schema Validation**: Zod
- **Unit & Component Testing**: Vitest 2, Testing Library, jsdom
- **End-to-End Testing**: Playwright (with automated accessibility auditing)
- **Linting & Code Quality**: ESLint 9
- **Containerization**: Multi-stage hardened Docker image (`node:22-alpine` minimal runtime, non-root user `nextjs:nodejs`)

---

## Architectural Principles

1. **Backend is the Sole Financial Authority**: The browser is strictly a presentation and interaction layer. PostgreSQL is the authoritative financial truth. The frontend never computes account balances, settles payments, or makes authoritative financial decisions.
2. **Contract-First Integration**: All client communications conform strictly to the verified REST endpoints, standard headers (`X-Correlation-ID`, `Idempotency-Key`), and RFC 7807 problem details error format.
3. **Integer Minor Unit Representation**: Monetary values are stored and transferred as integer minor units (`amountMinor`). Floating-point money math is strictly prohibited.
4. **Phase-Gated Engineering**: Development proceeds through frozen phases (F0 through F9). No business capability from a future phase is introduced ahead of schedule.
5. **Zero Financial Mutation Retry**: Financial mutations strictly configure `retry: false` to prevent duplicate charges or accidental re-execution.

---

## Getting Started

### Prerequisites
- Node.js `v22.x` or later (tested on v22.13.1)
- npm `v10.x` / `v11.x`
- Docker (optional, for containerized local runtime)

### Deterministic Installation
```bash
npm ci
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Quality Gates & Verification

Run the comprehensive quality validation suite:
```bash
# Typecheck
npm run typecheck

# Linting
npm run lint

# Unit & Component Tests (Vitest)
npm run test

# End-to-End Accessibility & Invariant Tests (Playwright)
npx playwright test tests/e2e/accessibility.spec.ts

# Production Build
npm run build

# Consolidated Verification Gate
npm run verify

# Repository Hygiene & Secret Scan
powershell -ExecutionPolicy Bypass -File scripts/verification/verify-repo.ps1
powershell -ExecutionPolicy Bypass -File scripts/security/check-secrets.ps1
powershell -ExecutionPolicy Bypass -File scripts/verification/verify-env.ps1

# Standalone Runtime Smoke Test
powershell -ExecutionPolicy Bypass -File scripts/verification/smoke-standalone.ps1
```

---

## Containerization (Docker)

The repository provides a multi-stage, hardened Dockerfile utilizing Next.js standalone output and a non-root system user (`nextjs:nodejs`).

### Build Container Image
```bash
docker build -t distributed-payment-platform-ui:latest .
```

### Run Container Locally
```bash
docker run -d \
  --name payment-platform-ui \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8080 \
  distributed-payment-platform-ui:latest
```

### Container Smoke Verification
```bash
curl -f http://localhost:3000/
```

### Stop and Clean Up
```bash
docker stop payment-platform-ui
docker rm payment-platform-ui
```

---

## Environment Configuration

Configuration is managed via `.env.example`. Only variables prefixed with `NEXT_PUBLIC_` are bundled for browser consumption.

| Variable | Scope | Purpose | Default / Example |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Public / Browser | Base URL of Spring Boot REST backend | `http://localhost:8080` |

> **CRITICAL SECURITY INVARIANT**: Never place secret keys, database credentials, or private API tokens in `NEXT_PUBLIC_*` variables or `.env` files.

---

## Environment Boundaries

- **LOCAL**: Developer workstations running `npm run dev` or standalone runner.
- **CI**: Automated GitHub Actions workflow (`.github/workflows/ci.yml`) enforcing typecheck, lint, unit tests, Playwright E2E, production build, secret scanning, repository hygiene, and container smoke testing.
- **CONTAINER**: Hardened multi-stage container running `node server.js` as unprivileged non-root user `nextjs` (UID 1001) on port 3000.
- **FUTURE PRODUCTION (F9)**: Cloud hosting, managed ingress, TLS certificates, and production domain routing belong strictly to Phase F9.

---

## Phase Roadmap & Freeze Status

| Phase | Description | Boundary | Status |
|---|---|---|---|
| **F0** | Architecture, Methodology, Tooling & Core Foundation | No business features | **FROZEN** |
| **F1** | Authentication, Sessions & Protected Routes | Session management | **FROZEN** |
| **F2** | Customer Accounts & Dashboard | Account presentation | **FROZEN** |
| **F3** | Payments Initiation & Status Tracking | Idempotent payment creation | **FROZEN** |
| **F4** | Customer Transactions & Ledger View | Presentation only | **FROZEN** |
| **F5** | Refunds, Reversals & Payout Workflows | Controlled state machines | **FROZEN** |
| **F6** | Discrepancy & Reconciliation Views | Reconciliation operations | **FROZEN** |
| **F7-A..F7-H** | Admin Financial Operations & Explorer | Full administrative portal | **FROZEN** |
| **F8-A** | Frontend Security & Hardening | CSP, safe redirects, guards | **FROZEN** |
| **F8-B** | Error Resilience & UX Boundaries | RFC 7807, error boundaries | **FROZEN** |
| **F8-C** | Admin Reconciliation Operations | Sweep, match, resolve modals | **FROZEN** |
| **F8-D** | Admin Governance, Notifications, Refunds, Payouts | Directory & drilldown views | **FROZEN** |
| **F8-E** | Accessibility Hardening & Inclusive UX | WCAG 2.1 AA, keyboard, landmarks | **FROZEN** |
| **F8-F** | Frontend Performance Hardening & Efficiency | Formatter cache, tree-shaking | **FROZEN** |
| **F8-G** | CI/CD, Containerization & Final Frontend Freeze | Automated gates & Docker | **READY_FOR_FREEZE** |
| **F9** | Production Deployment & Cloud Verification | Infrastructure & release | **NOT_STARTED (PENDING)** |
