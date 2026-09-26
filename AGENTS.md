# Distributed Payment Platform UI — Agent Contract

## Mission
Build a production-grade Next.js frontend integrated with the already-frozen Distributed Payment & Ledger Platform backend.

## System authority
The Spring Boot backend is authoritative for:
- identity and authorization
- account state
- balances
- payments
- ledger
- refunds
- payouts
- reconciliation
- notifications
- administrative financial actions

The browser is never a financial source of truth.

## Engineering principles
1. Contract-first API integration.
2. Phase-gated development.
3. Server state is distinct from UI state.
4. Financial state is server-confirmed.
5. Security is defense-in-depth.
6. Accessibility is a release requirement.
7. Performance is measured, not guessed.
8. Tests follow a layered pyramid.
9. Documentation is part of implementation.
10. No fabricated claims.

## Money
Represent monetary API values using integer minor units and explicit currency. The frontend may format values for display but must not become the authority for financial calculations.

## Mutation safety
Do not silently retry financial mutations. Respect backend idempotency semantics. If a request result is ambiguous, re-fetch authoritative server state or show the server-defined pending/reconciliation state.

## Authentication
Use the backend's existing authentication/session model. Never introduce a parallel identity system.

## Authorization
Client-side role checks are UX controls only. Every protected operation must remain protected by the backend.

## Secrets
Never expose backend secrets through `NEXT_PUBLIC_*`. Never commit `.env.local`, credentials, tokens, certificates, or provider secrets.

## Scope
Current phase must be read from `docs/phases/`. Later-phase work must be documented as a boundary, not implemented.

## Required completion loop
PLAN -> INSPECT -> DESIGN -> IMPLEMENT -> TEST -> SECURITY REVIEW -> ACCESSIBILITY REVIEW -> PERFORMANCE REVIEW -> DOCUMENT -> FREEZE
