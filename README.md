# BreatheWise AI — Intelligent Urban Air Quality Assistant

> **"Breathe Better. Live Healthier."**  
> An evidence-based urban air quality and respiratory health protection platform combining live environmental sensor data, CPCB regulatory standards, personalized household intelligence, and generative AI guidance.

---

## 1. Project Overview & Problem Statement

Urban air pollution—particularly elevated particulate matter ($\text{PM}_{2.5}$ and $\text{PM}_{10}$) and combustion byproducts ($\text{NO}_2$, $\text{CO}$, $\text{O}_3$)—presents a severe public health crisis in major metropolitan areas across India and globally. Citizens frequently face:
- **Misleading or coarse data:** Generic, city-wide averages that obscure microclimate hotspots and street-level pollution spikes.
- **Generic, non-actionable advice:** Vague recommendations that ignore personal health vulnerabilities (such as asthma, chronic respiratory illness, pediatrics, or pregnancy).
- **Persistent indoor air quality myths:** Common misconceptions (such as relying on houseplants for particulate defense, rather than true mechanical HEPA filtration).
- **Unsafe transit tradeoffs:** Commuters walking or cycling along congested corridors during severe smog episodes under the assumption of eco-friendliness, inadvertently increasing their inhaled toxic particulate dose by $3\times$ to $5\times$.

**BreatheWise AI** was developed to bridge this gap. It provides evidence-backed, scientifically grounded exposure-reduction routines, room-by-room indoor purification metrics, transparent environmental carbon avoidance calculations, and real-time conversational assistance.

---

## 2. Key Implemented Features

1. **Air Quality Radar & Real-Time Monitoring (`/air-quality`):**
   - Live localized sensor telemetry via OpenAQ API v3 integration with graceful fallback to pre-reviewed CPCB telemetry snapshots.
   - Exact Indian Central Pollution Control Board (CPCB) National Air Quality Index (NAQI) calculation across 6 statutory categories (Good, Satisfactory, Moderate, Poor, Very Poor, Severe).
   - Clear distinction between real-time acute observations (1-hour exposure proxies) and certified 24-hour regulatory compliance values.

2. **AI Air Quality Assistant (`/assistant`):**
   - Multi-turn conversational intelligence powered by Google Gemini with strict prompt injection defenses.
   - Primary production model: **Gemini 3 Flash** (`gemini-3-flash-preview`).
   - Alternative failover model: **Gemini 3.8 Flash** (`gemini-3.8-flash`).
   - Multi-turn conversation history grounding (`<CONVERSATION_HISTORY>`) preventing repetitive answers.
   - Comprehensive **13-category deterministic scientific rules engine fallback** (`provenance: 'PRE_REVIEWED_RULE'`) that operates reliably even when external API keys are unset or network budgets expire.
   - Transparent 6-field explainability contract: `action`, `reason`, `expectedBenefit`, `measurableImpact`, `assumptions`, and `uncertainty`.

3. **Personalized Household Profile & Management (`/dashboard`):**
   - Household profile configuration capturing dwelling type, room volume ($\text{cu ft}$), HEPA filter CADR rating, primary cooking fuel, and vulnerable members (infants, seniors, asthmatics).
   - Clean Air Delivery Rate (CADR) deficit calculation aligned with CDC/EPA $5.0\text{ ACH}$ (Air Changes per Hour) wildfire/smog ventilation targets.
   - Indoor particulate target guidance (striving for $\text{PM}_{2.5} \le 15\ \mu\text{g/m}^3$).

4. **Personal Impact Tracker (`/impact`):**
   - Quantitative tracking of avoided carbon emissions ($\text{kg CO}_2\text{e}$) and avoided inhaled $\text{PM}_{2.5}$ dose ($\mu\text{g}$).
   - Transparent formulas based on UK DEFRA emission factors, Indian power grid factors ($0.82\ \text{kg CO}_2/\text{kWh}$), and minute ventilation rates ($\dot{V}_E$).
   - Explicit uncertainty bounds and underlying behavioral assumptions disclosed for every logged action.

