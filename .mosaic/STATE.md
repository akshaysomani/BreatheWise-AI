# MOSAIC PROJECT STATE: BreatheWise AI
**Project:** BreatheWise AI  
**Competition:** Prompt War — Challenge 6: Urban Air Quality Assistant  
**Target Score:** 97.50+ / 100  
**Current Phase:** M3.1.1 — Final Authentication Verification & Remediation  
**Document Version:** 1.3.2  
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
- **Current Module:** `M3.1.1 — Final Authentication Verification & Remediation`
- **Status:** **COMPLETED & INDEPENDENTLY VERIFIED (136/136 Vitest Tests Passing, 15/15 Playwright Browser Tests Passing)**
- **Completion Evidence:**
  - **Canonical Session Boundary Unification (Step A):** Stateless unrevocable bearer tokens (`v1.<payload>.<sig>`) have been retired for authorization. Both browser cookie (`breathewise_session`) and API Bearer credentials (`Authorization: Bearer <token>`) are canonically unified on the database-backed opaque 256-bit `Session` table (`src/lib/auth-guard.ts`).
  - **Immediate Logout Revocation:** Calling `POST /api/auth/logout` via either cookie or Bearer header immediately revokes credentials server-side by deleting the database session row. Presenting the same bearer token again fails closed with HTTP 401.
  - **Real-Time Role Enforcement:** Live database queries on every authenticated request ensure user role changes (e.g., elevation to ADMIN or account suspension) take effect immediately without token expiration lag.
  - **Zero Password Reset Token Exposure (Step B):** Completely eliminated any logging or API return of raw reset tokens. The server stores only cryptographic SHA-256 hashes (`tokenHash`), logs only domain-level sanitized metadata, and returns a 100% generic response (`src/app/api/auth/reset-password/route.ts`).
  - **Atomic Token Invalidation & Race Defense:** Single-use token consumption enforced via atomic `prisma.passwordResetToken.updateMany({ where: { id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } })`. Concurrent duplicate attempts fail closed with HTTP 400.
  - **Session Invalidation on Password Reset:** All active database sessions for a user are deleted atomically upon password reset (`prisma.session.deleteMany`).
  - **Controlled Trusted Origin CSRF Defense (Step C):** Evaluated and verified across 11 explicit adversarial test cases. Server-controlled origin resolution (`TRUSTED_ORIGINS`) ignores spoofed `Host` and `X-Forwarded-Host` headers, rejects malformed origins, and fails closed when origin headers are missing on cookie-authenticated mutations.
  - **Real Playwright Browser Automation (Step D):** 15 tests executed across 3 device viewports (Desktop Chrome 1440x900, Mobile Small 360x640, Mobile Standard 390x844). **15 of 15 tests passed** with genuine Chromium headless browser binaries covering all 16 user journey flows.
  - **npm audit Forensic Investigation (Step E):** Forensic investigation confirmed that the previous exit code 1 was caused exclusively by offline sandbox network proxy blocking POST requests to `registry.npmjs.org` with HTTP 403 Forbidden. Outside network isolation, `npm audit` exited with **code 0** and found **0 vulnerabilities**.
  - **Rate Limiting Architecture & Clustering (Step F):** Documented process-local in-memory sliding window alongside architectural drop-in guidelines for Redis-backed distributed rate-limiting in clustered multi-node production deployments.
  - **Automated Verification (Step G):** **136/136 tests passing** across 10 Vitest suites (`npm test -- --run`).
  - **Static Analysis & Build:** `npx tsc --noEmit` passing (0 errors), `npx prisma validate` passing, 2 database migrations up to date, Webpack production build `npm run build` succeeding in 9.5s with 19 static and dynamic routes prerendered.

---

