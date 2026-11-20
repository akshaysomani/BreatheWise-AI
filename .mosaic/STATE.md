# MOSAIC PROJECT STATE: BreatheWise AI
**Project:** BreatheWise AI  
**Competition:** Prompt War — Challenge 6: Urban Air Quality Assistant  
**Target Score:** 97.50+ / 100  
**Current Phase:** M2 — Backend & Database  
**Document Version:** 1.2.0  
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
- **Current Module:** `M2 — Backend & Database`
- **Status:** **COMPLETED & VERIFIED (52/52 Tests Passing)**
- **Completion Evidence:**
  - Complete normalized relational schema with 7 models in `prisma/schema.prisma` (`User`, `HouseholdProfile`, `HouseholdMember`, `AirQualitySnapshot`, `SavedRoutine`, `ImpactLog`, `CommunityReport`, `RecommendationRecord`).
  - SQLite database initialized and migrated (`20261120100156_init`) with deterministic seed script `prisma/seed.mjs`.
  - Type-safe data access layer implemented with repositories in `src/repositories/`.
  - Scientific domain services in `src/services/` for ASHRAE HEPA CADR sizing (5.0 ACH), DEFRA commute emissions avoidance, EPA AQI breakpoint conversion, and privacy centroid fuzzing (2 decimal places / ~1.1 km).
  - Centralized defensive Zod validation schemas in `src/lib/validations/` with strict coordinate bounding (-90..90, -180..180) and XSS injection rejection.
  - Complete API route suite in `src/app/api/` (`/api/health`, `/api/location/coordinates`, `/api/household`, `/api/aqi`, `/api/routines`, `/api/impact`, `/api/community/reports`, `/api/recommendations`).
  - Defensive security guards implemented: sliding-window rate limiter (`src/lib/rate-limiter.ts`), authentication boundary guard (`src/lib/auth-guard.ts`), credential-redacting logger (`src/lib/logger.ts`), and sanitized API envelope handlers (`src/lib/api-response.ts`).
  - 52/52 Vitest automated tests passing across 5 suites (100% pass rate).
  - TypeScript compilation: 0 errors (`npx tsc --noEmit`).
  - Production build: Successfully compiled via `next build --webpack` with external Prisma package configuration.

---

## 4. Completed Modules
- [x] **M0: Discovery & Architecture** (Approved & Verified)
- [x] **M1: Design System & Frontend Foundation** (Completed & Verified)
- [x] **M2: Backend & Database** (Completed & Verified — 52/52 tests)

---

## 5. Pending Modules
- `M3:` Authentication and Dashboard (Secure session management, household profile management, role-based controls, dashboard shell).
- `M4:` Air Quality Intelligence (Multi-provider AQI client, OpenAQ v3 integration, Open-Meteo physical forecast engine, caching layer, stale data indicators).
- `M5:` AI Assistant and Recommendations (Multi-provider LLM orchestration, structured output Zod schemas, ground-truth context injection, explainability engine).
- `M6:` Impact Tracker and Community (Mathematical emission savings calculators, verified vs community observations separation, privacy-preserving moderation).
- `M7:` Adversarial Audit (Security penetration testing, prompt injection fuzzing, rate-limit stress tests, OWASP verification).
- `M8:` Remediation (Addressing audit findings, bug fixes, hardening, performance optimizations).
- `M9:` Final Verification (End-to-end journey tests, Lighthouse accessibility/performance verification, grading against 97.50+ target rubric).

---

## 6. Architecture & Design Decisions
1. **Monolithic Full-Stack Architecture (ADR-001):** Next.js 16.4.6 App Router, React 19, TypeScript.
2. **Database Engine & ORM (ADR-002):** SQLite for deterministic zero-dependency local development + Prisma ORM 6.4.1 singleton. Prepared for seamless Postgres switch via environment connection string.
3. **Repository Pattern (ADR-003):** Strict encapsulation of Prisma queries in `src/repositories/` to enforce business logic separation and testability.
4. **Boundary Validation (ADR-004):** Centralized Zod schemas in `src/lib/validations/` executed before any service or database call.
5. **Privacy by Design (ADR-005):** Geolocation coordinates fuzzed to 2 decimal places (~1.1 km) before storage/display for community reports.
6. **Community Data Demarcation (ADR-006):** Invariant flag `isOfficialData: false` enforced on all citizen-submitted observations.
7. **Design Tokens & Brand Theme (ADR-007):** Exclusively light theme. Primary `#397A55`, Primary Hover `#2F6647`, Secondary `#718C72`, Accent `#D69B47`, Background `#F7F8F3`, Surface `#FFFFFF`, Surface Secondary `#EEF3EA`, Border `#E2E8DE`, Text `#27352D`, Muted `#68766C`, Success `#287A4B`, Warning `#A86B16`, Error `#B8423D`.
8. **Typography Pairing (ADR-008):** Manrope (Headings) + DM Sans (Body and tabular figures).
9. **Custom Vector SVG Hero (ADR-009):** Custom-coded vector illustration depicting clean air circulation, city silhouette, and HEPA-protected home.
10. **Strict Sample Fixture Demarcation (ADR-010):** All dashboard cards in M1 carry explicit `SAMPLE FIXTURE — NOT LIVE DATA` indicators to guarantee scientific integrity before M4 API activation.

---

