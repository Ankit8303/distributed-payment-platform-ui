# Account Architecture & Data Model Specification

**Platform**: Distributed Payment & Ledger Platform UI  
**Phase**: F2 — Accounts & Customer Dashboard  
**Backend Authority**: Frozen Spring Boot REST Core (`com.paymentledger.account.*`)  
**Database Authority**: PostgreSQL (sole source of truth for accounts and ledger balances)  

---

## 1. System Authority & Financial Boundaries

1. **Authoritative Financial State**:
   - The Spring Boot backend and PostgreSQL are the authoritative source of truth for all identity, accounts, statuses, and ledger entries.
   - The frontend is **never** a financial source of truth.
   - TanStack Query is used exclusively as a **client-side server-state cache**.
2. **Strict Balance Boundary in Phase F2**:
   - The backend `AccountResponse` does **NOT** contain a balance field.
   - The customer endpoint `GET /api/v1/accounts/{id}/balance` does **NOT** exist in the backend.
   - Consequently, the frontend displays strictly metadata and operational status (`accountNumber`, `currency`, `accountType`, `status`, `createdAt`, `accountId`).
   - The frontend **never** fabricates, calculates, estimates, or infers balance figures.

---

## 2. API Contract Specification

### Customer Account Endpoint
- **HTTP Method**: `GET`
- **Path**: `/api/v1/accounts/{id}`
- **Path Variable**: `id` (RFC 4122 UUID string)
- **Headers**:
  - `Authorization: Bearer <accessToken>` (mandatory; injected in-memory by `apiFetch`)
  - `X-Correlation-ID: <uuid>` (propagated or generated)
- **Response Model (`200 OK`)**:
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

### Non-Existent Endpoints (Backend Reality)
The following endpoints do **not** exist in the backend and are not called:
- `GET /api/v1/accounts` (no customer listing endpoint)
- `GET /api/v1/accounts/me` (no current account endpoint)
- `GET /api/v1/accounts/{id}/balance` (no customer balance endpoint)
- `POST /api/v1/accounts` (no public account creation endpoint)

---

## 3. Account-ID Navigation & Discovery Architecture

Because the backend does not expose an endpoint to list a customer's accounts, nor is the account ID embedded in the JWT:
1. **Direct Deep-Link Route (`/accounts/[id]`)**:
   - The dedicated account detail route reads `params.id` from the URL, validates the format against standard UUID regex, and queries `GET /api/v1/accounts/{id}` via TanStack Query.
2. **Dashboard Query State (`/dashboard?accountId=...`)**:
   - When an `accountId` query parameter is provided, `/dashboard` displays the active account card summary.
3. **Account Lookup Component**:
   - `/dashboard` provides an accessible, validated UUID lookup form (`AccountLookupForm`), allowing users to inspect any authorized account.
4. **Empty State**:
   - If no account ID is provided in query params or route context, an accessible `AccountEmptyState` guides the user to supply their account UUID.

---

## 4. IDOR Defense-in-Depth & Anti-Enumeration

1. **Backend Ownership Enforcement**:
   - `AccountService.getAccount(accountId, ownerId, userRole)` executes:
     ```java
     account = accountRepository.findByIdAndOwnerId(accountId, ownerId)
             .orElseThrow(() -> new AccountNotFoundException("Account not found or access denied"));
     ```
2. **404 Not Found Masking**:
   - When User A attempts to view User B's account, the backend throws `AccountNotFoundException` which maps to HTTP `404 Not Found` (`RESOURCE_NOT_FOUND`).
   - The backend intentionally does not return `403 Forbidden`, preventing resource existence enumeration.
3. **Frontend Presentation**:
   - The frontend renders a safe, non-revealing error message:
     > "Account Not Found. The requested account could not be found or you do not have permission to view it."
   - The correlation ID is displayed for user support reference.

---

## 5. Account Status Semantics

The backend `AccountStatus` enum comprises:
- **`ACTIVE`**: Account is operational.
- **`FROZEN`**: Account is administratively or operationally frozen. Rendered with an accessible warning indicator.
- **`CLOSED`**: Account has been decommissioned.
- **`PENDING_VERIFICATION`**: Account is awaiting completion of verification requirements.

---

## 6. Server-State Caching Strategy

- **TanStack Query Key**: `['accounts', 'detail', accountId]`
- **Stale Time**: 30 seconds (`staleTime: 30_000`) to avoid duplicate queries during tab switches.
- **Garbage Collection**: 5 minutes (`gcTime: 300_000`).
- **No Retries on Fatal Errors**: Retries are explicitly disabled on `401`, `403`, and `404` errors.
