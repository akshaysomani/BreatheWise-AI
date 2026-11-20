# MOSAIC PROJECT STATE: BreatheWise AI
**Project:** BreatheWise AI  
**Competition:** Prompt War — Challenge 6: Urban Air Quality Assistant  
**Target Score:** 97.50+ / 100  
**Current Phase:** M2.1 — Security Remediation & Independent Verification  
**Document Version:** 1.2.1  
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
- **Current Module:** `M2.1 — Security Remediation & Independent Verification`
- **Status:** **COMPLETED & INDEPENDENTLY VERIFIED (64/64 Tests Passing)**
- **Completion Evidence:**
  - Audited and remediated authentication trust: client-supplied `x-authenticated-user-id` header completely removed; replaced with a cryptographically verified HMAC-SHA256 session token adapter (`v1.<payload>.<sig>`) with constant-time signature comparison and strict fail-closed boundary.
  - Sanitized and hardened rate limiting: `getClientIp` enforces strict IPv4/IPv6 regex checks to prevent header injection; in-memory process scope and Redis clustering specification for production transparently documented.
  - Sensitive health data privacy: medical diagnoses (`hasAsthma`, `hasHeartCondition`, `isPregnant`) added to automated log redaction; private household queries strictly user-isolated.
  - Scientific claims refined: 5.0 ACH qualified as an EPA/CDC wildfire/smog particulate air cleaning target (distinct from ASHRAE 62.2 outdoor air minimums); UK DEFRA 2023/2024 emission factors cited with grid intensity caveats; US EPA February 2024 Revised PM2.5 AQI breakpoints implemented with strict 0.1 µg/m³ truncation; commuter minute ventilation ($V_E$) modeled; coordinate fuzzing qualified as spatial quantization (~1.1 km).
  - Database model count verified: confirmed exactly **8 normalized models** in `prisma/schema.prisma` (`User`, `HouseholdProfile`, `HouseholdMember`, `AirQualitySnapshot`, `SavedRoutine`, `ImpactLog`, `CommunityReport`, `RecommendationRecord`).
  - Automated testing: **64/64 tests passing** across 6 test suites including 12 comprehensive security regression tests in `src/test/security-remediation.test.ts`.
  - Static analysis & build: `npx tsc --noEmit` passing (0 errors), `npx prisma validate` passing, `npm run build` Webpack production build succeeding.
  - Dependency audit: `npm audit` reports **0 vulnerabilities**.
  - Git secret scan: 0 live credentials in tracked files.

---

## 4. Completed Modules
- [x] **M0: Discovery & Architecture** (Approved & Verified)
- [x] **M1: Design System & Frontend Foundation** (Completed & Verified)
- [x] **M2: Backend & Database** (Completed & Verified)
- [x] **M2.1: Security Remediation & Independent Verification** (Completed & Verified — 64/64 tests)

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
2. **Database Engine & ORM (ADR-002):** SQLite for deterministic local verification + Prisma ORM 6.4.1 singleton. 8 normalized models.
3. **Repository Pattern (ADR-003):** Strict encapsulation of Prisma queries in `src/repositories/` with ownership verification before update/delete.
4. **Boundary Validation (ADR-004):** Centralized Zod schemas in `src/lib/validations/` with strict coordinate bounding (-90..90, -180..180) and XSS injection rejection.
5. **Privacy by Design (ADR-005):** Geolocation coordinates quantized to 2 decimal places (~1.1 km latitude, ~0.97 km longitude at 28.6°N).
6. **Community Data Demarcation (ADR-006):** Invariant flag `isOfficialData: false` enforced on all citizen-submitted observations.
7. **Cryptographic Session Boundary (ADR-007):** Constant-time HMAC-SHA256 session token adapter. Zero trust for client-supplied user ID headers.
8. **Design Tokens & Brand Theme (ADR-008):** Exclusively light theme (`#397A55` Forest Green, `#F7F8F3` Alabaster).
9. **Typography Pairing (ADR-009):** Manrope (Headings) + DM Sans (Body and figures).
10. **Strict Fixture Demarcation (ADR-010):** Unactivated data cards carry explicit `SAMPLE FIXTURE — NOT LIVE DATA` labels until M4/M5.

---

## 7. Technology Stack
- **Framework:** Next.js 16.4.6 (App Router) / React 19.0.0
- **Language:** TypeScript 5.x / ES2022
- **Database & ORM:** SQLite + Prisma ORM 6.4.1 (8 models)
- **Validation:** Zod v3.24
- **Security:** HMAC-SHA256 session token adapter, timing-safe equality, PII/health logger redaction
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

## 9. Security & Privacy Audit Findings (M2.1)
- **Authentication Trust:** Forged `x-authenticated-user-id` headers rejected with HTTP 401; requires signed HMAC token.
- **Cross-User Isolation (IDOR):** Verified on household profiles, routines, impact logs, and recommendations.
- **Rate Limiting:** IP extraction sanitized; in-memory process scope documented with Redis specification for clustering.
- **Log Sanitization:** Sensitive medical conditions (`hasAsthma`, `hasHeartCondition`, `isPregnant`) and credentials redacted.
- **Dependency Audit:** `npm audit` reports **0 vulnerabilities**.
- **Git Credential Scan:** 0 exposed secrets in tracked files.

---

## 10. Automated Test Results
- **Vitest Suites:** 6 test files, 64 passed, 0 failed (Duration: ~2.57s).
- **TypeScript Compilation:** Passed with 0 errors (`npx tsc --noEmit`).
- **Prisma Schema Validation:** Validated with 0 errors (`npx prisma validate`).
- **Production Build:** Succeeded (`npm run build`).

---

## 11. Known Limitations & Module Boundaries
- The cryptographic session adapter is active for API protection; full login forms, cookie session issuance, and user onboarding UI are scheduled for **Module M3**.
- Live third-party AQI provider integrations (OpenAQ v3, Copernicus CAMS, Open-Meteo) are scheduled for **Module M4**.
- Generative AI recommendation reasoning (Gemini API) is scheduled for **Module M5**.

---

## 12. Exact Next Authorized Module
- **`M3 — Authentication and Dashboard`**
- Do NOT begin M3 until authorized by user / MOSAIC prompt.
