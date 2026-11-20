# MOSAIC PROJECT STATE: BreatheWise AI
**Project:** BreatheWise AI  
**Competition:** Prompt War — Challenge 6: Urban Air Quality Assistant  
**Target Score:** 97.50+ / 100  
**Current Phase:** M0 — Discovery and Architecture  
**Document Version:** 1.0.0  
**Last Updated:** 2026-11-20  

---

## 1. Project Identity
- **Name:** BreatheWise AI
- **Tagline:** Intelligent, location-aware environmental defense and low-emission family living assistant.
- **Core Mission:** Empower urban families and vulnerable individuals to navigate severe winter smog and chronic urban air pollution through hyper-localized, verified air quality intelligence, explainable daily routine optimization, scientific indoor air purification guidance, and transparent, formula-backed impact tracking.
- **Repository / Directory:** `C:\Users\Akshay\OneDrive\Desktop\Challenge 6`
- **Architectural Scope:** Production-grade full-stack web application designed for zero-hallucination environmental recommendations, strict data provenance, accessible high-contrast UI, and defensive security.

---

## 2. Competition Requirements
- **Objective:** Develop a secure, intelligent, production-quality GenAI-powered assistant that helps families and communities navigate severe winter smog and urban air pollution.
- **Core Functional Mandates:**
  1. Low-emission daily routines (commute optimization, errand chaining, active transit timing).
  2. Practical indoor air quality improvements (HEPA filtration CADR, ventilation timing, cooking source controls, debunking plant myths).
  3. Sustainable everyday alternatives (low-emission heating/cooking/transit with transparent trade-offs).
  4. Location-aware pollution safety recommendations (real-time PM2.5/PM10, vulnerable group protective actions, outdoor activity windows).
  5. Personalized household actions (tailored to family composition, asthma/respiratory risks, pets, housing type).
  6. Clear, understandable explanations of the direct impact of individual choices (formula-backed CO2 and PM2.5 avoidance, explicit uncertainty bounds).
- **Target Score Threshold:** 97.50+ / 100 based on rigorous internal engineering rubric across 10 evaluation dimensions.

---

## 3. Current Module
- **Current Authorized Module:** `M0 — Discovery and Architecture`
- **Status:** In Progress / Concluding Architecture Definition.
- **Strict Boundary:** No frontend implementation, no backend endpoints, no database migrations, no authentication code, no premature dependency installation, and no secret commits. Architectural planning and verification only.

---

## 4. Completed Modules
- None (M0 is the first module in the sequential MOSAIC pipeline).

---

## 5. Pending Modules
- `M1:` Design System and Frontend Foundation (Tailwind CSS, design tokens, warm-sage palette, typography pairing, accessible primitives, hero banner).
- `M2:` Backend and Database (Prisma/SQLite schema, CRUD repositories, Zod validation layer, seed data, health checks).
- `M3:` Authentication and Dashboard (Secure session management, household profile management, role-based controls, dashboard shell).
- `M4:` Air Quality Intelligence (Multi-provider AQI client, OpenAQ v3 integration, Open-Meteo physical forecast engine, caching layer, stale data indicators).
- `M5:` AI Assistant and Recommendations (Multi-provider LLM orchestration, structured output Zod schemas, ground-truth context injection, explainability engine).
- `M6:` Impact Tracker and Community (Mathematical emission savings calculators, verified vs community observations separation, privacy-preserving moderation).
- `M7:` Adversarial Audit (Security penetration testing, prompt injection fuzzing, rate-limit stress tests, OWASP verification).
- `M8:` Remediation (Addressing audit findings, bug fixes, hardening, performance optimizations).
- `M9:` Final Verification (End-to-end journey tests, Lighthouse accessibility/performance verification, grading against 97.50+ target rubric).

---

