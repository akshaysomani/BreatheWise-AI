import { householdRepository } from '@/repositories/household.repository';
import { routineRepository } from '@/repositories/routine.repository';
import { airQualityRepository } from '@/repositories/air-quality.repository';
import { householdService } from '@/services/household.service';
import {
  AiContextPayload,
  EnvironmentalContext,
  HouseholdContext,
  RoutineContext,
} from './types';
import { ProvenanceType, TelemetryProvenanceStatus } from '@/lib/air-quality/types';

/**
 * Builds an anonymized, context-minimized, strictly typed context object for the AI assistant.
 * 
 * PRIVACY & MINIMIZATION RULES:
 * 1. User full names and email addresses are NEVER passed into the AI context.
 * 2. Geocoordinates are quantized to 2 decimal places (~1.1 km precision) to protect exact home location.
 * 3. Only verified telemetry is represented as measured facts; unmonitored pollutants or missing
 *    stations are honestly reported as null / NO_DATA.
 */
export async function buildAssistantContext(
  userId: string,
  coords?: { lat: number; lon: number }
): Promise<AiContextPayload> {
  // 1. Fetch Household Profile & Members
  const householdProfile = await householdRepository.getByUserId(userId);
  let householdContext: HouseholdContext;

  if (householdProfile) {
    const cadr = householdService.calculateCadrRequirements(
      householdProfile.floorAreaSqFt,
      householdProfile.ceilingHeightFt,
      householdProfile.hepaCADR
    );

    const vulnerability = householdService.evaluateVulnerabilityTier(
      householdProfile.members || []
    );

    const hasAsthmaOrRespiratory = (householdProfile.members || []).some(
      (m) => m.hasAsthma || m.hasHeartCondition
    );
    const hasInfantOrPediatric = (householdProfile.members || []).some(
      (m) => m.ageGroup === 'INFANT' || m.isPregnant
    );
    const hasSeniorMember = (householdProfile.members || []).some(
      (m) => m.ageGroup === 'SENIOR'
    );

    householdContext = {
      hasProfile: true,
      city: householdProfile.city,
      coarseLocation: `${Math.round(householdProfile.latitude * 100) / 100}°N, ${
        Math.round(householdProfile.longitude * 100) / 100
      }°E`,
      homeType: householdProfile.homeType,
      roomVolumeCuFt: cadr.roomVolumeCuFt,
      targetACH: cadr.targetACH,
      requiredCADR_CFM: cadr.requiredCADR_CFM,
      hasHEPAFilter: householdProfile.hasHEPAFilter,
      currentPurifierCADR: householdProfile.hepaCADR || null,
      purifierCapacityStatus: cadr.isCurrentPurifierAdequate
        ? 'ADEQUATE'
        : cadr.deficitCADR_CFM > 0
        ? 'DEFICIT'
        : 'UNKNOWN',
      cadrDeficitCFM: cadr.deficitCADR_CFM,
      primaryCookingFuel: householdProfile.primaryCookingFuel,
      vulnerabilityTier: vulnerability.tier,
      vulnerabilityLabel: vulnerability.label,
      indoorPM25Target: vulnerability.indoorPM25Target,
      vulnerableMemberCount: (householdProfile.members || []).length,
      hasAsthmaOrRespiratory,
      hasInfantOrPediatric,
      hasSeniorMember,
    };
  } else {
    householdContext = {
      hasProfile: false,
      city: null,
      coarseLocation: null,
      homeType: null,
      roomVolumeCuFt: null,
      targetACH: 4.0,
      requiredCADR_CFM: null,
      hasHEPAFilter: false,
      currentPurifierCADR: null,
      purifierCapacityStatus: 'UNKNOWN',
      cadrDeficitCFM: 0,
      primaryCookingFuel: null,
      vulnerabilityTier: 'STANDARD_HOUSEHOLD',
      vulnerabilityLabel: 'Standard Urban Living',
      indoorPM25Target: 20.0,
      vulnerableMemberCount: 0,
      hasAsthmaOrRespiratory: false,
      hasInfantOrPediatric: false,
      hasSeniorMember: false,
    };
  }

  // 2. Fetch User Commute Routines
  const routines = await routineRepository.getByUserId(userId);
  const routineContext: RoutineContext = {
    savedRoutinesCount: routines.length,
    routes: routines.map((r) => ({
      title: r.title,
      origin: r.origin,
      destination: r.destination,
      distanceKm: r.distanceKm,
      baselineMode: r.baselineMode,
      optimizedMode: r.optimizedMode,
      estimatedDoseReduction: r.estimatedDoseReduction,
      estimatedCO2SavingsKg: r.estimatedCO2SavingsKg,
    })),
  };

  // 3. Resolve Environmental AQI Telemetry
  // Target coordinates: explicit query coords -> household coords -> default null
  const targetLat = coords?.lat ?? householdProfile?.latitude;
  const targetLon = coords?.lon ?? householdProfile?.longitude;

  let environmentalContext: EnvironmentalContext;

  if (targetLat !== undefined && targetLon !== undefined) {
    // Look for latest local snapshot
    const latestSnapshot = await airQualityRepository.getLatestByLocation(
      targetLat,
      targetLon,
      180 // 3 hours window
    );

    if (latestSnapshot) {
      const now = Date.now();
      const ageMs = now - latestSnapshot.measurementTimestamp.getTime();
      const isFresh = ageMs <= 2 * 60 * 60 * 1000;
      const isCached = ageMs <= 24 * 60 * 60 * 1000;
      const freshnessState = isFresh ? 'FRESH' : isCached ? 'CACHED' : 'STALE';

      const pollutants: EnvironmentalContext['pollutants'] = {};
      if (latestSnapshot.pm25 !== null) {
        pollutants['PM2.5'] = {
          concentration: latestSnapshot.pm25,
          unit: 'µg/m³',
          subIndex: null,
          averagingPeriodHours: 24,
        };
      }
      if (latestSnapshot.pm10 !== null) {
        pollutants['PM10'] = {
          concentration: latestSnapshot.pm10,
          unit: 'µg/m³',
          subIndex: null,
          averagingPeriodHours: 24,
        };
      }
      if (latestSnapshot.no2 !== null) {
        pollutants['NO2'] = {
          concentration: latestSnapshot.no2,
          unit: 'µg/m³',
          subIndex: null,
          averagingPeriodHours: 24,
        };
      }
      if (latestSnapshot.co !== null) {
        pollutants['CO'] = {
          concentration: latestSnapshot.co,
          unit: 'mg/m³',
          subIndex: null,
          averagingPeriodHours: 8,
        };
      }
      if (latestSnapshot.o3 !== null) {
        pollutants['O3'] = {
          concentration: latestSnapshot.o3,
          unit: 'µg/m³',
          subIndex: null,
          averagingPeriodHours: 8,
        };
      }

      environmentalContext = {
        aqi: latestSnapshot.aqiValue,
        standard:
          latestSnapshot.completenessHours >= 16
            ? 'CPCB_NAQI'
            : 'ACUTE_1_HOUR_PROXY',
        category: latestSnapshot.aqiCategory,
        status: 'AVAILABLE',
        provenance: latestSnapshot.provenanceType as TelemetryProvenanceStatus,
        isLive: latestSnapshot.provenanceType === 'VERIFIED_EXTERNAL_OBSERVATION' && isFresh,
        stationName: latestSnapshot.stationName || null,
        dominantPollutant: latestSnapshot.dominantPollutant || 'PM2.5',
        pollutants,
        observationTimeUtc: latestSnapshot.measurementTimestamp.toISOString(),
        freshnessState,
        averagingNotice:
          latestSnapshot.completenessHours >= 16
            ? 'Meets certified CPCB data completeness (>=16 valid observation hours in 24h cycle).'
            : 'Short-term acute 1-hour sensor proxy for immediate exposure mitigation. Does not represent certified 24-hour CPCB regulatory compliance.',
      };
    } else {
      // Query recent history without age limit if available
      const history = await airQualityRepository.getRecentHistory(targetLat, targetLon, 1);
      if (history.length > 0) {
        const hist = history[0];
        environmentalContext = {
          aqi: hist.aqiValue,
          standard: 'ACUTE_1_HOUR_PROXY',
          category: hist.aqiCategory,
          status: 'AVAILABLE',
          provenance: hist.provenanceType as TelemetryProvenanceStatus,
          isLive: false,
          stationName: hist.stationName || null,
          dominantPollutant: hist.dominantPollutant || 'PM2.5',
          pollutants: {},
          observationTimeUtc: hist.measurementTimestamp.toISOString(),
          freshnessState: 'STALE',
          averagingNotice: 'Historical regional telemetry record (>3 hours old). Fresh data unavailable.',
        };
      } else {
        environmentalContext = {
          aqi: null,
          standard: 'UNAVAILABLE',
          category: 'UNAVAILABLE',
          status: 'NO_DATA',
          provenance: 'UNKNOWN_PROVENANCE',
          isLive: false,
          stationName: null,
          dominantPollutant: null,
          pollutants: {},
          observationTimeUtc: null,
          freshnessState: 'MISSING',
          averagingNotice: 'No localized air quality monitoring telemetry available for this location.',
        };
      }
    }
  } else {
    environmentalContext = {
      aqi: null,
      standard: 'UNAVAILABLE',
      category: 'UNAVAILABLE',
      status: 'NO_DATA',
      provenance: 'UNKNOWN_PROVENANCE',
      isLive: false,
      stationName: null,
      dominantPollutant: null,
      pollutants: {},
      observationTimeUtc: null,
      freshnessState: 'MISSING',
      averagingNotice: 'No location coordinates provided. Environmental context unavailable.',
    };
  }

  return {
    userId,
    environment: environmentalContext,
    household: householdContext,
    routine: routineContext,
    timestampUtc: new Date().toISOString(),
  };
}

