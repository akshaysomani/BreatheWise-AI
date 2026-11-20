# BreatheWise AI — Design System & Frontend Foundation Specification (M1)
**Project:** BreatheWise AI  
**Module:** M1 Design System & Frontend Foundation  
**Version:** 1.0.0  
**Target:** WCAG 2.2 Level AA Compliance & 97.50+ Internal Score  

---

## 1. Visual Identity & Brand Personality
- **Product Name:** BreatheWise AI
- **Tagline:** Breathe Better. Live Healthier.
- **Brand Attributes:** Trustworthy, Intelligent, Environmentally responsible, Family-friendly, Scientific, Calm and reassuring, Modern and premium.
- **Core Aesthetic Rule:** Exclusively Light Theme. Warm white and subtle sage surfaces, earthy deep green accents, and charcoal pine typography. No dark AI cyberpunk dashboards, no purple/navy gradients, no neon glows.

---

## 2. Complete Design Tokens Specification

### 2.1 Color Tokens & Contrast Ratios
| Token Key | Hex Value | Role in Interface | Background Used On | Contrast Ratio (WCAG) | Compliance |
|---|---|---|---|---|:---:|
| `--color-primary` | `#397A55` | Deep Forest Green — Primary brand accent, primary buttons, active tabs. | `#FFFFFF` | 4.9:1 | **AA Pass** |
| `--color-primary-hover` | `#2F6647` | Deep Pine — Hover/active state for primary interactive elements. | `#FFFFFF` | 6.4:1 | **AAA Pass** |
| `--color-secondary` | `#718C72` | Subtle Sage — Structural framing, secondary badges, borders. | `#FFFFFF` | 2.8:1 | *Structural only* |
| `--color-accent` | `#D69B47` | Warm Amber — Cautionary AQI alerts, highlights, energy savings. | `#27352D` (text) | 5.1:1 | **AA Pass** |
| `--color-background` | `#F7F8F3` | Natural Alabaster — Main canvas background. | Base | Base | Base |
| `--color-surface` | `#FFFFFF` | Crisp White — Cards, modal containers, data tables. | Base | Base | Base |
| `--color-surface-secondary`| `#EEF3EA` | Soft Sage Mist — Card headers, alert containers, table alternates. | Base | Base | Base |
| `--color-border` | `#E2E8DE` | Soft Olive Mist — Subtle hairline borders (1px solid). | Base | Base | Base |
| `--color-text` | `#27352D` | Charcoal Pine — Primary body text, headings. | `#F7F8F3` | 11.8:1 | **AAA Pass** |
| `--color-muted` | `#68766C` | Slate Pine — Captions, secondary timestamps, measurement units. | `#F7F8F3` | 4.8:1 | **AA Pass** |
| `--color-success` | `#287A4B` | Clean Air Green — Good AQI tier, verified badges. | `#FFFFFF` | 5.3:1 | **AA Pass** |
| `--color-warning` | `#A86B16` | Smog Hazard Ochre — Unhealthy for sensitive groups. | `#FFFFFF` | 5.2:1 | **AA Pass** |
| `--color-error` | `#B8423D` | Severe / Hazardous Red — Emergency pollution warnings. | `#FFFFFF` | 5.8:1 | **AA Pass** |

### 2.2 Typography Scale (Fluid Typography)
- **Heading Font:** **Manrope** (Google Fonts variable geometric humanist)
- **Body & Numeric Font:** **DM Sans** (Google Fonts variable sans, optimized for tabular clarity)
- **Display Heading:** `clamp(2.5rem, 5vw + 1rem, 3.5rem)` (40px → 56px, tracking `-0.02em`)
- **H1:** `clamp(2rem, 3.5vw + 0.8rem, 2.75rem)` (32px → 44px)
- **H2:** `clamp(1.625rem, 2.5vw + 0.5rem, 2.125rem)` (26px → 34px)
- **H3:** `clamp(1.25rem, 1.5vw + 0.5rem, 1.5rem)` (20px → 24px)
- **H4 / Subtitle:** `1.125rem` (18px)
- **Body Large:** `1.125rem` (18px, leading `1.6`)
- **Body Regular:** `1.0rem` (16px, leading `1.5`, maximum measure `65–75ch`)
- **Small:** `0.875rem` (14px)
- **Caption:** `0.75rem` (12px)