## 6. Architecture Decisions
1. **Monolithic Full-Stack Architecture (ADR-001):** Unified Next.js 15 App Router architecture over microservices. Eliminates inter-service network latency, serializes data contracts with end-to-end TypeScript, simplifies deployment, and eliminates distributed transaction overhead.
2. **Separation of Environmental Data Truth from AI Output (ADR-002):** Environmental data (AQI, PM2.5, PM10, timestamps, station ID) is fetched and validated strictly through deterministic backend services. The AI model is strictly prohibited from inventing or guessing current sensor readings; it acts solely as an reasoning and personalization engine over verified context.
3. **Multi-Tier Air Quality Provider with Physical Modeling (ADR-003):** 
   - Primary real-time observations: OpenAQ API v3 (authoritative government sensor aggregation).
   - Primary physical dispersion forecast: Open-Meteo Air Quality API (Copernicus CAMS & NOAA GFS aerosol models).
   - Fallback: Local synthetic cache / deterministic station interpolation with explicit "DEGRADED / STALE" UI flags.
4. **Formula-Backed Impact Math (ADR-004):** Emission reduction calculations use standard EPA/DEFRA conversion factors (kg CO2e and g PM2.5 avoided per passenger-km). Formulas, baselines, and uncertainty intervals (±15%) must be transparently exposed to the user. Arbitrary "trees planted" heuristics without explicit conversion baselines are banned.
5. **Separation of Community Observations from Official Readings (ADR-005):** User-submitted smog reports and sensory reports are stored in an isolated data table with explicit `UNVERIFIED_COMMUNITY_REPORT` classification and can never overwrite or mix with official EPA/CPCB monitoring station data.
6. **Strict Schema-Enforced AI Responses (ADR-006):** AI assistant output is constrained to JSON schemas validated via Zod, enforcing 6 mandatory explanation fields: Action, Scientific Reason, Expected Health/Environmental Benefit, Quantified Impact (if measurable), Assumptions/Uncertainty, and Step-by-Step Implementation.

---

## 7. Technology Choices
- **Runtime & Language:** Node.js v24.x LTS / TypeScript 5.x.
- **Frontend Framework:** Next.js 15 (App Router, React 19, Server Components).
- **Styling & Tokens:** Tailwind CSS v4, CSS custom properties (`oklch` / hex tokens), Radix UI accessible primitives.
- **Iconography:** Phosphor Icons (`@phosphor-icons/react`) & Lucide React (vector only, no emojis as UI controls).
- **Typography:** Fraunces (Variable Display/Editorial Serif) + Plus Jakarta Sans (Body and UI, clean tabular figures).
- **Database:** SQLite (local development and test deterministic verification) via Prisma ORM / PostgreSQL compatible migration path.
- **Validation:** Zod schema validation for all API inputs, environmental data payloads, and AI outputs.
- **AI Orchestration:** Google Gemini 2.5 Flash / 1.5 Pro via `@google/genai` or Vercel AI SDK, with configurable fallback provider (OpenAI-compatible client).
- **Testing Suite:** Vitest for high-speed unit and integration tests, Playwright for E2E browser and accessibility audits.

---

## 8. External Provider Decisions
1. **OpenAQ API (v3):** Primary real-time global monitoring feed.
   - *Status:* Verified provider; REST API with coordinates, measurement units, station attribution, and timestamps. Requires free API key for higher rate limits.
   - *Rate limits:* 60 req/min free tier. Cached with 15-minute TTL.
2. **Open-Meteo Air Quality API:** Primary genuine forecast provider.
   - *Status:* Verified provider; free tier for open/non-commercial use. Provides hourly physical forecasts for PM2.5, PM10, European AQI, US AQI based on Copernicus CAMS. No API key required for standard tier.
3. **AirNow (US EPA) / CPCB (India):** Reference benchmarks for national AQI scale normalization (US EPA AQI 0–500 scale vs India NAQI 0–500 scale).

---

