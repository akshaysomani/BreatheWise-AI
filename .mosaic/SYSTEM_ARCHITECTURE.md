# BreatheWise AI — System Architecture & Component Specification
**Document ID:** ARCH-001  
**Module:** M0 Discovery & Architecture  
**Date:** 2026-11-20  

---

## 1. Architectural Philosophy & Principles
1. **Deterministic Environmental Ground Truth:** Atmospheric measurements and physical dispersion forecasts are handled exclusively through verified, deterministic services. The Generative AI model is strictly prohibited from inventing or hallucinating real-time numerical readings.
2. **Safety-First Recommendation Hierarchy:** Human biological safety strictly overrides carbon emission reduction. When outdoor air is hazardous ($PM2.5 > 250 \mu g/m^3$), the system prioritizes protection (recommending sealed indoor spaces or filtered transit) over active transit (walking/cycling).
3. **Auditable Mathematics:** All environmental impact claims (CO2 avoided, PM2.5 reduced) are calculated using standardized, peer-reviewed conversion constants with explicit formulas and uncertainty intervals exposed to the user.
4. **Radical Data Lineage & Separation:** Certified regulatory station data is strictly isolated from subjective, crowdsourced community reports.
5. **Defensive Graceful Degradation:** When upstream APIs encounter rate limits, network timeouts, or station outages, the application degrades gracefully to cached or modeled values with explicit status flags, never crashing or displaying empty dashboards.

---

## 2. End-to-End System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Client Tier (Browser / React 19)"]
        UI_Home["Homepage & Value Prop\n(Custom SVG Hero)"]
        UI_AQI["Air Quality Radar\n(Real-Time & Hourly Forecast)"]
        UI_IAQ["Indoor Air & CADR Engine\n(Diurnal Ventilation Window)"]
        UI_Routine["Routine & Commute Optimizer\n(Inhaled vs Emitted Model)"]
        UI_AI["Explainable AI Assistant\n(Structured 6-Field Output)"]
        UI_Impact["Audit-Grade Impact Tracker\n(Formula Transparency)"]
        UI_Comm["Community Observations\n(Privacy-Preserving Fuzzing)"]
    end

    subgraph API["Application & Gateway Tier (Next.js 15 Server Handlers)"]
        GW["API Gateway & Security Guard\n(Rate Limiter, Session Auth, CSP)"]
        
        subgraph Services["Core Application Services"]
            S_AQI["Environmental Data Service\n(Normalizer & Station Matcher)"]
            S_AI["AI Orchestration Engine\n(Gemini 2.5 Flash / Pro + Zod)"]
            S_Calc["Impact & CADR Math Engine\n(Deterministic DEFRA/EPA Rules)"]
            S_User["Household Profile & Routine Service"]
            S_Comm["Community Observation Service\n(Report Isolation & Moderation)"]
        end
    end

    subgraph Cache["Data & Cache Tier"]
        MemCache["In-Memory LRU Cache\n(AQI: 15m TTL | Forecast: 60m TTL)"]
        DB[(Local SQLite Database\nPrisma ORM)]
    end

    subgraph Upstream["External Atmospheric & AI Services"]
        OpenAQ["OpenAQ API v3\n(Government Regulatory Stations)"]
        OpenMeteo["Open-Meteo Air Quality API\n(Copernicus CAMS Dispersion Forecast)"]
        GeminiAPI["Google Gemini AI Platform\n(Structured JSON Reasoning)"]
    end

    %% Interactions
    Client -->|HTTPS / JSON| GW
    GW --> Services
    
    S_AQI <--> MemCache
    S_AQI -->|Fetch Raw Stations| OpenAQ
    S_AQI -->|Fetch Hourly Model| OpenMeteo
    
    S_AI -->|Context-Augmented Prompt| GeminiAPI
    S_AI <--> S_AQI
    S_AI <--> S_User
    
    S_Calc --> S_User
    S_Calc --> S_AQI
    
    S_User <--> DB
    S_Comm <--> DB
```

---

## 3. Data Flow Architecture

### 3.1 Air Quality Ingestion & Normalization Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Household User
    participant Web as Next.js Client
    participant API as /api/aqi Route Handler
    participant Cache as In-Memory LRU Cache
    participant ExtAQ as OpenAQ / Open-Meteo
    participant Engine as AQI Normalizer

    User->>Web: Requests AQI for City or GPS Coordinates
    Web->>API: GET /api/aqi?lat=28.61&lon=77.20
    API->>Cache: Check Cache for (lat, lon, 15m window)
    alt Cache Hit
        Cache-->>API: Return Cached Normalized Payload
    else Cache Miss
        API->>ExtAQ: Fetch Station Measurements (OpenAQ) & Physical Forecast (Open-Meteo)
        ExtAQ-->>API: Raw Telemetry JSON
        API->>Engine: Normalize PM2.5, PM10, AQI Index, Timestamps
        Engine->>Engine: Verify Freshness (Flag if >180m stale)
        Engine-->>API: Standardized Environmental Context
        API->>Cache: Store in LRU Cache (15m TTL)
    end
    API-->>Web: Return Verified Air Quality State
    Web-->>User: Render Interactive Radar with Provenance Badges
```

