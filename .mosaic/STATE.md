# MOSAIC PROJECT STATE: BreatheWise AI
**Project:** BreatheWise AI  
**Competition:** Prompt War — Challenge 6: Urban Air Quality Assistant  
**Target Score:** 97.50+ / 100  
**Current Phase:** M1 — Design System & Frontend Foundation  
**Document Version:** 1.1.0  
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
- **Current Module:** `M1 — Design System & Frontend Foundation`
- **Status:** **COMPLETED & VERIFIED**
- **Completion Evidence:**
  - Full design system implemented with exact brand tokens and Manrope + DM Sans typography pairing.
  - Reusable accessible component library built (`Button`, `Card`, `Badge`, `Input`, `Select`, `Alert`, `Modal`, `Skeleton`, `Spinner`, `EmptyState`, `ErrorState`).
  - Production-grade Homepage implemented with working navigation, custom SVG hero, 6 feature cards, 4-step workflow, trust section, and interactive household sensitivity planner.
  - Dashboard visual foundation implemented with 10 presentation elements (AQI radar, pollutant cards, 24-hr diurnal trend chart, 6-field recommendation cards, routine cards, and impact formula drawers).
  - 16/16 Vitest unit and component tests passing.
  - TypeScript type checking: 0 errors (`npx tsc --noEmit`).
  - Next.js production build (`npm run build`): Static export succeeded with 0 errors.
  - Real browser production server probe on port 3005: HTTP 200 OK for both `/` and `/dashboard`.

---

## 4. Completed Modules
- [x] **M0: Discovery & Architecture** (Approved & Verified)
- [x] **M1: Design System & Frontend Foundation** (Completed & Verified)

---

## 5. Pending Modules
- `M2:` Backend and Database (Prisma/SQLite schema, repositories, Zod validation layer, seed data, health checks).
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
2. **Design Tokens & Brand Theme (ADR-007):** Exclusively light theme. Primary `#397A55`, Primary Hover `#2F6647`, Secondary `#718C72`, Accent `#D69B47`, Background `#F7F8F3`, Surface `#FFFFFF`, Surface Secondary `#EEF3EA`, Border `#E2E8DE`, Text `#27352D`, Muted `#68766C`, Success `#287A4B`, Warning `#A86B16`, Error `#B8423D`.
3. **Typography Pairing (ADR-008):** Manrope (Headings) + DM Sans (Body and tabular figures). Replaced Inter and Poppins per competition guidelines.
4. **Custom Vector SVG Hero (ADR-009):** Custom-coded vector illustration depicting clean air circulation, city silhouette, and HEPA-protected home. Zero stock images or unverified statistics.
5. **Strict Sample Fixture Demarcation (ADR-010):** All dashboard cards in M1 carry explicit `SAMPLE FIXTURE — NOT LIVE DATA` indicators to guarantee scientific integrity before M4 API activation.

---

## 7. Technology Stack
- **Framework:** Next.js 16.4.6 (App Router, Turbopack) / React 19.0.0
- **Language:** TypeScript 5.x / ES2022
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`) with CSS custom properties
- **Iconography:** Lucide React (vector only)
- **Testing:** Vitest 5.1.1 + Testing Library (`@testing-library/react`, `@testing-library/jest-dom`)
- **Database:** SQLite + Prisma ORM (designed in M0, scheduled for M2 implementation)

---

## 8. Skills Read & Verification Status
- `design-system` (`C:\Users\Akshay\.agents\skills\design-system\SKILL.md`): **VERIFIED & READ**
- `brand` (`C:\Users\Akshay\.agents\skills\brand\SKILL.md`): **VERIFIED & READ**
- `design` (`C:\Users\Akshay\.agents\skills\design\SKILL.md`): **VERIFIED & READ**
- `ui-styling` (`C:\Users\Akshay\.agents\skills\ui-styling\SKILL.md`): **VERIFIED & READ**
- `ui-ux-pro-max` (`C:\Users\Akshay\.agents\skills\ui-ux-pro-max\SKILL.md`): **VERIFIED & READ**
- `impeccable` (`C:\Users\Akshay\.agents\skills\impeccable\SKILL.md`): **VERIFIED & READ**
- `banner-design` (`C:\Users\Akshay\.agents\skills\banner-design\SKILL.md`): **VERIFIED & READ**

---

## 9. Security & Accessibility Audit Findings (M1)
- **Dependency CVEs:** `npm audit` reports **0 vulnerabilities**. Upgraded to patched Next.js release.
- **Frontend Secrets:** 0 exposed keys in frontend bundles. Only server-side placeholders in `.env.example`.
- **Accessibility:** WCAG 2.2 AA compliant. Text contrast is 11.8:1 for body copy on `#F7F8F3` (AAA Pass), 4.9:1 for primary `#397A55` on `#FFFFFF` (AA Pass). All interactive buttons have ≥44px touch targets. Skip-to-content landmark implemented.
- **Responsive Fluid Layouts:** Tested across 360px, 390px, 768px, 1024px, 1440px, and 1920px. Zero horizontal overflow.