## 9. Security Requirements
- **Zero Exposed Secrets:** Strict `.env.example` placeholder structure; all API keys isolated to server-side execution.
- **OWASP Top 10 Defenses:**
  - SQL Injection: Fully parameterized queries via Prisma ORM.
  - XSS: React automatic DOM escaping, strict Content Security Policy (CSP), sanitized markdown rendering via `rehype-sanitize`.
  - SSRF Protection: Air quality API fetches restricted to whitelisted domain endpoints (`api.openaq.org`, `air-quality-api.open-meteo.com`). User inputs never dictate arbitrary outbound URLs.
  - Prompt Injection Defense: System prompts strictly delimit user inputs in XML/Markdown boundary blocks; secondary verification checks outputs against safety rules; LLM has zero execution privileges.
  - IDOR Prevention: Household profile, impact log, and saved routine endpoints strictly verify authenticated session user IDs on every mutation.
  - Rate Limiting: API route level rate limiting (leaky bucket / in-memory sliding window) preventing enumeration and denial of service.

---

## 10. Known Risks & Mitigation
| Risk ID | Description | Impact | Probability | Mitigation Strategy |
|---------|-------------|--------|-------------|---------------------|
| RSK-01 | External AQI API downtime or rate limit exhaustion | High | Medium | In-memory 15-min LRU caching, graceful degradation fallback to nearest station or modeled forecast, clear "STALE DATA" UI badge. |
| RSK-02 | LLM hallucinating medical advice or fake AQI values | Critical | Medium | Decoupled architecture: system prompt receives verified JSON context; strict Zod schema validation; explicit system-level prohibition against diagnostic claims. |
| RSK-03 | User location leakage / privacy violation | High | Low | Locations stored at city/neighborhood postal code granularity; exact GPS coordinates optional and never shared publicly in community layer. |
| RSK-04 | User-submitted fake smog reports polluting data | Medium | High | Strict isolation between official monitoring data and community observations; peer upvoting and automated geographic clustering. |
| RSK-05 | Inaccurate / misleading emission claims | High | Medium | Hardcoded, peer-reviewed emission factors (DEFRA/EPA); transparent math formulas and explicit uncertainty ranges displayed. |

---

## 11. Testing Requirements
- Unit test coverage target: ≥ 90% across calculation utilities, schema validators, and data normalizers.
- Integration tests: Complete mock suites for OpenAQ, Open-Meteo, and AI generation endpoints.
- Error resilience tests: Verified handling of HTTP 429, 500, network timeouts, empty payloads, and malformed JSON.
- Accessibility: Automated axe-core / Playwright accessibility checks confirming WCAG 2.1 AA compliance (contrast ratios ≥ 4.5:1 for body text, ≥ 3:1 for large headers and interactive states).
- Security audits: Automated adversarial prompt test suite and boundary fuzzing in M7.

---

## 12. Outstanding Questions & Decisions for Future Modules
- *Decision 1 (M1):* Exact animation library preference (CSS transforms / native transitions vs Framer Motion / Motion for React).
- *Decision 2 (M3):* Session store mechanism (Iron-session / JWT cookies vs database sessions in SQLite). Recommended: Encrypted stateless HTTP-only session cookies with sliding expiration.
- *Decision 3 (M4):* Geocoding provider (Nominatim OpenStreetMap with strict caching vs client-side coordinate pass-through). Recommended: Reverse geocoding via Open-Meteo Geocoding API / Nominatim with fallback city search.

---

## 13. Files Created or Modified
- `.mosaic/STATE.md` (Created — current system state and architecture ledger)
- `.mosaic/M0_DISCOVERY_AND_ARCHITECTURE.md` (Created — comprehensive M0 master deliverable)
- `.mosaic/SYSTEM_ARCHITECTURE.md` (Created — system data flows, component diagrams, and boundaries)
- `.mosaic/SECURITY_THREAT_MODEL.md` (Created — threat model covering 16 vectors and mitigation matrix)
- `.mosaic/DATA_AND_API_SPEC.md` (Created — database schemas, API specs, and provider evaluation)

---

## 14. Next Authorized Action
- **Awaiting User / MOSAIC Prompt Authorization to proceed to M1 (Design System and Frontend Foundation).**
- Do NOT proceed to M1 implementation until explicitly instructed.
