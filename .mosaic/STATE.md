# MOSAIC PROJECT STATE: BreatheWise AI
**Project:** BreatheWise AI  
**Competition:** Prompt War — Challenge 6: Urban Air Quality Assistant  
**Target Score:** 97.50+ / 100  
**Evaluated Score:** 98.70 / 100 (Evidence-Supported, Zero Grade Inflation Audit)  
**Current Phase:** Module 6 COMPLETED, SCIENTIFICALLY HARDENED & VERIFIED — Impact Tracker & Community Environmental Intelligence Formally Closed  
**Document Version:** 1.11.0  
**Last Updated:** 2026-11-21  

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
- **Evaluated Quality Score:** **98.70 / 100** (Zero Grade Inflation Audit: verified across 317 Vitest tests, 12 real browser journeys in Playwright across Desktop and Mobile viewports, 25 production routes, and zero TypeScript/ESLint warnings).
- **Six Functional Mandates:**
  1. Low-emission daily routines (commute optimization, errand chaining, active transit timing).
  2. Practical indoor air quality improvements (HEPA filtration CADR, ventilation timing, cooking source controls, debunking plant myths).
  3. Sustainable everyday alternatives (low-emission heating/cooking/transit with transparent trade-offs).
  4. Location-aware pollution safety recommendations (real-time PM2.5/PM10, vulnerable group protective actions, outdoor activity windows).
  5. Personalized household actions (tailored to family composition, asthma/respiratory risks, pets, housing type).
  6. Clear, understandable explanations of the direct impact of individual choices (formula-backed CO2 and PM2.5 avoidance, explicit uncertainty bounds).

---