5. **Community Environmental Reporting:**
   - Hyperlocal observation submission (smog severity, industrial emissions, construction dust, waste burning).
   - Strict privacy safeguards: 2-decimal coordinate quantization (~1.1 km coarse bounding) and UTC hourly timestamp bucketing to prevent location tracking.
   - Atomic upvoting with transaction-level deduplication to eliminate race conditions.

6. **Authentication, Security & Responsive Design (`/register`, `/login`):**
   - Spacious, balanced two-column desktop registration layout (`max-w-[1240px]`).
   - Live interactive 5-point password requirements checklist (min 8 characters, uppercase, lowercase, number, special character) and dynamic 4-segment strength meter.
   - Memory-hard `scrypt` password hashing ($N=16384, r=8, p=1$).
   - Next.js 16.4.6 `proxy.ts` request guard enforcing session protection on `/dashboard`.
   - Standalone legal compliance pages: `/privacy-policy` (DPDP Act 2023 aligned) and `/terms-of-use`.

---

## 3. Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | `16.4.6` | Full-stack React framework with server components and edge proxy |
| **UI Library** | React | `19.0.0` | Declarative UI rendering |
| **Language** | TypeScript | `5.x / 7.0` | End-to-end static typing and interface contracts |
| **Database** | PostgreSQL | `>= 14 (18.4 tested)` | Relational data persistence (sole primary database) |
| **ORM** | Prisma ORM | `6.4.1` | Type-safe schema definition, migrations, and client querying |
| **Validation** | Zod | `3.24.x / 4.x` | Runtime schema validation for API inputs, models, and forms |
| **Styling** | Tailwind CSS | `4.3.5` | Utility-first styling with custom environmental palette |
| **Icons** | Lucide React | `1.77.0` | Accessible SVG iconography |
| **Unit Testing** | Vitest | `5.1.1` | Lightning-fast test runner with jsdom environment (385 tests) |
| **E2E Testing** | Playwright | `1.65.1` | Multi-viewport browser automation (Desktop, Tablet, Mobile) |

---

## 4. System Architecture & Data Flow

```mermaid
flowchart TD
    Client["Client Browser (Desktop / Tablet / Mobile)"]
    Proxy["Next.js Request Proxy (proxy.ts)"]
    Routes["API Route Handlers (/api/*)"]
    Services["Domain Services (assistant, air-quality, impact, etc.)"]
    Repositories["Data Repositories (Prisma Client)"]
    PostgreSQL[("PostgreSQL 18.4 Database")]
    GeminiClient["Gemini API Client (gemini-client.ts)"]
    GeminiAPI["Google Gemini 3 Flash / 3.8 Flash"]
    DeterministicEngine["13-Category Deterministic Fallback Engine"]
    OpenAQProvider["OpenAQ v3 Provider"]

    Client -->|HTTP Request| Proxy
    Proxy -->|Authorized| Routes
    Routes --> Services
    Services --> Repositories
    Repositories --> PostgreSQL
    Services -->|Chat Query| GeminiClient
    GeminiClient -->|Multi-Model Probe| GeminiAPI
    GeminiClient -->|Timeout / Key Unset / 503 Exhausted| DeterministicEngine
    Services -->|Air Quality Telemetry| OpenAQProvider
```

### Application Data Flow
1. **Request Intake & Guard:** Incoming requests pass through `src/proxy.ts`, which validates session cookies on protected paths (`/dashboard`) and redirects unauthenticated users safely with preserved return URLs.
2. **API Layer & Input Validation:** Route handlers validate incoming JSON bodies and query parameters using strict Zod schemas. Untrusted inputs are bounded in length and sanitized before business logic execution.
3. **Service Layer:** Domain services coordinate business rules (e.g., CPCB AQI calculation, CADR deficit estimation, carbon avoidance equations).
4. **Repository & Database:** Repositories encapsulate Prisma ORM queries to PostgreSQL with parameterized queries, preventing SQL injection and enforcing relational ownership.

---

## 5. AI Integration & Model Architecture

### 5.1 Google Gemini Models
- **Primary Production Model:** `gemini-3-flash-preview` (Gemini 3 Flash)
  - Configured via `GEMINI_MODEL="gemini-3-flash-preview"`.
  - Chosen for ultra-low latency, structured JSON output adherence, and high conversational fidelity.