---

## 10. Automated Test Results
- **Vitest Unit & Component Tests:** 16 passed, 0 failed (Duration: ~280ms).
- **TypeScript Compilation:** Passed with 0 errors (`npx tsc --noEmit`).
- **Production Build:** Static page generation succeeded for `/`, `/_not-found`, and `/dashboard`.
- **Local Server Probe:** HTTP 200 OK on both `/` and `/dashboard`.

---

## 11. Files Created or Modified in M1
- `package.json` (Configured dependencies and build/test scripts)
- `tsconfig.json` (Configured path aliases, strict mode, types for Vitest)
- `next.config.mjs` (Configured Next.js compiler settings)
- `postcss.config.mjs` (Configured `@tailwindcss/postcss`)
- `vitest.config.ts` (Configured Vitest with jsdom and `@vitejs/plugin-react`)
- `src/test/setup.ts` (Configured `@testing-library/jest-dom/vitest`)
- `src/lib/utils.ts` (Utility helper `cn` with clsx and tailwind-merge)
- `src/lib/tokens.ts` (Design tokens for colors, typography, spacing, AQI tiers)
- `src/app/globals.css` (Tailwind v4 tokens, base typography, focus outlines, motion rules)
- `src/app/layout.tsx` (Root layout with header, footer, viewport, skip-link)
- `src/app/page.tsx` (Production homepage with hero, features, workflow, trust, interactive modal)
- `src/app/dashboard/page.tsx` (Dashboard visual foundation with 10 presentation elements)
- `src/components/layout/Container.tsx` (Responsive max-width container primitive)
- `src/components/layout/Header.tsx` (Sticky header, navigation, active links, mobile drawer)
- `src/components/layout/Footer.tsx` (Footer with OpenAQ attribution, science links, privacy notice)
- `src/components/home/HeroIllustration.tsx` (Custom vector SVG artwork for city/air/home)
- `src/components/ui/Button.tsx` (Accessible button with 6 variants, 3 sizes, loading states)
- `src/components/ui/Card.tsx` (Card container with header, title, description, content, footer)
- `src/components/ui/Badge.tsx` (Accessible badge pills for statuses and tiers)
- `src/components/ui/Input.tsx` (Accessible input with labels, icons, error messages)
- `src/components/ui/Select.tsx` (Accessible select with options and error states)
- `src/components/ui/Alert.tsx` (Alert box with role="alert" and dismiss handler)
- `src/components/ui/Modal.tsx` (Accessible dialog with escape key, focus trap, and backdrop)
- `src/components/ui/Skeleton.tsx` (Loading state primitives with aria-busy)
- `src/components/ui/Spinner.tsx` (Loading spinner with accessible role="status")
- `src/components/ui/EmptyState.tsx` (Empty state UI with icon, title, description, action)
- `src/components/ui/ErrorState.tsx` (Error state UI with retry trigger)
- `src/components/dashboard/AqiOverview.tsx` (AQI number, severity badge, station metadata)
- `src/components/dashboard/PollutantCard.tsx` (PM2.5, PM10, NO2, O3 cards with WHO limits)
- `src/components/dashboard/TrendChart.tsx` (Responsive pure SVG 24-hr diurnal trend chart)
- `src/components/dashboard/ExplainableRecommendationCard.tsx` (6-field explainability card)
- `src/components/dashboard/RoutineCard.tsx` (Commute optimization: Inhaled dose vs CO2 avoided)
- `src/components/dashboard/ImpactMetricCard.tsx` (Audit-grade impact metric with formula drawer)
- `src/test/components.test.tsx` (16 automated unit/component tests)
- `scripts/probe-server.mjs` (Automated browser production server probe script)
- `.mosaic/DESIGN_SYSTEM.md` (Detailed design system and frontend foundation specification)
- `.mosaic/STATE.md` (Updated state ledger)

---

## 12. Known Limitations
- The air quality figures and recommendations displayed on `/dashboard` are labeled development fixtures. Real-time API telemetry and physical forecasting engines are scheduled for activation in Module M4; AI recommendation reasoning is scheduled for M5.

---

## 13. Exact Next Authorized Module
- **`M2 — Backend and Database`**
- Do NOT begin M2 until authorized by user / MOSAIC prompt.