## 4. Completed Modules
- [x] **M0: Discovery & Architecture** (Approved & Verified)
- [x] **M1: Design System & Frontend Foundation** (Completed & Verified)
- [x] **M2: Backend & Database** (Completed & Verified)
- [x] **M2.1: Security Remediation & Independent Verification** (Completed & Verified — 64/64 tests)
- [x] **M3: Authentication & User Dashboard** (Completed & Verified — 98/98 tests)
- [x] **M3.1: Authentication Security Hardening & Browser Verification** (Completed & Verified — 124/124 tests)
- [x] **M3.1.1: Final Authentication Verification & Remediation** (Completed & Verified — 136/136 unit tests, 15/15 Playwright browser tests)

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
12. **Server-Side Trusted Origin CSRF & Zero Token Leakage (ADR-012 / M3.1):** Server-side trusted origin whitelist ignoring request Host spoofing, atomic single-use password reset tokens with SHA-256 hash persistence, and complete elimination of token logging.

---

## 7. Technology Stack
- **Framework:** Next.js 16.4.6 (App Router) / React 19.0.0
- **Language:** TypeScript 5.x / ES2022
- **Database & ORM:** SQLite + Prisma ORM 6.4.1 (10 models: User, Session, PasswordResetToken, HouseholdProfile, HouseholdMember, AirQualitySnapshot, SavedRoutine, ImpactLog, CommunityReport, RecommendationRecord)
- **Validation:** Zod v3.24
- **Security:** scrypt KDF ($N=16384, r=8, p=1$), SHA-256 token hashing, opaque DB session tokens, HMAC-SHA256 token adapter, timing-safe equality, PII/health logger redaction, server-side trusted origin CSRF guard
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Iconography:** Lucide React
- **Testing:** Vitest 5.1.1 + Testing Library (`@testing-library/react`, `@testing-library/jest-dom`) + Playwright E2E specification

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

## 9. Security & Privacy Audit Findings (M3.1)
- **Zero Token Leakage:** Reset tokens never logged, never returned in API responses, stored exclusively as SHA-256 hashes.
- **CSRF Defense:** Controlled origin whitelist ignores client-supplied `Host` headers; cookie-authenticated mutations without Origin/Referer fail closed with HTTP 403.
- **Session Fixation Defense:** Old session cookies are revoked prior to generating new authenticated sessions on login/register.
- **Timing Attack Mitigation:** `dummyPasswordVerification()` workload verified for non-existent user logins and reset requests.
- **Atomic Invalidation:** Single-use reset tokens consumed via atomic conditional updates; concurrent requests fail closed.
- **Cross-User Isolation (IDOR):** Verified across household profiles, routines, impact logs, and recommendations.
- **Rate Limiting:** Enforced per IP and per normalized email address.
- **Log Sanitization:** Sensitive medical conditions, passwords, reset tokens, and session secrets automatically redacted.
- **Git Credential Scan:** 0 exposed secrets in tracked files.

---

## 10. Automated Test Results
- **Vitest Suites:** 10 test files, 136 passed, 0 failed (Duration: ~6.8s).
- **Playwright Browser Suites:** 15 passed across Desktop Chrome, Mobile Small, Mobile Standard, 0 failed (Duration: ~20.9s).
- **TypeScript Compilation:** Passed with 0 errors (`npx tsc --noEmit`).
- **Prisma Schema Validation:** Validated with 0 errors (`npx prisma validate`), 2 migrations up to date.
- **Production Build:** Succeeded in 9.5s with 19 static/dynamic routes (`npm run build`).

---

## 11. Known Limitations & Module Boundaries
- External SMTP / email sending service (e.g., SendGrid, AWS SES) is unconfigured in development; password reset tokens are not delivered via email or logged, but verified via database cryptographic hashes.
- In-memory rate limiting operates per-process; production clustering across multiple container nodes requires Redis integration (`REDIS_URL` in `.env.example`).
- Live third-party AQI provider integrations (OpenAQ v3, Copernicus CAMS, Open-Meteo) are scheduled for **Module M4**.
- Generative AI recommendation reasoning (Gemini API) is scheduled for **Module M5**.

---

## 12. Exact Next Authorized Module
- **`M4 — Air Quality Intelligence`**
- Do NOT begin M4 until authorized by user / MOSAIC prompt.