- **Alternative / Failover Model:** `gemini-3.8-flash` (Gemini 3.8 Flash)
  - Configured via `GEMINI_ALTERNATIVE_MODEL="gemini-3.8-flash"`.
  - Automatically invoked if the primary model returns HTTP 404 (model retirement) within execution deadline.
- **Bounded Timeouts & Retries:** 20,000ms deadline budget. Up to 2 retries (3 total attempts) with exponential backoff and randomized jitter for transient HTTP 429/503 errors.

### 5.2 Deterministic Scientific Fallback Engine
When `GEMINI_API_KEY` is unconfigured, or when external network calls fail or time out, `src/lib/ai/deterministic-fallback.ts` immediately activates. It covers **13 distinct environmental health domains**:
1. Urgent medical triage (directing to emergency services 112)
2. Outdoor physical exertion & minute ventilation thresholds
3. Houseplant myth debunking vs. true HEPA filtration CADR
4. Respirators & masks (certified N95/FFP2/IS 9473 vs. gaseous pollutant limitations)
5. Vulnerable populations (pediatric stroller-height exhaust, seniors, asthmatics)
6. CPCB NAQI scale and statutory breakpoint interpretations
7. Criteria pollutant chemistry ($\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, $\text{O}_3$, $\text{CO}$)
8. Indoor combustion source controls (incense/agarbatti, mosquito coils, unvented LPG)
9. Acute smog symptom management (saline rinses, HEPA clean rooms)
10. Indoor mechanical purification & EPA/CDC $5.0\text{ ACH}$ CADR volume matching
11. Sustainable transit & inhaled dose trade-offs (Metro vs. curbside cycling)
12. Multi-turn follow-up resolution
13. Dynamic context-grounded greetings

Every fallback response is transparently tagged with `provenance: 'PRE_REVIEWED_RULE'`.

### 5.3 Prompt Injection & Safety Defenses
- **Boundary Delimitation:** Environmental evidence, household profile, and untrusted user queries are partitioned using structural XML delimiters (`<ENVIRONMENTAL_EVIDENCE>`, `<USER_CONTEXT>`, `<CONVERSATION_HISTORY>`, `<USER_QUERY>`).
- **Input Bounding & Neutralization:** User inputs are capped at 2,000 characters and scanned for adversarial prompt injection vectors (`DAN mode`, `ignore instructions`, `developer mode`).
- **Output Sanitization:** Model outputs are stripped of HTML/script injection tags and markdown image exfiltration URLs before rendering.

---

## 6. Scientific & Environmental Methodologies

### 6.1 CPCB National Air Quality Index (NAQI) Standard
BreatheWise AI implements the official Indian Central Pollution Control Board (2014) NAQI formula:
$$I_P = I_{lo} + \frac{I_{hi} - I_{lo}}{B_{hi} - B_{lo}} \times (C_P - B_{lo})$$
- **Overall AQI:** Calculated via the statutory Max-Operator rule: $\text{AQI} = \max(I_1, I_2, \dots, I_n)$.
- **Minimum Data Requirement:** Official 24-hour compliance requires at least 16 hours of valid monitoring across at least 3 criteria pollutants (with mandatory $\text{PM}_{2.5}$ or $\text{PM}_{10}$).
- **Short-Term Observations:** 1-hour acute observations are clearly disclosed as short-term exposure proxies, never misrepresented as certified 24-hour regulatory compliance.

### 6.2 Indoor Air Quality & Clean Air Delivery Rate (CADR)
- **Required CADR Formula:**
  $$\text{Required CADR (CFM)} = \frac{\text{Room Volume (cu ft)} \times \text{Target ACH}}{60}$$
  Standard target: $5.0\text{ ACH}$ (CDC/EPA guideline for wildfire/smog particulate defense).
- **Houseplant Myth Debunking:** The 1989 NASA Clean Air Study used sealed 0.44 $\text{m}^3$ Plexiglas chambers. In real residential spaces with natural infiltration ($0.5–1.5\text{ ACH}$), potted plants provide negligible particulate removal ($< 0.05\text{ CADR}$). Mechanical true HEPA filters (H13/H14) are mandatory for aerosol defense.

