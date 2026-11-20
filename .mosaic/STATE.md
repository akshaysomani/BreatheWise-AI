# MOSAIC PROJECT STATE: BreatheWise AI
**Project:** BreatheWise AI  
**Competition:** Prompt War — Challenge 6: Urban Air Quality Assistant  
**Target Score:** 97.50+ / 100  
**Current Phase:** M3 — Authentication & User Dashboard  
**Document Version:** 1.3.0  
**Last Updated:** 2026-11-20  

---

## 1. Project Identity
- **Name:** BreatheWise AI
- **Tagline:** Breathe Better. Live Healthier.
- **Core Mission:** Empower urban families and vulnerable individuals to navigate severe winter smog and chronic urban air pollution through hyper-localized, verified air quality intelligence, explainable daily routine optimization, scientific indoor air purification guidance, and transparent, formula-backed impact tracking.
- **Repository / Directory:** `C:\Users\Akshay\OneDrive\Desktop\Challenge 6`
- **Architectural Scope:** Production-grade full-stack web application designed for zero-hallucination environmental recommendations, strict data provenance, accessible high-contrast UI, and defensive security.

---

## 2. Competition Requirements & Internal Scoring Target
- **Target Score:** 97.50+ / 100 based on internal engineering evaluation matrix.
- **Six Functional Mandates:**
  1. Low-emission daily routines (commute optimization, errand chaining, active transit timing).
  2. Practical indoor air quality improvements (HEPA filtration CADR, ventilation timing, cooking source controls, debunking plant myths).
  3. Sustainable everyday alternatives (low-emission heating/cooking/transit with transparent trade-offs).
  4. Location-aware pollution safety recommendations (real-time PM2.5/PM10, vulnerable group protective actions, outdoor activity windows).
  5. Personalized household actions (tailored to family composition, asthma/respiratory risks, pets, housing type).
  6. Clear, understandable explanations of the direct impact of individual choices (formula-backed CO2 and PM2.5 avoidance, explicit uncertainty bounds).

---