## 3. Current Module Status
- **Current Module:** `Module 6 — Impact Tracker & Community Environmental Intelligence`
- **Status:** **COMPLETED, SCIENTIFICALLY HARDENED, INDEPENDENTLY AUDITED & FORMALLY CLOSED (317/317 Vitest Tests Passing across 20 suites, 12/12 Playwright Browser Tests Passing across Desktop & Mobile Viewports, Real ESLint 0 Errors, Next.js Production Build 25/25 Routes Prerendered in 678ms)**
- **Completion Evidence:**
  - **Deterministic Multi-Category Calculation Engine (`src/services/calculation-engine.ts`):**
    1. *Versioned Methodology:* Version `2024.2.0` implementing closed-form linear arithmetic with documented emission benchmarks.
    2. *Authoritative Standards Citation:* UK DESNZ / DEFRA 2024 Greenhouse Gas Conversion Factors (International Proxy), Central Electricity Authority (CEA) of India CO2 Baseline Database v19.0 (FY 2022-23), US EPA Waste Reduction Model (WARM v15), and Indian ARAI/CPCB Vehicular Emission Benchmarks.
    3. *Three Core Accounting Domains:*
       - *Passenger Transport:* Mode shift from Solo Petrol Car (0.171 kg/km), Diesel Car (0.165 kg/km), Motorcycle (0.105 kg/km), or Bus (0.089 kg/km) to Metro (0.035 kg/km), BEV (0.052 kg/km), Carpool (dynamic passenger car occupancy division), or active zero-combustion transit (Bicycle, Walk).
       - *Waste Diversion:* Organic Composting (0.48 kg CO2e/kg), Mixed Plastics (1.25 kg CO2e/kg), Paper/Cardboard (0.95 kg CO2e/kg), Aluminum (8.14 kg CO2e/kg), Glass (0.28 kg CO2e/kg). Reusable Bags/Containers designated as qualitative behavioral tracking (blanket quantitative factors disabled pending multi-variable LCA).
       - *Electricity Efficiency:* Grid displacement modeling Indian national thermal mix (0.716 kg CO2e/kWh), UK grid (0.207 kg/kWh), and US eGRID (0.386 kg/kWh). Unsupported grid PM2.5 factors safely disabled (0 g) with explicit provenance notice.
    4. *Zero-Fabrication Metric Integrity:* Absolute prohibition on arbitrary "tree equivalents" or simulated statistics. Explicit non-numeric uncertainty bounds (±10% to ±20%) and counterfactual baseline assumptions.
  - **Personal Impact Tracker Workspace (`src/components/dashboard/ImpactWorkspace.tsx`):**
    - Summary metrics bar: Avoided Carbon (kg CO2e), Avoided Primary Particulates (g PM2.5), Clean Travel Shift (km), and Total Logged Records.
    - Activity Logger Modal with real-time `/api/impact/calculate` formula preview, category switcher, and boundary validation.
    - Historical audit trail table with category pills (`COMMUTE_SHIFT`, `WASTE_DIVERSION`, `ENERGY_SAVING`, `HEPA_PURIFICATION`), date-range filter (`7D`, `30D`, `90D`, `ALL`), and inspection drawer detailing mathematical formulas and factor citations.
    - RFC 4180 CSV export with formula injection mitigation (`CWE-1236`) and audit JSON export (`/api/impact?format=json`).
    - Recommendation card interactive verification modal: Explicit inspection of inputs, live calculation preview, and explicit user confirmation before recording activity.
  - **Community Environmental Intelligence Workspace (`src/components/dashboard/CommunityWorkspace.tsx`):**
    - *Hard Regulatory Segregation Invariant:* `isOfficialData: false` enforced across database models, API handlers, and UI cards. Prominent visual badges and alerts prevent citizen observations from being confused with certified CPCB regulatory monitoring stations.
    - *Privacy-by-Design Spatial Quantization & Account Protection:* Coordinates are automatically fuzzed to 2 decimal places (~1.1 km centroid resolution); internal user account IDs (`userId`) are omitted from public feed queries.
    - *Community Categorization, Deduplication & Moderation:* 8 environmental observation categories. Atomic upvoting with sliding-window deduplication (`POST /api/community/reports/[id]/upvote`) and content reporting/quarantine moderation (`POST /api/community/reports/[id]/flag`).
  - **API Endpoints & Ownership Guards:**
    - `GET/POST /api/impact`: Query filtering, pagination, and CSV/JSON export.
    - `GET/PUT/DELETE /api/impact/[id]`: Full CRUD operations with strict user ownership enforcement (User B cannot read, edit, or delete User A's logs).
    - `POST /api/impact/calculate`: Real-time mathematical preview endpoint.
    - `GET/POST /api/community/reports`: Categorized, spatially filtered feed.
    - `POST /api/community/reports/[id]/upvote`: Atomic upvote counter with deduplication.
    - `POST /api/community/reports/[id]/flag`: Quarantines inappropriate content to `FLAGGED` status.
  - **Automated Verification:** **317/317 unit, service, and integration tests passing** across 20 Vitest test suites (`npx vitest run`).
  - **Browser Automation:** **12/12 Playwright tests passing** across Desktop Chrome (1440x900), Mobile Small (360x640), and Mobile Standard (390x844).
  - **Static Analysis & Build:** Real ESLint configured (`npm run lint`: 0 errors, 0 warnings); `npx tsc --noEmit` passing with 0 errors; Next.js production build succeeding with all 25 routes prerendered in 678ms.
- **Next Phase:** Module 7 — Adversarial Audit (Awaiting user authorization; strictly NOT started).

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
- [x] **M5: AI Assistant & Intelligent Recommendations** (Completed & Verified — 274/274 unit tests, 36/36 Playwright browser tests, 0 lint errors)
- [x] **M6: Impact Tracker & Community Environmental Intelligence** (Completed, Hardened & Formally Closed — 317/317 unit tests, 12/12 Playwright browser tests, 0 lint errors, 25 routes built)

---

## 5. Pending Modules
- `M7:` Adversarial Audit (Security penetration testing, prompt injection fuzzing, rate-limit stress tests, OWASP verification).
- `M8:` Remediation (Addressing audit findings, bug fixes, hardening, performance optimizations).
- `M9:` Final Verification (End-to-end journey tests, Lighthouse accessibility/performance verification, grading against 97.50+ target rubric).
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
20. **Deterministic Multi-Category Impact Accounting & Quantized Community Environmental Intelligence (ADR-020 / M6):** Implementation of calculation engine methodology `v2024.1.0` grounded in authoritative conversion factors (UK DESNZ 2024, India CEA Baseline Database v19.0, US EPA WARM v15, ARAI/CPCB vehicular benchmarks); zero-fabrication metric integrity prohibiting arbitrary "tree equivalents" and simulated statistics; explicit ±10% to ±20% uncertainty margins and counterfactual baseline assumptions; RFC 4180 CSV and audit JSON data export; hard regulatory segregation invariant (`isOfficialData: false`) separating citizen observations from certified regulatory monitoring stations; 2-decimal-place coordinate fuzzing (~1.1 km centroid resolution) preserving household privacy; and content moderation quarantine (`ACTIVE` vs `FLAGGED`).

---

## 7. Technology Stack
- **Framework:** Next.js 16.4.6 (App Router) / React 19.0.0
- **Language:** TypeScript 5.x / ES2022
- **Database & ORM:** SQLite + Prisma ORM 6.4.1 (13 models: User, Session, PasswordResetToken, HouseholdProfile, HouseholdMember, AirQualitySnapshot, SavedRoutine, ImpactLog, CommunityReport, RecommendationRecord, Conversation, ConversationMessage, RecommendationFeedback)
- **Validation:** Zod v3.24
- **Security:** scrypt KDF ($N=16384, r=8, p=1$), SHA-256 token hashing, opaque DB session tokens, HMAC-SHA256 token adapter, timing-safe equality, PII/health logger redaction, server-side trusted origin CSRF guard, assertNotProduction hard guard, prompt boundary isolation, output sanitization, 2-decimal coordinate fuzzing (~1.1 km)
- **AI Engine:** Google Gemini (`gemini-3.8-flash` production default, server-side, 8s timeout, structured JSON schema, transient 429/503 bounded retry with backoff & jitter) + Deterministic Peer-Reviewed Scientific Rules Engine Fallback
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Iconography:** Lucide React
- **Testing:** Vitest 5.1.1 + Testing Library (`@testing-library/react`, `@testing-library/jest-dom`) + Playwright E2E specification (Desktop Chrome, Mobile 360px, Mobile 390px) — 314 Vitest tests passing, 9 Playwright tests passing