### 6.3 Carbon Avoidance & Inhaled Dose Formulas
- **Metro vs. Car Carbon Avoidance:**
  $$\Delta \text{CO}_2 = d \times (EF_{\text{car}} - EF_{\text{metro}})$$
  Where $EF_{\text{car}} = 0.170\ \text{kg CO}_2\text{e/km}$ (average passenger car) and $EF_{\text{metro}} = 0.028\ \text{kg CO}_2\text{e/passenger-km}$.
- **Inhaled Particulate Dose:**
  $$\text{Dose } (\mu\text{g}) = C_{\text{PM2.5}}\ (\mu\text{g/m}^3) \times \dot{V}_E\ (\text{m}^3/\text{min}) \times t\ (\text{min})$$
  Active cyclists experience elevated minute ventilation ($\dot{V}_E \approx 35–55\text{ L/min}$) compared to transit passengers ($\dot{V}_E \approx 10–14\text{ L/min}$). When $\text{AQI} > 150$, health protection strictly supersedes emissions reduction.

---

## 7. Database Architecture (PostgreSQL & Prisma)

The primary database is **PostgreSQL** configured through Prisma ORM (`prisma/schema.prisma`), maintaining 14 relational models:

| Model | Purpose |
| :--- | :--- |
| `User` | User accounts, roles (`USER`, `ADMIN`), and scrypt password hashes |
| `Session` | Opaque server-side session tokens with expiration tracking |
| `PasswordResetToken` | SHA-256 hashed single-use tokens for password recovery |
| `HouseholdProfile` | Residential specifications, CADR purifier capacity, and vulnerability tiers |
| `HouseholdMember` | Individual family member profiles and respiratory sensitivities |
| `AirQualitySnapshot` | Cached environmental telemetry records and CPCB pollutant sub-indices |
| `SavedRoutine` | User-curated daily transit and exercise exposure plans |
| `ImpactLog` | Quantified carbon and particulate avoidance records |
| `CommunityReport` | Hyperlocal citizen smog observations with coarse geolocations |
| `CommunityUpvote` | Upvote records with unique `(reportId, userId)` composite constraints |
| `RecommendationRecord` | Persisted AI/deterministic recommendation history |
| `Conversation` | Multi-turn conversational threads per user |
| `ConversationMessage` | Individual user and assistant messages with structured metadata |
| `RecommendationFeedback` | User helpfulness ratings on specific recommendations |

---

## 8. Authentication & Application Security

