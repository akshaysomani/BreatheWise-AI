# BreatheWise AI — Data Models & API Specifications
**Document ID:** SPEC-001  
**Module:** M0 Discovery & Architecture  
**Date:** 2026-11-20  

---

## 1. Database Schema Design (Prisma / SQLite)

The database schema is designed for deterministic local development via SQLite, with full compatibility for seamless migration to PostgreSQL for cloud production.

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ----------------------------------------------------
// 1. Authentication & User Management
// ----------------------------------------------------

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String
  name          String?
  role          String    @default("USER") // "USER" | "ADMIN"
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  household     HouseholdProfile?
  savedRoutines SavedRoutine[]
  impactLogs    ImpactLog[]
  reports       CommunityReport[]

  @@index([email])
}

// ----------------------------------------------------
// 2. Household & Environmental Sensitivity Profile
// ----------------------------------------------------

model HouseholdProfile {
  id              String    @id @default(uuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  city            String
  neighborhood    String?
  latitude        Float
  longitude       Float
  
  homeType        String    // "APARTMENT" | "STANDALONE_HOUSE" | "MULTI_STORY"
  floorAreaSqFt   Float     // Used for HEPA CADR calculations
  ceilingHeightFt Float     @default(9.0)
  hasHEPAFilter   Boolean   @default(false)
  hepaCADR        Float?    // Clean Air Delivery Rate in CFM
  windowSealing   String    @default("MODERATE") // "POOR" | "MODERATE" | "TIGHT"
  
  primaryCookingFuel String @default("LPG_GAS") // "LPG_GAS" | "ELECTRIC_INDUCTION" | "BIOMASS"
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  members         HouseholdMember[]
}

model HouseholdMember {
  id              String            @id @default(uuid())
  householdId     String
  household       HouseholdProfile  @relation(fields: [householdId], references: [id], onDelete: Cascade)
  
  nameOrAlias     String
  ageGroup        String            // "INFANT" | "CHILD" | "ADULT" | "SENIOR"
  hasAsthma       Boolean           @default(false)
  hasHeartCondition Boolean         @default(false)
  isPregnant      Boolean           @default(false)
  outdoorHoursPerDay Float          @default(1.0)
  
  createdAt       DateTime          @default(now())

  @@index([householdId])
}

// ----------------------------------------------------
// 3. Environmental Telemetry & Snapshot Cache
// ----------------------------------------------------

model AirQualitySnapshot {
  id              String    @id @default(uuid())
  latitude        Float
  longitude       Float
  stationId       String?
  stationName     String?
  sourceProvider  String    // "OPENAQ" | "OPEN_METEO" | "CPCB"
  
  aqiValue        Int
  aqiCategory     String    // "GOOD" | "MODERATE" | "UNHEALTHY_SENSITIVE" | "UNHEALTHY" | "VERY_UNHEALTHY" | "HAZARDOUS"
  dominantPollutant String  // "PM2.5" | "PM10" | "NO2" | "O3"
  
  pm25            Float?    // µg/m³
  pm10            Float?    // µg/m³
  no2             Float?    // µg/m³
  o3              Float?    // µg/m³
  
  measurementTimestamp DateTime
  fetchedAt       DateTime  @default(now())
  isStale         Boolean   @default(false)

  @@index([latitude, longitude])
  @@index([fetchedAt])
}

// ----------------------------------------------------
// 4. Daily Routines & Commute Optimization
// ----------------------------------------------------

model SavedRoutine {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title           String    // e.g. "Work Commute", "School Drop-off"
  origin          String
  destination     String
  distanceKm      Float
  departureTime   String    // e.g. "08:30"
  returnTime      String?   // e.g. "17:30"
  
  baselineMode    String    // "SOLO_CAR" | "MOTORCYCLE" | "BUS" | "METRO" | "BICYCLE"
  optimizedMode   String?
  
  estimatedDoseReduction Float? // % reduction in inhaled PM2.5
  estimatedCO2SavingsKg  Float? // kg CO2 avoided per trip
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([userId])
}

// ----------------------------------------------------
// 5. Audit-Grade Impact Tracking
// ----------------------------------------------------

model ImpactLog {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  actionType      String    // "COMMUTE_SHIFT" | "HEPA_PURIFICATION" | "VENTILATION_WINDOW" | "COOKING_SWITCH"
  title           String
  date            DateTime  @default(now())
  
  co2AvoidedKg    Float     // Calculated formulaic kg CO2e
  pm25AvoidedGrams Float    // Grams of primary PM2.5 avoided at source
  distanceShiftedKm Float?
  
  calculationFormula String // e.g. "14 km * (0.171 kg/km car - 0.035 kg/km metro)"
  uncertaintyMargin  Float  @default(0.15) // +/- 15%
  
  createdAt       DateTime  @default(now())

  @@index([userId, date])
}

// ----------------------------------------------------
// 6. Community Observations (Strictly Isolated)
// ----------------------------------------------------

model CommunityReport {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  reportType      String    // "VISIBLE_SMOG" | "ACRID_ODOR" | "OPEN_BURNING" | "DUST_CONSTRUCTION"
  severity        String    // "MILD" | "MODERATE" | "SEVERE"
  description     String
  
  // Geographically fuzzed coordinates (~1.1 km precision) to protect home privacy
  fuzzedLatitude  Float
  fuzzedLongitude Float
  neighborhood    String
  
  isOfficialData  Boolean   @default(false) // Hard architectural invariant: ALWAYS FALSE
  upvotes         Int       @default(0)
  status          String    @default("ACTIVE") // "ACTIVE" | "RESOLVED" | "FLAGGED"
  
  createdAt       DateTime  @default(now())

  @@index([fuzzedLatitude, fuzzedLongitude])
}
```

---

## 2. Mathematical Impact Models & Scientific Baselines

### 2.1 Transport Emission Reduction Model
- **Baseline Emission Factors (UK DEFRA / US EPA Standard Light Duty Passenger):**
  - Average Gasoline Passenger Car: $E_{\text{car}} = 0.171 \, \text{kg CO}_2\text{e/km}$ (and $0.015 \, \text{g PM}_{2.5}/\text{km}$ from exhaust, brake, and tyre wear).
  - Average Diesel Car: $E_{\text{diesel}} = 0.165 \, \text{kg CO}_2\text{e/km}$ (and $0.025 \, \text{g PM}_{2.5}/\text{km}$).
  - Urban Transit Bus (Average Occupancy): $E_{\text{bus}} = 0.089 \, \text{kg CO}_2\text{e/passenger-km}$.
  - Electric Heavy Rail / Metro: $E_{\text{metro}} = 0.035 \, \text{kg CO}_2\text{e/passenger-km}$.
  - Walking / Cycling: $E_{\text{active}} = 0.000 \, \text{kg CO}_2\text{e/km}$.
- **Emission Avoidance Formula:**
  $$\Delta \text{CO}_2\text{e} (\text{kg}) = d \times (E_{\text{baseline}} - E_{\text{optimized}})$$
  $$\Delta \text{PM}_{2.5} (\text{g}) = d \times (P_{\text{baseline}} - P_{\text{optimized}})$$
- **Uncertainty Bounds:** Fixed at $\pm 15\%$ to account for urban congestion idling and ambient temperature variations.

### 2.2 Indoor HEPA Clean Air Delivery Rate (CADR) Model
- **Required CADR Calculation:**
  $$\text{Target CADR (CFM)} = \frac{\text{Room Area (sq ft)} \times \text{Ceiling Height (ft)} \times \text{Target ACH}}{60}$$
  - *Standard Smog Target:* $\text{ACH} = 5.0$ (5 Air Changes per Hour).
  - *Example:* For a 200 sq ft bedroom with 9 ft ceilings:
    $$\text{Volume} = 1,800 \, \text{cu ft}$$
    $$\text{CADR required} = \frac{1,800 \times 5}{60} = 150 \, \text{CFM} \, (255 \, \text{m}^3/\text{h})$$
- **Scientific Houseplant Disclaimer:** The system programmatically disclaims claims that common indoor plants replace mechanical HEPA purifiers. Peer-reviewed literature demonstrates that residential air exchange rates ($0.5$ to $1.0 \, \text{ACH}$) overwhelm plant phytoremediation rates by multiple orders of magnitude.

---

## 3. Core API Endpoint Contracts

### 3.1 Environmental Intelligence Routes
```typescript
// GET /api/aqi?lat={number}&lon={number}&city={string}
// Response 200 OK:
interface AQIResponse {
  location: {
    city: string;
    neighborhood?: string;
    latitude: number;
    longitude: number;
  };
  current: {
    aqi: number;
    category: "GOOD" | "MODERATE" | "UNHEALTHY_SENSITIVE" | "UNHEALTHY" | "VERY_UNHEALTHY" | "HAZARDOUS";
    dominantPollutant: string;
    pollutants: {
      pm25: { value: number; unit: "µg/m³" };
      pm10: { value: number; unit: "µg/m³" };
      no2?: { value: number; unit: "µg/m³" };
      o3?: { value: number; unit: "µg/m³" };
    };
    station: {
      id: string;
      name: string;
      source: "OPENAQ" | "OPEN_METEO" | "GOVERNMENT_CPCB";
      distanceKm: number;
      timestamp: string; // ISO-8601
      isStale: boolean;  // True if > 180 min
    };
  };
  forecast: {
    available: boolean;
    provider?: "OPEN_METEO_CAMS";
    hourly: Array<{
      time: string;
      pm25: number;
      aqi: number;
      isVentilationWindow: boolean; // Flagged when AQI is at diurnal minimum
    }>;
  };
}
```

### 3.2 AI Assistant Recommendation Route
```typescript
// POST /api/assistant/recommend
// Request Body:
interface RecommendationRequest {
  category: "DAILY_ROUTINE" | "INDOOR_PURIFICATION" | "COMMUTE_PLAN" | "SUSTAINABLE_ALTERNATIVE";
  userQuery?: string;
}

// Response 200 OK (Strict Zod Schema):
interface StructuredRecommendationResponse {
  recommendationId: string;
  category: string;
  recommendedAction: string;
  scientificReason: string;
  expectedBenefit: {
    healthRiskMitigation: string;
    vulnerableGroupImpact: string;
  };
  quantifiedImpact: {
    isMeasurable: boolean;
    estimatedCO2AvoidedKg?: number;
    estimatedDoseReductionPercent?: number;
    formula?: string;
    uncertaintyStatement: string;
  };
  practicalSteps: string[];
  caveatsAndAssumptions: string[];
  disclaimer: string;
}
```

### 3.3 Indoor Air CADR Calculator Route
```typescript
// POST /api/iaq/calculate-cadr
// Request Body:
interface CADRCalculationRequest {
  roomAreaSqFt: number;
  ceilingHeightFt: number;
  targetACH?: number; // Defaults to 5.0 for smog
  currentPurifierCADR?: number;
}

// Response 200 OK:
interface CADRCalculationResponse {
  roomVolumeCuFt: number;
  targetACH: number;
  requiredCADR_CFM: number;
  requiredCADR_M3H: number;
  currentPurifierAdequate: boolean;
  actualACHWithCurrentPurifier?: number;
  ventilationRecommendation: string;
  houseplantEfficacyNotice: string;
}
```

### 3.4 Community Report Route
```typescript
// POST /api/community/reports
// Request Body:
interface CommunityReportSubmission {
  reportType: "VISIBLE_SMOG" | "ACRID_ODOR" | "OPEN_BURNING" | "DUST_CONSTRUCTION";
  severity: "MILD" | "MODERATE" | "SEVERE";
  description: string;
  latitude: number;
  longitude: number;
  neighborhood: string;
}

// Response 201 Created:
interface CommunityReportResponse {
  id: string;
  reportType: string;
  severity: string;
  neighborhood: string;
  fuzzedCoordinates: {
    lat: number;
    lon: number;
  };
  isOfficialData: false; // Invariant
  createdAt: string;
}
```

---

## 4. Multi-Level Caching & Resilience Strategy
- **Layer 1: In-Memory LRU Cache:**
  - Key: `aqi:${roundedLat}_${roundedLon}` (rounded to 1 decimal place, ~11 km grid).
  - TTL: 15 minutes for real-time readings; 60 minutes for physical dispersion forecasts.
- **Layer 2: Local SQLite Stored Snapshot:**
  - Stores the latest successful station fetch. If an external API returns HTTP 429, 500, or network timeouts, the system returns the stored snapshot with `isStale: true` and an explicit notice: `"Operating in Cached Offline Mode (Data updated 42 minutes ago)"`.
- **Layer 3: Graceful UI States:**
  - Never throw unhandled exceptions or render broken white screens. Every UI component contains an error boundary and accessible skeleton state.
