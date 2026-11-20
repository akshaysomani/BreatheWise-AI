# MOSAIC PROJECT STATE: BreatheWise AI
**Project:** BreatheWise AI  
**Competition:** Prompt War — Challenge 6: Urban Air Quality Assistant  
**Target Score:** 97.50+ / 100  
**Current Phase:** M4.1.1 — Scientific AQI Validation & Final Evidence Audit  
**Document Version:** 1.4.2  
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
- **Current Module:** `M4.1.1 — Scientific AQI Validation & Final Evidence Audit`
- **Status:** **COMPLETED & INDEPENDENTLY AUDITED (202/202 Vitest Tests Passing, 24/24 Playwright Browser Tests Passing)**
- **Completion Evidence:**
  - **Decoupled Official CPCB 24-Hour Regulatory AQI from Acute Short-Term Proxy:** Implemented mathematical completeness checks ($\ge 16$ hours continuous monitoring for 24-hr criteria pollutants, $\ge 6$ hours for 8-hr CO/O3). Single hourly readings explicitly return `officialCpcbAqi.status = 'INSUFFICIENT_COMPLETENESS'` (`aqi = null`, `category = 'UNAVAILABLE'`), while providing `shortTermIndicator = { indicatorValue, category, observationPeriod: '1_HOUR' }`.
  - **SQLite Database Provenance Audit & Migration:** Created non-destructive migration `20261120131818_add_m4_1_1_provenance_and_averaging` adding `provenanceType`, `averagingPeriod`, and `completenessHours` with compound index on `[stationId, measurementTimestamp]`. Classified all database snapshots into 5 typed categories (`VERIFIED_EXTERNAL_OBSERVATION`, `HISTORICAL_IMPORTED`, `DEVELOPMENT_SEED`, `SYNTHETIC_FIXTURE`, `UNKNOWN_PROVENANCE`).
  - **Timestamp Decoupling Invariant:** Enforced strict separation between physical observation timestamp (`measurementTimestamp`) and server ingestion timestamp (`fetchedAt`). Database insertion time is never substituted for physical observation time.
  - **5-State Provenance Machine & 10 Production Invariants:** Verified truth table for `LIVE`, `CACHED`, `STALE`, `MOCK`, and `NO_DATA`. Proved that seed records and synthetic fixtures cannot masquerade as live telemetry, mock fixtures are strictly blocked in production mode, and geolocation is quantized for privacy.
  - **Dual-Card Dashboard Presentation (`AirQualityRadar.tsx`):** Added a dedicated Official CPCB 24-Hour Regulatory AQI status card (`data-testid="official-cpcb-status"`) disclosing statutory MoEFCC 16-hour continuous completeness requirements, alongside the real-time Acute 1-Hour Proxy gauge (`data-testid="short-term-indicator-badge"`).
  - **Automated Verification:** **202/202 unit and integration tests passing** across 15 Vitest test suites (`npx vitest run`).
  - **Browser Automation:** **24/24 Playwright tests passing** across Desktop Chrome (1440x900), Mobile Small (360x640), and Mobile Standard (390x844).
  - **Static Analysis & Build:** `npx tsc --noEmit` passing with 0 errors; Webpack production build succeeding with all 19 routes prerendered.

---

## 4. Completed Modules
- [x] **M0: Discovery & Architecture** (Approved & Verified)
- [x] **M1: Design System & Frontend Foundation** (Completed & Verified)
- [x] **M2: Backend & Database** (Completed & Verified)
- [x] **M2.1: Security Remediation & Independent Verification** (Completed & Verified — 64/64 tests)
- [x] **M3: Authentication & User Dashboard** (Completed & Verified — 98/98 tests)
- [x] **M3.1: Authentication Security Hardening & Browser Verification** (Completed & Verified — 124/124 tests)
- [x] **M3.1.1: Final Authentication Verification & Remediation** (Completed & Verified — 136/136 unit tests, 15/15 Playwright browser tests)
- [x] **M4: Air Quality Intelligence** (Completed & Verified — 166/166 unit tests, 21/21 Playwright browser tests)
- [x] **M4.1: Live Provider Integration & Environmental Data Integrity Audit** (Completed & Verified — 191/191 unit tests, 24/24 Playwright browser tests)
- [x] **M4.1.1: Scientific AQI Validation & Final Evidence Audit** (Completed & Verified — 202/202 unit tests, 24/24 Playwright browser tests)

---

## 5. Pending Modules
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
13. **Indian CPCB NAQI Calculation Engine & Standards Compliance (ADR-013 / M4):** Strictly implements official Central Pollution Control Board (CPCB) India National Air Quality Index (NAQI) guidelines covering 8 criteria pollutants with piecewise linear interpolation, 24-hr/8-hr Indian NAAQS limits, and the CPCB >=3 criteria parameter data sufficiency rule (mandatory PM2.5 or PM10).
14. **Geospatial Station Selection & Zero-Fabrication Telemetry Policy (ADR-014 / M4):** Great-circle Haversine distance, composite station ranking, 50 km cutoff radius, 2-decimal-place user coordinate quantization, and absolute prohibition on synthetic/fabricated telemetry numbers.
15. **Mock Data Elimination & Hard Production Boundary (ADR-015 / M4.1):** Complete removal of mock providers from runtime paths. Test fixtures isolated in `src/test/fixtures/` with `assertNotProduction()` hard exception guard. When live data is unconfigured and cache is empty, the application serves honest `NO_DATA` with zero simulated numbers.
16. **Four-Timestamp Model & Provenance State Machine (ADR-016 / M4.1):** Explicit tracking of observation time (physical sensor), ingestion time (BreatheWise fetch), retrieval time (client response), and cache time (database persistence). 5-state provenance classification (`LIVE`, `CACHED`, `STALE`, `MOCK`, `NO_DATA`).
17. **Scientific AQI Decoupling & Continuous Completeness Enforcement (ADR-017 / M4.1.1):** Rigorous mathematical decoupling of official 24-hour CPCB regulatory NAQI ($\ge 16$ hours data completeness required per MoEFCC protocol) from acute 1-hour sensor proxy indicators. 5-tier typed database provenance (`VERIFIED_EXTERNAL_OBSERVATION`, `HISTORICAL_IMPORTED`, `DEVELOPMENT_SEED`, `SYNTHETIC_FIXTURE`, `UNKNOWN_PROVENANCE`) with physical observation time strictly decoupled from server ingestion time.

---

## 7. Technology Stack
- **Framework:** Next.js 16.4.6 (App Router) / React 19.0.0
- **Language:** TypeScript 5.x / ES2022
- **Database & ORM:** SQLite + Prisma ORM 6.4.1 (10 models: User, Session, PasswordResetToken, HouseholdProfile, HouseholdMember, AirQualitySnapshot, SavedRoutine, ImpactLog, CommunityReport, RecommendationRecord)
- **Validation:** Zod v3.24
- **Security:** scrypt KDF ($N=16384, r=8, p=1$), SHA-256 token hashing, opaque DB session tokens, HMAC-SHA256 token adapter, timing-safe equality, PII/health logger redaction, server-side trusted origin CSRF guard, assertNotProduction hard guard
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Iconography:** Lucide React
- **Testing:** Vitest 5.1.1 + Testing Library (`@testing-library/react`, `@testing-library/jest-dom`) + Playwright E2E specification (Desktop Chrome, Mobile 360px, Mobile 390px)