/**
 * Serializes the EnvironmentalContext into structural XML for LLM grounding.
 */
export function formatEnvironmentXml(env: EnvironmentalContext): string {
  return `
<status>${env.status}</status>
<aqi>${env.aqi ?? 'NO_DATA'}</aqi>
<standard>${env.standard}</standard>
<category>${env.category}</category>
<dominant_pollutant>${env.dominantPollutant ?? 'NONE'}</dominant_pollutant>
<station_name>${env.stationName ?? 'UNKNOWN'}</station_name>
<provenance>${env.provenance}</provenance>
<is_live>${env.isLive}</is_live>
<freshness>${env.freshnessState}</freshness>
<observation_time>${env.observationTimeUtc ?? 'NONE'}</observation_time>
<averaging_notice>${env.averagingNotice}</averaging_notice>
<pollutants>
${Object.entries(env.pollutants || {})
  .map(
    ([code, p]) =>
      `  <pollutant code="${code}" concentration="${p.concentration}" unit="${p.unit}" averaging_period_hours="${p.averagingPeriodHours}" />`
  )
  .join('\n')}
</pollutants>
`.trim();
}

/**
 * Serializes the Household and Routine context into structural XML for LLM grounding.
 */
export function formatUserContextXml(payload: AiContextPayload): string {
  const h = payload.household;
  const r = payload.routine;

  return `
<household configured="${h.hasProfile}">
  <city>${h.city ?? 'UNSPECIFIED'}</city>
  <coarse_location>${h.coarseLocation ?? 'UNSPECIFIED'}</coarse_location>
  <home_type>${h.homeType ?? 'UNSPECIFIED'}</home_type>
  <room_volume_cuft>${h.roomVolumeCuFt ?? 'UNSPECIFIED'}</room_volume_cuft>
  <required_cadr_cfm>${h.requiredCADR_CFM ?? 'UNSPECIFIED'}</required_cadr_cfm>
  <current_hepa_cadr_cfm>${h.currentPurifierCADR ?? 'NONE'}</current_hepa_cadr_cfm>
  <purifier_adequacy>${h.purifierCapacityStatus}</purifier_adequacy>
  <cadr_deficit_cfm>${h.cadrDeficitCFM}</cadr_deficit_cfm>
  <primary_cooking_fuel>${h.primaryCookingFuel ?? 'UNSPECIFIED'}</primary_cooking_fuel>
  <vulnerability_tier>${h.vulnerabilityTier}</vulnerability_tier>
  <vulnerability_label>${h.vulnerabilityLabel}</vulnerability_label>
  <indoor_pm25_target_ug_m3>${h.indoorPM25Target}</indoor_pm25_target_ug_m3>
  <respiratory_sensitivity>${h.hasAsthmaOrRespiratory}</respiratory_sensitivity>
  <pediatric_or_maternal>${h.hasInfantOrPediatric}</pediatric_or_maternal>
  <senior_members>${h.hasSeniorMember}</senior_members>
</household>
<saved_routines count="${r?.savedRoutinesCount ?? 0}">
${(r?.routes || [])
  .map(
    (rt) =>
      `  <route title="${rt.title}" distance_km="${rt.distanceKm}" baseline_mode="${rt.baselineMode}" optimized_mode="${rt.optimizedMode ?? 'NONE'}" />`
  )
  .join('\n')}
</saved_routines>
`.trim();
}