### 3.2 AI Recommendation & Explainability Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Family Member
    participant Assistant as Assistant UI Component
    participant AI_API as /api/assistant/recommend Route
    participant DB as SQLite / Profile Store
    participant AQI_Svc as Environmental Service
    participant Gemini as Gemini AI Model
    participant Validator as Zod Schema Validator

    User->>Assistant: "Plan our Saturday morning chores & outdoor play"
    Assistant->>AI_API: POST /api/assistant/recommend { prompt, category }
    AI_API->>DB: Fetch Household Profile (Kids, Asthma, CADR capacity)
    DB-->>AI_API: Household Demographics & Sensitivity Tier
    AI_API->>AQI_Svc: Fetch Current AQI + Next 24h Dispersion Forecast
    AQI_Svc-->>AI_API: Verified Environmental Context (PM2.5=182, Peak at 08:00)
    AI_API->>AI_API: Construct Grounded System Prompt (Immutable Context)
    AI_API->>Gemini: Generate Structured Action Plan (JSON Schema)
    Gemini-->>AI_API: Raw Model Output
    AI_API->>Validator: Validate against RecommendationSchema
    alt Schema Valid
        Validator-->>AI_API: Clean Typed Recommendation
    else Schema Violation / Hallucination Detected
        Validator->>AI_API: Trigger Fallback Rule-Based Recommendation
    end
    AI_API-->>Assistant: 200 OK { action, reason, benefit, impact, uncertainty, steps }
    Assistant-->>User: Render 6-Field Explainable Recommendation Card
```

---

## 4. Component Boundaries & Responsibilities

| Component Name | Boundary Responsibility | Prohibited Actions |
|---|---|---|
| **Environmental Data Service** | Fetch, validate, normalize, and cache external atmospheric telemetry. Compute official US EPA and India NAQI piecewise index conversions. | Must NOT accept client-supplied AQI numbers. Must NOT invent readings if sensors fail. |
| **Mathematical Impact Engine** | Calculate vehicle emissions avoided, distance shifted, and room HEPA CADR requirements using deterministic formulas. | Must NOT invent arbitrary multipliers or "magical tree" claims without explicit baselines. |
| **AI Assistant Orchestrator** | Inject verified environmental context and household profiles into structured LLM prompts. Enforce Zod schema output validation. | Must NOT allow LLM to guess atmospheric readings or provide clinical medical diagnoses. |
| **Community Observation Service** | Ingest crowdsourced reports (odor, smoke, open burning). Perform geographic coordinate fuzzing (~1.1 km) for privacy. | Must NOT mix community observations with certified regulatory station feeds. |
| **Household Profile Service** | Store and retrieve family member vulnerabilities, home dimensions, and commute routes. | Must NOT expose profile details across unauthenticated sessions. |

---

## 5. Technology Stack Summary & Justification

| Layer | Chosen Technology | Version | Technical Justification |
|---|---|---|---|
| **Frontend Framework** | Next.js App Router | 15.x / React 19 | Server Components for instant SSR of air quality reports; zero client waterfall for environmental data; seamless streaming for AI recommendations. |
| **Styling & Design Tokens** | Tailwind CSS v4 + Radix UI | v4.x / Radix 1.x | Utility-first architecture with custom design tokens (`oklch` / hex) supporting the required warm-sage palette; unstyled accessible primitives guarantee WCAG AA compliance. |
| **Iconography** | Phosphor Icons & Lucide | Latest | Vector SVGs with uniform stroke width; avoids amateurish emojis in structural controls. |
| **Database & ORM** | SQLite + Prisma ORM | Prisma 6.x | Zero-config, deterministic local database ideal for competition verification; strict TypeScript types; easy migration path to PostgreSQL. |
| **Validation Engine** | Zod | 3.24.x | Runtime validation of external API responses, user inputs, and LLM structured outputs. |
| **AI Model & SDK** | Google Gemini 2.5 Flash / Pro | Google GenAI SDK | State-of-the-art structured JSON reasoning, high speed for real-time recommendations, cost efficiency, and large context window. |
| **Testing Harness** | Vitest + Playwright | Latest | Sub-second unit test execution for mathematical algorithms; automated headless browser accessibility (axe-core) and user journey testing. |