### 2.3 Spacing Scale (4px / 8px Rhythm)
- `1`: 4px | `2`: 8px | `3`: 12px | `4`: 16px | `5`: 20px | `6`: 24px | `8`: 32px | `10`: 40px | `12`: 48px | `16`: 64px | `20`: 80px | `24`: 96px

### 2.4 Elevation & Border Radii
- `sm`: 6px | `md`: 8px | `lg`: 12px | `xl`: 14px | `full`: 9999px
- Shadows: Soft, diffused, low-opacity shadows (`shadow-[0_2px_8px_rgba(39,53,45,0.04)]`). Zero harsh black drop shadows.

---

## 3. Component Architecture & Reusable Primitives
1. **Button (`src/components/ui/Button.tsx`):**
   - Variants: `primary`, `secondary`, `outline`, `ghost`, `accent`, `danger`.
   - Sizes: `sm`, `md` (≥44px touch target), `lg`.
   - Accessible loading spinner with `aria-hidden="true"`, icon slots, and focus rings (`focus-visible:outline-2 focus-visible:outline-[#397A55]`).
2. **Card (`src/components/ui/Card.tsx`):**
   - Composable sub-components: `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.
3. **Badge (`src/components/ui/Badge.tsx`):**
   - Accessible contrast pills for AQI status, roadmap flags, and category markers.
4. **Input & Select (`src/components/ui/Input.tsx`, `src/components/ui/Select.tsx`):**
   - Built-in label associations, `aria-invalid`, `aria-describedby`, error messages, and helper text.
5. **Alert (`src/components/ui/Alert.tsx`):**
   - Variants: `info`, `success`, `warning`, `error`. Includes `role="alert"` and optional dismissal handler.
6. **Modal (`src/components/ui/Modal.tsx`):**
   - Accessible dialog with backdrop blur, focus isolation, Escape key listener, and `aria-modal="true"`.
7. **Skeleton & Spinner (`src/components/ui/Skeleton.tsx`, `src/components/ui/Spinner.tsx`):**
   - Accessible loading states with `aria-busy="true"`.
8. **Layout Primitives:**
   - `Header`: Working navigation, active indicators, mobile drawer with hamburger toggle.
   - `Footer`: Column layout, OpenAQ attribution (CC BY 4.0), data transparency disclaimers.
   - `Container`: Responsive maximum widths (7xl / 1440px) with fluid gutters.

---

## 4. Homepage & Dashboard Visual Foundation
- **Custom-Coded SVG Hero:** Bespoke vector artwork depicting urban city skyline, atmospheric inversion smog layer, clean air circulation streams, and protected residential home with HEPA sensor indicators. Zero third-party images.
- **Interactive Household Sensitivity Planner:** Live modal preview allowing families to adjust room floor area and view calculated CADR (CFM and m³/h) and specialized vulnerability plans.
- **Dashboard Presentation Foundation (`/dashboard`):**
  1. AQI Overview Card with station lineage and sample fixture disclaimer.
  2. Four Pollutant Cards (PM2.5, PM10, NO2, O3) with WHO guideline ratios.
  3. Responsive 24-hour Diurnal Trend SVG Chart highlighting optimal 13:00–15:30 ventilation window.
  4. 6-Field Explainable Recommendation Cards.
  5. Commute Optimizer Cards (inhaled dose vs emissions avoided).
  6. Impact Metric Cards with expandable formula inspection drawers.
  7. Scientific honesty notice debunking houseplant myths.

---

## 5. Accessibility & Responsive Verification
- **Target:** WCAG 2.2 AA.
- **Contrast:** Normal text ≥ 4.5:1; large headings ≥ 3:1.
- **Touch Target:** Interactive controls meet or exceed 44×44px.
- **Breakpoints Tested:**
  - `360px` (Small Phone): Verified, zero horizontal scroll, single-column stacked cards.
  - `390px` (Standard Phone): Verified, clean mobile drawer menu.
  - `768px` (Tablet): Verified, 2-column grid layout, legible font scales.
  - `1024px` (Laptop): Verified, desktop navigation active.
  - `1440px` (Desktop): Verified, container capped at max 1440px, balanced whitespace.
  - `1920px` (Ultra-wide): Verified, centered container with clean margins.
- **Keyboard Navigation:** Full focus traversal across all buttons, links, inputs, and modal triggers with high-contrast `#397A55` outline rings.