## 3. Current Module Status
- **Current Module:** `M3 — Authentication & User Dashboard`
- **Status:** **COMPLETED & INDEPENDENTLY VERIFIED (98/98 Tests Passing)**
- **Completion Evidence:**
  - **Database Models & Schema Migrations:** Added `Session` (opaque 256-bit token hex string, rolling 7-day expiration, user agent, IP tracking) and `PasswordResetToken` (SHA-256 hashed single-use tokens, 1-hour expiration) models to `prisma/schema.prisma`. Successfully migrated via `20261120103047_add_sessions_and_reset_tokens`. Database now comprises **10 normalized models**.
  - **Cryptographic Password Security:** Implemented Node.js native `crypto.scrypt` password hashing ($N=16384, r=8, p=1, \text{keyLen}=64$) with 16-byte cryptographically secure random salt and constant-time `crypto.timingSafeEqual` verification (`src/lib/password.ts`).
  - **Account Enumeration Defense:** Implemented `dummyPasswordVerification()` workload in `src/lib/password.ts` to ensure unauthenticated login attempts against non-existent emails incur identical scrypt computation latency as existing accounts.
  - **Opaque Database Sessions & Secure Cookies:** Server-issued `breathewise_session` cookie configured with `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` (production environment) attributes (`src/lib/session.ts`).
  - **CSRF Defense:** Implemented strict Origin/Referer validation against Host for state-changing browser cookie requests (`src/lib/csrf.ts`).
  - **Open Redirect Defense:** Implemented strict `sanitizeReturnUrl` validator rejecting external schemes, protocol-relative slashes (`//`), backslashes (`\`), and CRLF injection (`src/lib/sanitize-redirect.ts`).
  - **Dual Authentication Guard:** Updated `getSessionUser(req)` in `src/lib/auth-guard.ts` to support both cookie-based web sessions and cryptographically signed HMAC Bearer tokens (`v1.<payload>.<sig>`) for headless API integration.
  - **Edge Route Protection:** Implemented Next.js route middleware (`src/middleware.ts`) protecting `/dashboard/:path*`, enforcing login redirects with sanitized return URLs, and redirecting authenticated users away from `/login` and `/register`.
  - **Complete Route Handlers:** Implemented `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`, and `POST /api/auth/reset-password` with rate-limiting, audit logging, and honest unconfigured email provider disclosures.
  - **Accessible Frontend UI:** Built responsive, accessible, light-theme `src/app/login/page.tsx`, `src/app/register/page.tsx`, and full 5-tab user dashboard `src/app/dashboard/page.tsx` (Overview, Household Profile & CADR, Commute Routines, Impact Records, Account & Privacy). Updated global `Header.tsx` with dynamic session indicator and sign-out controls.
  - **Automated Verification:** **98/98 tests passing** across 9 test suites (`npm test -- --run`).
  - **Static Analysis & Build:** `npx tsc --noEmit` passing (0 errors), `npx prisma validate` passing, Webpack production build `npm run build` succeeding with 19 static and dynamic routes prerendered.
  - **Dependency Audit:** `npm audit` reports **0 vulnerabilities**.

---

## 4. Completed Modules
- [x] **M0: Discovery & Architecture** (Approved & Verified)
- [x] **M1: Design System & Frontend Foundation** (Completed & Verified)
- [x] **M2: Backend & Database** (Completed & Verified)
- [x] **M2.1: Security Remediation & Independent Verification** (Completed & Verified — 64/64 tests)
- [x] **M3: Authentication & User Dashboard** (Completed & Verified — 98/98 tests)

---

## 5. Pending Modules
- `M4:` Air Quality Intelligence (Multi-provider AQI client, OpenAQ v3 integration, Open-Meteo physical forecast engine, caching layer, stale data indicators).
- `M5:` AI Assistant and Recommendations (Multi-provider LLM orchestration, structured output Zod schemas, ground-truth context injection, explainability engine).
- `M6:` Impact Tracker and Community (Mathematical emission savings calculators, verified vs community observations separation, privacy-preserving moderation).
- `M7:` Adversarial Audit (Security penetration testing, prompt injection fuzzing, rate-limit stress tests, OWASP verification).
- `M8:` Remediation (Addressing audit findings, bug fixes, hardening, performance optimizations).
- `M9:` Final Verification (End-to-end journey tests, Lighthouse accessibility/performance verification, grading against 97.50+ target rubric).

---

## 6. Architecture & Design Decisions
1. **Monolithic Full-Stack Architecture (ADR-001):** Next.js 16.4.6 App Router, React 19, TypeScript.
2. **Database Engine & ORM (ADR-002):** SQLite for deterministic local verification + Prisma ORM 6.4.1 singleton. 10 normalized models.
3. **Repository Pattern (ADR-003):** Strict encapsulation of Prisma queries in `src/repositories/` with ownership verification before update/delete.
4. **Boundary Validation (ADR-004):** Centralized Zod schemas in `src/lib/validations/` with strict coordinate bounding (-90..90, -180..180) and XSS injection rejection.
5. **Privacy by Design (ADR-005):** Geolocation coordinates quantized to 2 decimal places (~1.1 km latitude, ~0.97 km longitude at 28.6°N).
6. **Community Data Demarcation (ADR-006):** Invariant flag `isOfficialData: false` enforced on all citizen-submitted observations.
7. **Cryptographic Session Boundary (ADR-007):** Constant-time HMAC-SHA256 session token adapter. Zero trust for client-supplied user ID headers.
8. **Design Tokens & Brand Theme (ADR-008):** Exclusively light theme (`#397A55` Forest Green, `#F7F8F3` Alabaster).
9. **Typography Pairing (ADR-009):** Manrope (Headings) + DM Sans (Body and figures).
10. **Strict Fixture Demarcation (ADR-010):** Unactivated data cards carry explicit `SAMPLE FIXTURE — NOT LIVE DATA` labels until M4/M5.
11. **Authentication & Session Architecture (ADR-011):** scrypt KDF with 16-byte salt, constant-time verification, timing-safe dummy evaluation, database-backed opaque sessions in `HttpOnly` cookies, Origin/Referer CSRF guard, and sanitizeReturnUrl open redirect mitigation.

---

## 7. Technology Stack
- **Framework:** Next.js 16.4.6 (App Router) / React 19.0.0
- **Language:** TypeScript 5.x / ES2022
- **Database & ORM:** SQLite + Prisma ORM 6.4.1 (10 models: User, Session, PasswordResetToken, HouseholdProfile, HouseholdMember, AirQualitySnapshot, SavedRoutine, ImpactLog, CommunityReport, RecommendationRecord)
- **Validation:** Zod v3.24
- **Security:** scrypt KDF, opaque DB session tokens, HMAC-SHA256 token adapter, timing-safe equality, PII/health logger redaction, CSRF guard
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Iconography:** Lucide React
- **Testing:** Vitest 5.1.1 + Testing Library (`@testing-library/react`, `@testing-library/jest-dom`)

---

## 8. Skills Read & Verification Status
- `design-system` (`C:\Users\Akshay\.agents\skills\design-system\SKILL.md`): **VERIFIED & READ**
- `brand` (`C:\Users\Akshay\.agents\skills\brand\SKILL.md`): **VERIFIED & READ**
- `design` (`C:\Users\Akshay\.agents\skills\design\SKILL.md`): **VERIFIED & READ**
- `ui-styling` (`C:\Users\Akshay\.agents\skills\ui-styling\SKILL.md`): **VERIFIED & READ**
- `ui-ux-pro-max` (`C:\Users\Akshay\.agents\skills\ui-ux-pro-max\SKILL.md`): **VERIFIED & READ**
- `impeccable` (`C:\Users\Akshay\.gemini\antigravity-ide\scratch\.agents\skills\impeccable\SKILL.md`): **VERIFIED & READ**
- `banner-design` (`C:\Users\Akshay\.agents\skills\banner-design\SKILL.md`): **VERIFIED & READ**

---

## 9. Security & Privacy Audit Findings (M3)
- **Authentication Trust:** Enforced through database session validation and HMAC signature checks; zero client-controlled trust boundaries.
- **Timing Attack Mitigation:** `dummyPasswordVerification()` verified to produce equivalent computational work for nonexistent user logins.
- **CSRF Defense:** Tested Origin/Referer cross-site request forgery defense on cookie-based state-modifying endpoints.
- **Open Redirect Protection:** Strict sanitization prevents protocol-relative (`//evil.com`) and backslash (`/\evil.com`) redirects.
- **Cross-User Isolation (IDOR):** Verified on household profiles, routines, impact logs, and recommendations.
- **Rate Limiting:** Enforced at 5 attempts per 5 minutes for login endpoints; 3 requests per 15 minutes for password resets.
- **Log Sanitization:** Sensitive medical conditions, passwords, reset tokens, and session secrets automatically redacted.
- **Dependency Audit:** `npm audit` reports **0 vulnerabilities**.
- **Git Credential Scan:** 0 exposed secrets in tracked files.

---

## 10. Automated Test Results
- **Vitest Suites:** 9 test files, 98 passed, 0 failed (Duration: ~4.9s).
- **TypeScript Compilation:** Passed with 0 errors (`npx tsc --noEmit`).
- **Prisma Schema Validation:** Validated with 0 errors (`npx prisma validate`).
- **Production Build:** Succeeded (`npm run build`).

---

## 11. Known Limitations & Module Boundaries
- External SMTP / email sending service (e.g., SendGrid, AWS SES) is unconfigured in development; password reset tokens are logged to server console in local development and disclosed honestly to the client.
- The in-memory rate limiter operates per-process; production clustering across multiple container nodes requires Redis integration (as specified in M2.1).
- Live third-party AQI provider integrations (OpenAQ v3, Copernicus CAMS, Open-Meteo) are scheduled for **Module M4**.
- Generative AI recommendation reasoning (Gemini API) is scheduled for **Module M5**.

---

## 12. Exact Next Authorized Module
- **`M4 — Air Quality Intelligence`**
- Do NOT begin M4 until authorized by user / MOSAIC prompt.
