# Architecture Decision Record: ADR-011
## Authentication, Session Management, and Authorization Architecture

**Date:** 2026-11-20  
**Status:** **ACCEPTED**  
**Module:** M3 — Authentication & User Dashboard  
**Author:** Principal Full-Stack & Application Security Engineer  

---

### 1. Context and Problem Statement
BreatheWise AI requires a production-grade, secure, and robust authentication system to protect sensitive household environmental profiles, health vulnerability flags (asthma, cardiovascular, pediatric, pregnancy), daily commute patterns, and personal impact logs.

In Module M2.1, a cryptographic token verification interface was established to reject unauthenticated client-forged headers (`x-authenticated-user-id`). For M3, we must implement full user registration, login, logout, session management, secure cookie handling, and an authenticated dashboard that integrates seamlessly with Next.js 16 (App Router), React 19, Prisma ORM, and SQLite.

---

### 2. Decision & Evaluation Matrix

#### 2.1 Password Hashing Engine
- **Options Considered:**
  1. `argon2` (native C++ bindings): Highly secure, but requires `node-gyp` and Python/MSVC C++ build tools on Windows. Prone to native compilation failures during local development and cross-platform CI deployments.
  2. `bcryptjs` (pure JS): Portable, but uses older algorithm and slower execution in pure JS.
  3. `crypto.scrypt` (Node.js Core):
     - **Selected:** Native Node.js built-in `crypto.scrypt` with a cryptographically secure 16-byte random salt (`crypto.randomBytes(16)`).
     - **Security Parameters:** OWASP-compliant memory-hard parameters: $N = 16384$, $r = 8$, $p = 1$, key length = 64 bytes.
     - **Comparison:** Uses `crypto.timingSafeEqual` for constant-time hash verification. Zero external npm dependencies, zero native compilation vulnerabilities, fully compliant with NIST SP 800-63B and OWASP Password Storage standards.

#### 2.2 Session Management Strategy
- **Options Considered:**
  1. *Stateless JWTs in LocalStorage:* Vulnerable to XSS token theft, impossible to instantly revoke upon logout without a blacklist, and subject to replay.
  2. *Signed-only Cookies:* Tamper-proof, but cannot be instantaneously invalidated server-side when a user logs out across devices without maintaining revocation state.
  3. *Server-Side Opaque Database Sessions (`Session` model in Prisma):*
     - **Selected:** Opaque 256-bit cryptographically secure random session tokens (`crypto.randomBytes(32).toString('hex')`) persisted in the SQLite database via Prisma `Session` table.
     - **Storage:** Stored in an `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` (production) cookie named `breathewise_session`.
     - **Revocation:** On logout, the session row is immediately deleted from the database and the cookie is cleared. This provides instantaneous, guaranteed session invalidation.
     - **API Compatibility:** The authentication guard also supports signed HMAC tokens and Bearer tokens for headless API clients and automated integration testing.

#### 2.3 CSRF Protection Strategy
- **Cookies:** `SameSite=Lax` ensures cookies are not attached to cross-site subresource requests (e.g., cross-origin images or script tags).
- **Origin / Referer Validation:** For state-changing operations (POST, PUT, DELETE), incoming requests verify that the `Origin` or `Referer` header matches the application's base URL (`NEXT_PUBLIC_APP_URL` or `Host`).
- **Custom Header Requirement:** API mutation endpoints require `Content-Type: application/json` or `X-Requested-With`, which cannot be sent across origins via simple HTML form submissions without triggering a CORS preflight check.

#### 2.4 Account Enumeration & Timing Attack Defense
- On login failure, the system returns a generic error: `"Invalid email or password"` (HTTP 401).
- If the email does not exist in the database, the system executes a dummy `crypto.scrypt` verification against a fixed mock hash. This ensures response times are statistically indistinguishable, defeating timing-based user enumeration.
- Login attempts are bounded by an in-memory sliding-window rate limiter (5 failed attempts per 5 minutes per IP/account).

#### 2.5 Data Isolation & IDOR Defense
- Every protected API handler and server action resolves the current user ID exclusively from the verified server-side session.
- Client-supplied IDs in request bodies or query parameters are never trusted for ownership.
- Database queries enforce ownership constraints (`WHERE userId = session.userId`).

---

### 3. Database Schema Changes
Add two models to `prisma/schema.prisma`:
1. `Session`: Stores `id`, `sessionToken` (unique), `userId`, `expiresAt`, `createdAt`, `userAgent`, `ipAddress`.
2. `PasswordResetToken`: Stores single-use, time-limited reset tokens hashed with SHA-256.

---

### 4. Consequences
- **Positive:**
  - True zero-trust architecture: sessions are revocable, opaque, and server-managed.
  - Zero external C++ native build dependencies on Windows.
  - Full adherence to OWASP ASVS v4.0 and NIST SP 800-53 standards.
  - Clean separation between browser cookie sessions and API Bearer tokens.
- **Trade-offs:**
  - Database lookup on authenticated requests (mitigated by indexed `sessionToken` and SQLite in-process read latency <1ms).