- **Password Hashing:** Implemented via Node.js native `crypto.scrypt` ($N=16384, r=8, p=1$, 32-byte salt, 64-byte key).
- **Session Security:** Opaque, high-entropy 32-byte cryptographically secure random session tokens stored in PostgreSQL; transmitted via `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
- **CSRF Defense:** Strict server-side trusted origin checking (`TRUSTED_ORIGINS` / `NEXT_PUBLIC_APP_URL`) across state-changing mutation endpoints.
- **Distributed Rate Limiting:** Sliding-window rate limiting on sensitive routes (`/api/auth/*`, `/api/assistant/chat`, `/api/community/*`) with Redis backend support and in-memory fallback.
- **Location Privacy:** Geocoordinates submitted for community reports or ambient lookups are quantized to 2 decimal places (~1.1 km resolution).
- **CSV Injection Neutralization:** Formula injection characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are escaped on user-exported tabular data.

---

## 9. Project Directory Structure

```
.
├── e2e/                             # Playwright End-to-End browser test specs
│   ├── air-quality.spec.ts          # AQI radar and station lookups
│   ├── auth.spec.ts                 # Registration, login, session persistence
│   ├── header-footer-uniqueness.spec.ts # Header and footer uniqueness across all routes
│   ├── impact-community.spec.ts     # Impact logs and community reporting
│   ├── password-checklist.spec.ts   # Live password requirements checklist
│   └── registration-layout.spec.ts  # Multi-viewport responsive layout verification
├── prisma/
│   ├── schema.prisma                # PostgreSQL schema with 14 relational models
│   └── seed.mjs                     # Database seeding script
├── scripts/                         # Database verification and data integrity scripts
│   ├── check-fk-integrity.py        # Foreign key integrity auditor
│   ├── migrate-sqlite-to-postgres.py# SQLite to PostgreSQL migration utility
│   └── verify-pg-data.mjs           # Prisma client PostgreSQL verification
├── src/
│   ├── app/                         # Next.js App Router pages and API routes
│   │   ├── about/                   # About BreatheWise AI page
│   │   ├── air-quality/             # Real-time AQI Radar page
│   │   ├── api/                     # REST API route handlers
│   │   ├── assistant/               # AI Assistant interface
│   │   ├── dashboard/               # Authenticated Household Dashboard
│   │   ├── impact/                  # Impact Tracker page
│   │   ├── login/                   # Sign In page
│   │   ├── privacy-policy/          # Statutory DPDP Act 2023 Privacy Policy
│   │   ├── register/                # Two-column registration page
│   │   ├── terms-of-use/            # Terms of Use page
│   │   ├── tips/                    # Clean Air Tips & Solutions page
│   │   ├── layout.tsx               # Root application layout
│   │   └── page.tsx                 # Landing / Home page
│   ├── components/                  # Reusable React components
│   │   ├── auth/                    # PasswordChecklist component
│   │   ├── dashboard/               # Radar, AssistantWorkspace, HouseholdManager
│   │   ├── layout/                  # Header, Footer, Container
│   │   └── ui/                      # Button, Card, Input, Alert, Modal
│   ├── lib/                         # Core utility and business logic modules
│   │   ├── ai/                      # Gemini client, context builder, prompt defense
│   │   ├── air-quality/             # CPCB AQI engine, OpenAQ v3 provider
│   │   ├── validations/             # Zod validation schemas
│   │   ├── auth-guard.ts            # Server-side authentication guard
│   │   ├── db.ts                    # Prisma Client singleton
│   │   ├── logger.ts                # Structured PII-redacting logger
│   │   └── rate-limiter.ts          # Distributed sliding-window rate limiter
│   ├── proxy.ts                     # Next.js 16 request proxy and route guard
│   ├── repositories/                # Database repository abstraction layer
│   ├── services/                    # Business logic and domain service layer
│   └── test/                        # Vitest unit and integration test suites
├── .env.example                     # Environment configuration template
├── package.json                     # Project scripts and dependencies
├── playwright.config.ts             # Playwright multi-viewport configuration
├── tsconfig.json                    # TypeScript compiler configuration
└── vitest.config.ts                 # Vitest test runner configuration
```

---

## 10. Prerequisites & Installation

### 10.1 Prerequisites
- **Node.js:** `>= 18.18.0` (Node.js 20+ recommended)
- **npm:** `>= 9.0.0`
- **PostgreSQL:** `>= 14` (PostgreSQL 18.4 verified locally)

### 10.2 Installation Steps
1. **Clone the repository:**
   ```bash
   git clone https://github.com/akshaysomani/BreatheWise-AI.git
   cd BreatheWise-AI
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Install Playwright browser binaries (for E2E tests):**
   ```bash
   npx playwright install chromium
   ```

---

## 11. Environment Variable Setup

Copy the `.env.example` template to `.env`:
```bash
cp .env.example .env
```

Populate the configuration variables in `.env`:

```env
# Node Environment
NODE_ENV="development"
PORT=3000

# Base URL & Trusted Origins (CSRF Defense)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
TRUSTED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"

# Reverse Proxy Trust (Set "true" only when behind an ingress proxy like Cloudflare/NGINX)
TRUST_PROXY="false"

# Database Configuration (PostgreSQL primary database)
# Replace USER, PASSWORD, HOST, and PORT with your PostgreSQL credentials
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/challenge_6?schema=public"

# Authentication & Session Security (Minimum 32 random characters)
SESSION_SECRET="generate-a-secure-random-32-character-secret-key-here"

# External Air Quality API Credentials (Optional)
# Obtain a free API key at https://openaq.org
OPENAQ_API_KEY=""

# Generative AI Credentials (Optional)
# Obtain from https://aistudio.google.com
GEMINI_API_KEY=""

# Primary Production Model (Gemini 3 Flash)
GEMINI_MODEL="gemini-3-flash-preview"

# Alternative / Failover Model (Gemini 3.8 Flash)
GEMINI_ALTERNATIVE_MODEL="gemini-3.8-flash"
```

> **Security Note:** Never commit `.env` or files containing live credentials to version control. The `.gitignore` file is configured to strictly exclude `.env` and `.env.*.local` files.

---

## 12. Database Setup & Migrations

1. **Ensure your PostgreSQL server is running** and that the target database exists:
   ```bash
   # Example using PostgreSQL CLI (psql):
   psql -U postgres -c "CREATE DATABASE challenge_6;"
   ```

2. **Generate the Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Synchronize the database schema:**
   ```bash
   npx prisma db push
   ```

4. **(Optional) Seed baseline data:**
   ```bash
   npm run prisma:seed # or node prisma/seed.mjs
   ```

---

## 13. Running the Application

### Development Server
Start the local Next.js development server:
```bash
npm run dev
```
Open your browser and navigate to [http://localhost:3000](http://localhost:3000).

### Production Build
To create an optimized production build:
```bash
npm run build
```
To run the production server:
```bash
npm run start
```

---

## 14. Testing Instructions

BreatheWise AI includes a comprehensive, dual-layered test suite:

### 14.1 Unit & Integration Suite (Vitest)
Executes 385 automated tests across 27 suites verifying CPCB mathematical formulas, prompt injection safety, rate limiters, scrypt hashing, and API routes:
```bash
# Run the full test suite once:
npm test

# Run tests in watch mode during development:
npm run test:watch

# Run a specific test suite:
npx vitest run src/test/password-strength-checklist.test.tsx
npx vitest run src/test/gemini-operational.test.ts
```

### 14.2 End-to-End Browser Tests (Playwright)
Validates real browser flows across Desktop (1440×900), Tablet (1024×768 / 768×1024), and Mobile (390×844 / 360×640) viewports:
```bash
# Run all Playwright E2E tests:
npx playwright test

# Run a specific E2E test file:
npx playwright test e2e/registration-layout.spec.ts
npx playwright test e2e/password-checklist.spec.ts
npx playwright test e2e/header-footer-uniqueness.spec.ts

# Run with interactive UI mode:
npx playwright test --ui
```

### 14.3 Static Analysis & Linting
```bash
# TypeScript type check:
npx tsc --noEmit

# ESLint code quality check:
npm run lint
```

---

## 15. Known Limitations & Fallback Behavior

1. **Google Gemini API Key (`GEMINI_API_KEY`):**
   - When unset or invalid, the AI Assistant does not crash or fail. It automatically delegates queries to the pre-reviewed **13-category deterministic scientific rules engine**.
   - All deterministic recommendations are clearly tagged with `provenance: 'PRE_REVIEWED_RULE'`.
2. **OpenAQ API Key (`OPENAQ_API_KEY`):**
   - OpenAQ v3 enforces strict rate limits on unauthenticated queries. If an API key is omitted, the application uses local CPCB snapshot telemetry to maintain uninterrupted guidance without fabricating values.
3. **Indian NAQI Regional Specificity:**
   - Air quality calculations use the official Indian CPCB 2014 breakpoint tables. While particulate metrics ($\text{PM}_{2.5}$, $\text{PM}_{10}$) are universally informative, regulatory AQI categorization aligns with statutory Indian standards.

---

## 16. Privacy, Security & Compliance

- **DPDP Act 2023 Alignment:** Data processing complies with India's Digital Personal Data Protection Act 2023. Explicit purpose limitation is applied to household health profiles.
- **Location Anonymization:** Exact device GPS coordinates are never stored in community observation reports; coordinates are coarsened to two decimal places (~1.1 km).
- **Zero Token Leakage:** Authentication tokens, password reset hashes, and API secrets are never emitted in application logs, error payloads, or client bundles.

---

## 17. Future Improvements (Roadmap)

The following items represent planned architectural enhancements (clearly distinguished from the current codebase):
- [ ] Integration with wearable physiological sensors (Apple HealthKit / Google Health Connect) for real-time heart rate and SpO2 correlation during smog spikes.
- [ ] Automated push notifications via Web Push API for sudden nocturnal $\text{PM}_{2.5}$ inversions.
- [ ] Bluetooth Low Energy (BLE) direct integration with smart home air purifiers for automated CADR speed adjustment.
- [ ] Multilingual voice input in major Indian regional languages (Hindi, Marathi, Bengali, Tamil, Telugu).

---

## 18. License

This project is licensed under the MIT License.
