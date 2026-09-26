# Authentication Model Specification

**Platform**: Distributed Payment & Ledger Platform UI  
**Phase**: F1 — Authentication & Session Management  
**Backend Authority**: Frozen Spring Boot REST Core (`com.paymentledger.auth.*`)  

---

## 1. Backend Authentication Architecture

The Spring Boot backend enforces a stateless, token-based security architecture (`SessionCreationPolicy.STATELESS`):

```text
[ Client (Browser) ]
       │
       ├── POST /api/v1/auth/login { email, password } ───────────────► [ Spring Boot AuthController ]
       │◄── 200 OK { accessToken, refreshToken, expiresInSeconds: 900 } ────┤ (Checks BCrypt cost 12, ACTIVE status)
       │
       ├── In-Memory: accessToken (JWT, 15 min TTL)
       ├── sessionStorage: refreshToken (UUID, 7 day TTL)
       │
       ├── Request with Header: Authorization: Bearer <accessToken> ──► [ JwtAuthenticationFilter ]
       │◄── 401 UNAUTHORIZED (when token expires) ───────────────────────┤ (Validates HMAC-SHA256 signature)
       │
       └── POST /api/v1/auth/refresh { refreshToken } ─────────────────► [ AuthService.refreshToken ]
        ◄── 200 OK { accessToken, refreshToken (rotated) } ──────────────┤ (Atomic single-use token rotation)
```

---

## 2. Token Specifications & Expiration

| Token | Format | Expiration | Storage Location | Invariant |
| :--- | :--- | :--- | :--- | :--- |
| **Access Token** | HMAC-SHA256 JWT | 900s (15 min) | Strictly In-Memory (React state / module closure) | Never written to localStorage, sessionStorage, or unencrypted storage. |
| **Refresh Token** | Cryptographic UUID | 604,800s (7 days) | `sessionStorage` (scoped to browser tab) | Database-hashed via SHA-256 in backend. Rotated atomically on every use. |

### JWT Claims
The access token payload issued by `JwtService.java` contains:
- `sub`: User ID (UUID string)
- `role`: Role string (`CUSTOMER`, `MERCHANT`, `ADMIN`, `SYSTEM`)
- `iat`: Epoch issuance timestamp
- `exp`: Epoch expiration timestamp

---

## 3. Strict Refresh Rotation & Race Condition Protection

The backend uses database-backed atomic token consumption (`revokeByTokenHashIfNotRevoked`).
- **Single-Use Invariant**: When a refresh token is presented, it is immediately revoked in the database and a new token pair is issued.
- **Concurrency Danger**: If parallel client requests receive HTTP 401 and both attempt to refresh simultaneously, the second call fails with:
  ```json
  {
    "status": 401,
    "errorCode": "INVALID_REFRESH_TOKEN",
    "detail": "Refresh token has already been consumed"
  }
  ```
- **Frontend Mitigation**: `tokenStorage` implements a single-flight mutex (`activeRefreshPromise`). All concurrent 401 queries await the same pending refresh promise, ensuring exactly one refresh request is dispatched to the backend.

---

## 4. Contract Gaps & Recorded Discrepancies

1. **No Logout Endpoint**: The backend provides no `POST /api/v1/auth/logout`. Logout is handled exclusively on the client by destroying the in-memory access token, removing the refresh token from `sessionStorage`, and resetting the authentication context.
2. **No Cookie Support**: The backend does not set `Set-Cookie`. Refresh tokens are returned in the JSON response body.
3. **Password Minimum**: The backend strictly enforces a 12-character minimum password (`@Size(min = 12)` in `RegisterRequest.java`).

---

## 5. Route Protection & Authorization Realities

Client-side route guards (`ProtectedRoute`) verify authentication state to provide responsive navigation and avoid rendering empty data states. However:
- Client state is **never** proof of authorization.
- Every protected API call transmits `Authorization: Bearer <accessToken>` and is verified by Spring Security.
- If a token is revoked or the user is disabled, the backend returns RFC 7807 `401 UNAUTHORIZED` or `403 FORBIDDEN`.
