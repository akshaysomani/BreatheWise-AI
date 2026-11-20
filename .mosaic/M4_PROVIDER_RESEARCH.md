# MOSAIC — BREATHEWISE AI
# MODULE M4: AIR-QUALITY PROVIDER RESEARCH & EVALUATION

**Project:** BreatheWise AI  
**Competition:** Prompt War — Challenge 6: Urban Air Quality Assistant  
**Module:** M4 — Air Quality Intelligence  
**Author:** Principal Environmental Systems Architect & Application Security Engineer  
**Date:** 2026-11-20  
**Status:** **APPROVED & BASELINED**  

---

## 1. Executive Summary & Objective

The objective of Step A is to conduct rigorous, factual discovery on atmospheric data providers for urban India (specifically Gujarat, Ahmedabad, and major urban centers), examine data provenance, licensing, API accessibility, rate limits, pollutant coverage, and establish a resilient, lawful data integration strategy for BreatheWise AI.

In accordance with competition rules:
- No scraping of HTML dashboards or private browser network calls.
- No treating missing data as zero.
- No generating synthetic numbers for live production UI.
- No assuming unverified APIs are free or unrestricted.
- Full compliance with Indian National Ambient Air Quality Standards (NAAQS) and Central Pollution Control Board (CPCB) methodology.

---

## 2. Source Investigation

### 2.1 Provider A: Central Pollution Control Board (CPCB) & CAAQMS Network
- **Official Resources:**
  - National Air Quality Index Portal: https://app.cpcbccr.com/AQIIndia
  - Technical Documentation & Final Report: https://app.cpcbccr.com/ccr_docs/FINAL-REPORT_AQI_.pdf
  - About AQI: https://app.cpcbccr.com/ccr_docs/About_AQI.pdf
  - CPCB Official NAAQS: https://www.cpcb.nic.in/displaypdf.php?id=bmF0aW9uYWwtYWlyLXF1YWxpdHktaW5kZXgvQWJvdXRfQVFJLnBkZg
- **Network Architecture:**
  - Operates the Continuous Ambient Air Quality Monitoring Station (CAAQMS) network across India (>400 stations).
  - Stations monitor up to 8 criteria pollutants: PM2.5, PM10, NO2, SO2, CO, O3, NH3, Pb.
- **Data Access Mechanisms:**
  - Public web interface (`app.cpcbccr.com/AQIIndia`) provides rendered HTML/SVG maps and client-side charts.
  - **Legal / Terms Constraint:** CPCB does NOT offer a publicly documented, unauthenticated open REST API for direct third-party commercial software consumption on `cpcbccr.com`. Reverse-engineering private session-gated browser endpoints violates CPCB terms of service and competition guidelines.
  - **Sanctioned Path:** CPCB officially publishes its verified CAAQMS real-time observations through the Government of India's Open Government Data (OGD) Platform at `data.gov.in`.

### 2.2 Provider B: Open Government Data (OGD) Platform India (`data.gov.in`)
- **Resource Title:** *"Real-time Air Quality Index from various locations"*
- **Catalog URL:** https://www.data.gov.in/catalog/real-time-air-quality-index
- **Publisher:** Central Pollution Control Board (CPCB), Ministry of Environment, Forest and Climate Change (MoEFCC).
- **Update Frequency:** Hourly rolling updates.
- **Data Fields Provided:**
  - `country`, `state`, `city`, `station` (Station Name)
  - `latitude`, `longitude` (Station Coordinates)
  - `last_update` (Timestamp in IST format `DD-MM-YYYY HH:mm:ss`)
  - `pollutant_id` (`PM2.5`, `PM10`, `NO2`, `NH3`, `SO2`, `CO`, `OZONE`, `PB`)
  - `pollutant_min`, `pollutant_max`, `pollutant_avg` (Numeric concentration)
- **API Requirements:** Requires an API key generated from an authenticated `data.gov.in` account (`api-key` query parameter).
- **Licensing & Usage Terms:**
  - Published under the **Government Open Data License - India (GODL)**.
  - Grants worldwide, royalty-free, non-exclusive license to use, adapt, and distribute data.
  - Mandatory Attribution: *"Source: Central Pollution Control Board (CPCB), published via Open Government Data (OGD) Platform India."*
- **Rate Limits & Operational Reliability:**
  - Subject to government portal maintenance windows, periodic 503 service unavailabilities, and daily query quotas (typically 10,000 calls/day).

### 2.3 Provider C: OpenAQ API v3
- **Official Documentation:**
  - API Reference: https://docs.openaq.org/api
  - Rate Limits: https://docs.openaq.org/using-the-api/rate-limits
  - Terms of Use: https://docs.openaq.org/about/terms
  - Data Licenses: https://docs.openaq.org/resources/licenses
- **Architecture (v3 Specification):**
  - RESTful API operating on base URL `https://api.openaq.org/v3`.
  - Hierarchical structure: `locations` -> `sensors` -> `measurements`.
  - Authentication: Requires API Key passed via HTTP header `X-API-Key`.
  - Core Endpoints:
    - Discovery: `GET /v3/locations?iso=IN&limit=100` (Filters stations by country code).
    - Spatial Search: `GET /v3/locations?coordinates={lat},{lon}&radius={meters}`.
    - Station Details: `GET /v3/locations/{locations_id}`.
    - Latest Readings: `GET /v3/locations/{locations_id}/latest`.
    - Time-series Aggregations: `GET /v3/sensors/{sensors_id}/hours`.
