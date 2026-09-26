# Frontend Threat Model & Security Posture

**Platform**: Distributed Payment & Ledger Platform UI  
**Phase**: F0 — Architecture & Methodology Bootstrap  

---

## 1. Threat Vectors & Mitigations

### 1.1 Secret Leakage via Environment Variables
- **Threat**: Accidental commitment or exposure of backend API secrets, database passwords, or private keys through `NEXT_PUBLIC_*` client variables.
- **Mitigation**:
  - `src/config/env.ts` uses Zod to strictly validate allowable public variables (`NEXT_PUBLIC_API_URL`).
  - Automated PowerShell scanner `scripts/security/check-secrets.ps1` runs on CI to block unauthorized `.env` files and regex patterns matching private keys and credentials.

### 1.2 Cross-Site Scripting (XSS)
- **Threat**: Injection of malicious JavaScript into the DOM leading to token theft or transaction tampering.
- **Mitigation**:
  - React's default JSX auto-escaping prevents script injection.
  - Strict Content Security Policy (CSP) configured in `next.config.ts` barring unauthorized script execution (`default-src 'self'`).
  - Frame-ancestors 'none' and `X-Frame-Options: DENY` prevent clickjacking attacks.

### 1.3 Client-Side Authorization Bypass
- **Threat**: Malicious user manipulating client-side state or role tags (`ADMIN`, `MERCHANT`) to access unauthorized UI views or trigger privileged endpoints.
- **Mitigation**:
  - Invariant: Client-side role checks are UX conveniences only.
  - Every backend operation strictly validates JWT bearer claims and rejects unauthorized requests with RFC 7807 `403 FORBIDDEN` or `401 UNAUTHORIZED`.

### 1.4 Financial Double-Submission & Ambiguous Mutation
- **Threat**: Network interruption causing user to click "Pay" multiple times, resulting in duplicate charges or double ledger entries.
- **Mitigation**:
  - Client generates a distinct UUID `Idempotency-Key` for every mutation.
  - Backend enforces distributed idempotency locking in PostgreSQL/Redis.
  - UI disables mutation retries (`retry: false`) and disables buttons upon submission.

### 1.5 Telemetry & Log Sanitization
- **Threat**: Sensitive financial credentials, PANs, CVVs, or bearer tokens leaking into browser console or external log aggregators.
- **Mitigation**:
  - `src/lib/telemetry/logger.ts` implements automatic key recursion and redacts sensitive fields (`token`, `password`, `cvv`, `pan`, `secret`).
