# MOSAIC PROJECT STATE: BreatheWise AI
**Project:** BreatheWise AI  
**Competition:** Prompt War — Challenge 6: Urban Air Quality Assistant  
**Target Score:** 97.50+ / 100  
**Current Phase:** Module 5 COMPLETED & VERIFIED — AI Assistant & Intelligent Recommendations Formally Closed  
**Document Version:** 1.8.0  
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
- **Current Module:** `Module 5 — AI Assistant & Intelligent Recommendations`
- **Status:** **COMPLETED, LIVE INTEGRATION VERIFIED & INDEPENDENTLY AUDITED (263/263 Vitest Tests Passing, 36/36 Playwright Browser Tests Passing, Real ESLint 0 Errors, Live Gemini API Verified)**
- **Completion Evidence:**
  - **Five Connected M5 Capabilities Delivered & Scientifically Audited:**
    1. *BreatheWise AI Assistant:* Conversational environmental intelligence grounded in real-time verified CPCB telemetry, 2-decimal geocoordinate quantization (~1.1 km), and user household risk profiles.
    2. *Personalized Daily Routine Generator:* Diurnal phase breakdown (Morning, Afternoon, Evening) with activity windows, boundary layer dispersion modeling, night-time indoor air sealing, and strictly conditioned afternoon cross-ventilation (windows kept sealed if AQI > 100).
    3. *Indoor Air Quality (IAQ) Advisor:* Clean Air Delivery Rate (CADR) room volume calculator using an acute 5.0 ACH particulate mitigation design target (CDC Clean Air in Buildings Challenge / AHAM CADR guidelines), explicit out-of-range input validation errors (Area 20–5,000 sq ft, Height 7–18 ft) with inline UI alerts, clean-air delivery deficit warnings, source control protocols, and scientific debunking of houseplant air-purification myths (Waring et al., 2020).
    4. *Family-Aware Health-Protection Guidance:* Vulnerability stratification (infants, asthmatics, elderly, cardiovascular disease); symptom-based emergency triage directing users to 112 (India's ERSS) only when acute medical distress occurs; certified N95/N99/FFP2 respirator guidance with explicit disclosures regarding particulate filtration vs. lack of gas adsorption (and consumer carbon layers).
    5. *Sustainable Lifestyle & Commute Guidance:* Mass transit mode shift emissions vs. acute exposure trade-offs with strict health-first prioritization (never advise cycling/walking in Poor/Very Poor/Severe AQI).
  - **6-Field Explainability Contract:** Strict Zod validation and UI rendering of `action`, `reason`, `expectedBenefit`, `measurableImpact`, `assumptions`, and `uncertainty` with collapsible scientific disclosures and feedback loops.
  - **Server-Side Gemini Integration & Deterministic Fallback:** Live generative model integration verified with active Google AI Studio model `gemini-3-flash-preview` (`thinkingBudget: 0`), 20-second bounded execution, 4096 output tokens, HTTP 400/404 retired-model failover, and instant fallback to an 8-rule peer-reviewed scientific rules engine.
  - **AI Safety & Prompt Defense:** Isolated XML delimiter system boundaries (`<SYSTEM_PROMPT>`, `<ENVIRONMENTAL_EVIDENCE>`, `<USER_CONTEXT>`, `<USER_QUERY>`), delimiter breakout stripping, injection scanning, and output sanitization scrubbing HTML/scripts/eval/image tracking payloads.
  - **Zero-Fabrication Telemetry Policy:** Real database/provider environmental observations injected into model context; honest `NO_DATA` when coordinates lack observations.
  - **Automated Verification:** **263/263 unit, service, adversarial and integration tests passing** across 17 Vitest test suites (`npx vitest run`).
  - **Browser Automation:** **36/36 Playwright tests passing** across Desktop Chrome (1440x900), Mobile Small (360x640), and Mobile Standard (390x844).
  - **Static Analysis & Build:** Real ESLint configured (`npm run lint`: 0 errors, 0 warnings); `npx tsc --noEmit` passing with 0 errors; Next.js production build succeeding with all 24 routes prerendered.
- **Next Phase:** Module 6 — Impact Tracker & Community Features (Awaiting user authorization; strictly NOT started).

---

## 4. Completed Modules
- [x] **M0: Discovery & Architecture** (Approved & Verified)
- [x] **M1: Design System & Frontend Foundation** (Completed & Verified)
- [x] **M2: Backend & Database** (Completed & Verified)
- [x] **M2.1: Security Remediation & Independent Verification** (Completed & Verified — 64/64 tests)
- [x] **M3: Authentication & User Dashboard** (Completed & Verified — 98/98 tests)
- [x] **M3.1: Authentication Security Hardening & Browser Verification** (Completed & Verified — 124/124 tests)
- [x] **M3.1.1: Final Authentication Verification & Remediation** (Completed & Verified — 136/136 unit tests, 15/15 Playwright browser tests)
- [x] **M4: Air Quality Intelligence** (Completed, Verified & Formally Closed — 228/228 unit tests, 24/24 Playwright browser tests)
  - [x] **M4.1: Live Provider Integration & Environmental Data Integrity Audit** (Completed & Verified)
  - [x] **M4.1.1: Scientific AQI Validation & Final Evidence Audit** (Completed & Verified)
  - [x] **M4.1.2: CPCB Averaging Rules Correction & Final Scientific Verification** (Completed & Verified)
- [x] **M5: AI Assistant & Intelligent Recommendations** (Completed & Verified — 263/263 unit tests, 36/36 Playwright browser tests, 0 lint errors)

---

## 5. Pending Modules
- `M6:` Impact Tracker and Community (Mathematical emission savings calculators, verified vs community observations separation, privacy-preserving moderation).
- `M7:` Adversarial Audit (Security penetration testing, prompt injection fuzzing, rate-limit stress tests, OWASP verification).
- `M8:` Remediation (Addressing audit findings, bug fixes, hardening, performance optimizations).
- `M9:` Final Verification (End-to-end journey tests, Lighthouse accessibility/performance verification, grading against 97.50+ target rubric).

---

## 6. Architecture & Design Decisions
1. **Monolithic Full-Stack Architecture (ADR-001):** Next.js 16.4.6 App Router, React 19, TypeScript.
2. **Database Engine & ORM (ADR-002):** SQLite for deterministic local verification + Prisma ORM 6.4.1 singleton. 12 normalized models.
3. **Repository Pattern (ADR-003):** Strict encapsulation of Prisma queries in `src/repositories/` with ownership verification before update/delete.
4. **Boundary Validation (ADR-004):** Centralized Zod schemas in `src/lib/validations/` with strict coordinate bounding (-90..90, -180..180) and XSS injection rejection.
5. **Privacy by Design (ADR-005):** Geolocation coordinates quantized to 2 decimal places (~1.1 km latitude, ~0.97 km longitude at 28.6°N).
6. **Community Data Demarcation (ADR-006):** Invariant flag `isOfficialData: false` enforced on all citizen-submitted observations.
7. **Cryptographic Session Boundary (ADR-007):** Constant-time HMAC-SHA256 session token adapter. Zero trust for client-supplied user ID headers.
8. **Design Tokens & Brand Theme (ADR-008):** Exclusively light theme (`#397A55` Forest Green, `#F7F8F3` Alabaster).
9. **Typography Pairing (ADR-009):** Manrope (Headings) + DM Sans (Body and figures).
10. **Strict Fixture Demarcation (ADR-010):** Unactivated data cards carry explicit `SAMPLE FIXTURE — NOT LIVE DATA` labels until activated.
11. **Authentication & Session Architecture (ADR-011):** scrypt KDF with 16-byte salt, constant-time verification, timing-safe dummy evaluation, database-backed opaque sessions in `HttpOnly` cookies, Origin/Referer CSRF guard, and sanitizeReturnUrl open redirect mitigation.
12. **Server-Side Trusted Origin CSRF & Zero Token Leakage (ADR-012 / M3.1):** Server-side trusted origin whitelist ignoring request Host spoofing, atomic single-use password reset tokens with SHA-256 hash persistence, and complete elimination of token logging.
13. **Indian CPCB NAQI Calculation Engine & Standards Compliance (ADR-013 / M4):** Strictly implements official Central Pollution Control Board (CPCB) India National Air Quality Index (NAQI) guidelines covering 8 criteria pollutants with piecewise linear interpolation, 24-hr/8-hr Indian NAAQS limits, and the CPCB >=3 criteria parameter data sufficiency rule (mandatory PM2.5 or PM10).
14. **Geospatial Station Selection & Zero-Fabrication Telemetry Policy (ADR-014 / M4):** Great-circle Haversine distance, composite station ranking, 50 km cutoff radius, 2-decimal-place user coordinate quantization, and absolute prohibition on synthetic/fabricated telemetry numbers.
15. **Mock Data Elimination & Hard Production Boundary (ADR-015 / M4.1):** Complete removal of mock providers from runtime paths. Test fixtures isolated in `src/test/fixtures/` with `assertNotProduction()` hard exception guard. When live data is unconfigured and cache is empty, the application serves honest `NO_DATA` with zero simulated numbers.
16. **Four-Timestamp Model & Provenance State Machine (ADR-016 / M4.1):** Explicit tracking of observation time (physical sensor), ingestion time (BreatheWise fetch), retrieval time (client response), and cache time (database persistence). 5-state provenance classification (`LIVE`, `CACHED`, `STALE`, `MOCK`, `NO_DATA`).
17. **Scientific AQI Decoupling & Continuous Completeness Enforcement (ADR-017 / M4.1.1):** Rigorous mathematical decoupling of official CPCB National AQI ($\ge 16$ hours data completeness required per MoEFCC protocol) from acute 1-hour sensor proxy indicators. 5-tier typed database provenance (`VERIFIED_EXTERNAL_OBSERVATION`, `HISTORICAL_IMPORTED`, `DEVELOPMENT_SEED`, `SYNTHETIC_FIXTURE`, `UNKNOWN_PROVENANCE`) with physical observation time strictly decoupled from server ingestion time.
18. **CPCB Averaging Rules Correction & Hourly Binning Completeness (ADR-018 / M4.1.2):** Removal of unsupported "continuous" data requirement (non-continuous hourly samples with $\ge 16$ distinct valid hours satisfy CPCB standard); elimination of invented 6-hour threshold for CO and O3; implementation of 8-hour running arithmetic mean over distinct hourly bin averages in $[h_{\text{asOf}} - 7, h_{\text{asOf}}]$ with an explicit 75% ($\ge 6\text{h}$) active-window engineering safeguard; sample deduplication into hourly bins; station telemetry isolation (`targetStationId`); and comprehensive `PollutantCompletenessAudit` structure.
19. **Explainable AI Architecture, Prompt Defense & Deterministic Fallback (ADR-019 / M5):** Implementation of an authoritative 6-field explainability contract (`action`, `reason`, `expectedBenefit`, `measurableImpact`, `assumptions`, `uncertainty`); non-overridable XML delimiter prompt boundaries (`<SYSTEM_PROMPT>`, `<ENVIRONMENTAL_EVIDENCE>`, `<USER_CONTEXT>`, `<USER_QUERY>`); output sanitizer scrubbing HTML/scripts/eval/image tracking payloads; 2-decimal coordinate quantization (~1.1km); EPA 5.0 ACH CADR room sizing engine; diurnal routine stratification (Morning, Afternoon, Evening); health-protection priority over carbon reduction during hazardous pollution; and instant fallback to a deterministic scientific rules engine on LLM errors, timeouts (8s), or missing keys.

---

## 7. Technology Stack
- **Framework:** Next.js 16.4.6 (App Router) / React 19.0.0
- **Language:** TypeScript 5.x / ES2022
- **Database & ORM:** SQLite + Prisma ORM 6.4.1 (12 models: User, Session, PasswordResetToken, HouseholdProfile, HouseholdMember, AirQualitySnapshot, SavedRoutine, ImpactLog, CommunityReport, RecommendationRecord, Conversation, ConversationMessage, RecommendationFeedback)
- **Validation:** Zod v3.24
- **Security:** scrypt KDF ($N=16384, r=8, p=1$), SHA-256 token hashing, opaque DB session tokens, HMAC-SHA256 token adapter, timing-safe equality, PII/health logger redaction, server-side trusted origin CSRF guard, assertNotProduction hard guard, prompt boundary isolation, output sanitization
- **AI Engine:** Google Gemini 1.5 Flash (server-side, 8s timeout, structured JSON schema) + Deterministic Peer-Reviewed Scientific Rules Engine Fallback
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Iconography:** Lucide React
- **Testing:** Vitest 5.1.1 + Testing Library (`@testing-library/react`, `@testing-library/jest-dom`) + Playwright E2E specification (Desktop Chrome, Mobile 360px, Mobile 390px)
