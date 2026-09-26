# Frontend Production Methodology

## 1. Phase control
Every phase has:
- objective
- allowed scope
- prohibited scope
- deliverables
- verification
- evidence
- freeze decision

## 2. Contract-first
Backend OpenAPI/API documentation is the source for frontend endpoint behavior.

## 3. State classification
Every piece of state must be classified as:
- server state
- UI state
- form state
- session/auth state
- derived presentation state

## 4. Financial safety
Never treat optimistic browser state as financial confirmation.

## 5. Testing
Unit -> component -> integration/contract -> E2E.

## 6. Security
Threat-model changes involving authentication, authorization, financial operations, URLs, browser storage, dependencies, and external content.

## 7. Accessibility
Changed UI must be keyboard accessible and screen-reader understandable.

## 8. Performance
Baseline -> profile -> change -> benchmark -> regression.

## 9. Release
Clean checkout -> install -> lint -> typecheck -> tests -> security -> accessibility -> build -> environment validation -> artifact verification.

## 10. Evidence
Every production claim must point to reproducible repository evidence or measured results.