## 7. Technology Stack
- **Framework:** Next.js 16.4.6 (App Router) / React 19.0.0
- **Language:** TypeScript 5.x / ES2022
- **Database & ORM:** SQLite + Prisma ORM 6.4.1
- **Validation:** Zod v3.24
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`) with CSS custom properties
- **Iconography:** Lucide React (vector only)
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

## 9. Security & Privacy Audit Findings (M2)
- **Authentication Guard:** Protected endpoints (`/api/household`, `/api/routines`, `/api/impact`, `/api/recommendations`) return HTTP 401 if unauthenticated.
- **Rate Limiting:** Sliding-window limiter returns HTTP 429 and `Retry-After` header when IP threshold is breached.
- **SQL Injection:** Impossible by design; Prisma parameterized prepared queries only. Zero raw SQL string interpolation.
- **Input Validation & XSS:** Zod schemas reject HTML/script tags and validate coordinate ranges (-90..90, -180..180).
- **Log Sanitization:** PII and API keys (`password`, `token`, `secret`, `key`) redacted to `[REDACTED]`.
- **Location Privacy:** 2-decimal truncation (~1.1 km) prevents exact home address identification.
- **Community Integrity:** Citizen reports hardcoded with `isOfficialData: false`.

---

## 10. Automated Test Results
- **Vitest Unit, Service & API Tests:** 52 passed, 0 failed across 5 test suites (Duration: ~2.47s).
- **TypeScript Compilation:** Passed with 0 errors (`npx tsc --noEmit`).
- **Production Build:** Succeeded (`npm run build` via `next build --webpack`).
- **Database Migrations:** Clean SQLite schema created and seeded with test fixtures.

---

## 11. Files Created or Modified in M2
- `prisma/schema.prisma` (Normalized schema: User, HouseholdProfile, HouseholdMember, AirQualitySnapshot, SavedRoutine, ImpactLog, CommunityReport, RecommendationRecord)
- `prisma/migrations/20261120100156_init/migration.sql` (Initial deterministic SQLite migration)
- `prisma/seed.mjs` (Development fixtures seed script)
- `src/lib/db.ts` (PrismaClient singleton)
- `src/lib/logger.ts` (Sanitized logger with PII and credential redaction)
- `src/lib/rate-limiter.ts` (Defensive sliding-window rate limiter)
- `src/lib/api-response.ts` (Standardized JSON API envelopes and error interceptor)
- `src/lib/auth-guard.ts` (Authentication session guard)
- `src/lib/validations/common.schema.ts` (Coordinates, pagination, sanitized strings)
- `src/lib/validations/household.schema.ts` (Household profile, member, and vulnerability validations)
- `src/lib/validations/air-quality.schema.ts` (Pollutant ranges, AQI bounds 0..1000)
- `src/lib/validations/routine.schema.ts` (Commute transit modes, distance, 24h format)
- `src/lib/validations/impact.schema.ts` (Action types, CO2e, PM2.5, confidence intervals)
- `src/lib/validations/community.schema.ts` (Citizen report types, severity, descriptions)
- `src/lib/validations/recommendation.schema.ts` (6-field explainability contract)
- `src/repositories/household.repository.ts` (Household and member data access)
- `src/repositories/air-quality.repository.ts` (Air quality snapshot queries and time-series)
- `src/repositories/routine.repository.ts` (Commute routine data access)
- `src/repositories/impact.repository.ts` (Impact logging and mathematical aggregate queries)
- `src/repositories/community.repository.ts` (Fuzzed community reports data access)
- `src/repositories/recommendation.repository.ts` (Explainable recommendations storage)
- `src/services/household.service.ts` (ASHRAE HEPA CADR calculator & vulnerability evaluator)
- `src/services/impact.service.ts` (DEFRA carbon & particulate avoidance calculator)
- `src/services/community.service.ts` (2-decimal centroid privacy fuzzing & official data demarcation)
- `src/services/routine.service.ts` (Commute inhaled dose & emissions estimator)
- `src/services/air-quality.service.ts` (EPA piecewise linear AQI interpolation & staleness detector)
- `src/app/api/health/route.ts` (GET health check with db ping and uptime)
- `src/app/api/location/coordinates/route.ts` (GET location coordinates validation & fuzzing)
- `src/app/api/household/route.ts` (GET & POST household profile and members)
- `src/app/api/aqi/route.ts` (GET local AQI snapshot from cache)
- `src/app/api/routines/route.ts` (GET & POST saved commute routines)
- `src/app/api/impact/route.ts` (GET & POST verified impact logs and stats)
- `src/app/api/community/reports/route.ts` (GET & POST citizen observation reports)
- `src/app/api/recommendations/route.ts` (GET & POST 6-field structured recommendations)
- `src/test/database.test.ts` (6 database constraint and repository unit tests)
- `src/test/validations.test.ts` (13 Zod validation schema tests)
- `src/test/services.test.ts` (9 mathematical algorithm and domain service tests)
- `src/test/security-api.test.ts` (8 API endpoint, auth guard, rate limit, and logger tests)
- `next.config.mjs` (Configured serverExternalPackages: ['@prisma/client'])
- `package.json` (Added build:webpack and locked Prisma 6.4.1)
- `.mosaic/M2_BACKEND_DATABASE_REPORT.md` (Detailed backend and database documentation)
- `.mosaic/STATE.md` (Updated state ledger v1.2.0)

---

## 12. Known Limitations & Module Boundaries
- The current backend endpoints serve structured database fixtures and mathematical calculators. Live third-party AQI provider integrations (OpenAQ v3, Open-Meteo) are strictly scheduled for Module M4.
- Generative AI recommendation orchestration (Gemini API / multi-provider LLM) is strictly scheduled for Module M5.
- User session authentication flows (passwords, JWT/cookies, profile onboarding UI) are scheduled for Module M3.

---

## 13. Exact Next Authorized Module
- **`M3 — Authentication and Dashboard`**
- Do NOT begin M3 until authorized by user / MOSAIC prompt.