- **Licensing & Attribution:**
  - OpenAQ data is aggregated from official government feeds (including CPCB/India) and licensed under Open Data Commons Open Database License (ODbL) or original government source licenses.
  - Mandatory Attribution: *"Air quality data provided by OpenAQ (openaq.org) and upstream monitoring agencies."*
- **Rate Limits & Free Tier Restrictions:**
  - Free registered tier: Up to 60 requests/minute.
  - HTTP 429 returned when exceeded with standard `Retry-After` headers.
- **Coverage in India:**
  - Ingests CPCB, state pollution control boards (SPCBs), and US Department of State embassy sensors across India.
  - Extensive coverage in Delhi NCT, Gujarat (Ahmedabad, Surat, Gandhinagar), Maharashtra (Mumbai, Pune), Karnataka (Bengaluru), and other major urban agglomerations.

---

## 3. Geographic Monitoring Coverage: Gujarat & Ahmedabad

Real-world monitoring coverage was analyzed for Gujarat and Ahmedabad to verify station distribution:

| Location | Station Identifier / Name | Operating Agency | Coordinates (Approx) | Monitored Pollutants | Status |
|---|---|---|---|---|---|
| **Ahmedabad** | Maninagar, Ahmedabad | GPCB / CPCB | 23.0039° N, 72.6022° E | PM2.5, PM10, NO2, SO2, CO, O3 | **Active** |
| **Ahmedabad** | GIDC Vatva, Ahmedabad | GPCB / CPCB | 22.9575° N, 72.6322° E | PM2.5, PM10, NO2, SO2, CO | **Active** |
| **Ahmedabad** | Chandkheda, Ahmedabad | IITRAM / GPCB | 23.1077° N, 72.5857° E | PM2.5, PM10, NO2, O3 | **Active** |
| **Gandhinagar** | Sector 24, Gandhinagar | GPCB | 23.2500° N, 72.6500° E | PM2.5, PM10, NO2, SO2, CO | **Active** |
| **Surat** | Sachin GIDC, Surat | GPCB / CPCB | 21.0850° N, 72.8650° E | PM2.5, PM10, NO2, SO2 | **Active** |
| **Surat** | Central Bus Station, Surat | GPCB | 21.2050° N, 72.8400° E | PM2.5, PM10, NO2, CO | **Active** |
| **New Delhi** | Anand Vihar, New Delhi | DPCC / CPCB | 28.6476° N, 77.3158° E | PM2.5, PM10, NO2, SO2, CO, O3, NH3, Pb | **Active** |
| **New Delhi** | IGI Airport (T3), New Delhi | IMD / SAFAR | 28.5562° N, 77.1000° E | PM2.5, PM10, NO2, CO, O3 | **Active** |

### Geographic Availability Finding:
Not all neighborhoods have a localized sensor. In suburban or non-industrial zones, the nearest official CAAQMS station may be 8–25 km away. The application **must never** pretend an 18 km distant station represents the user's localized living room or immediate street corner. Station distance, station name, and measurement freshness must be displayed explicitly.

---

## 4. Provider Evaluation & Decision Matrix

| Provider | Verified API Access | Coverage | Freshness | Licensing | Attribution | Rate Limits | Decision |
|---|---|---|---|---|---|---|---|
| **OpenAQ API v3** | **Yes** (Standard REST API, `X-API-Key` auth) | High (India nationwide, Gujarat, Delhi) | Hourly / Real-time | ODbL / Open Data Commons | Required ("OpenAQ & upstream providers") | 60 req/min (Free tier) | **SELECTED (Primary Provider)** |
| **Data.gov.in (OGD CPCB)** | **Yes** (REST API, `api-key` query auth) | High (All official CPCB CAAQMS stations) | Hourly rolling | GODL India (Open Gov License) | Required ("Source: CPCB / data.gov.in") | ~10k req/day | **SELECTED (Secondary / Fallback Provider)** |
| **Direct CPCB (`cpcbccr.com`)** | **No** (Undocumented web app only) | Authoritative (Origin source) | Real-time | Web portal copyright (No commercial API) | N/A | Scraping disallowed | **REJECTED (Legal/ToS Violation to Scrape)** |
| **Open-Meteo Air Quality** | **Yes** (Free REST API) | Global (Reanalysis & forecast models) | Hourly forecast | CC BY 4.0 | Required ("Open-Meteo") | 10k req/day | **RESERVED FOR FORECASTS (M4 physical modeling only)** |

### Final Architecture Decision:
1. **Primary Live Provider:** **OpenAQ API v3** (`https://api.openaq.org/v3`) utilizing standard location discovery (`GET /v3/locations`) and latest sensor telemetry (`GET /v3/locations/{id}/latest`).
2. **Secondary Live Provider:** **Data.gov.in CPCB CAAQMS API** adapter as an authoritative government fallback.
3. **Provider-Agnostic Abstraction:** Implement an `AirQualityProvider` interface so that OpenAQ, Data.gov.in, and offline fallback fixtures map to identical canonical domain models.
4. **Honest "No Data" Experience:** When upstream providers are offline, rate-limited, or when no station exists within 50 km, the system displays a transparent `NO_NEARBY_STATION` or `PROVIDER_UNAVAILABLE` status without fabricating synthetic readings.
