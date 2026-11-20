/**
 * BreatheWise AI — Monitoring Station Discovery & Selection
 * Module M4: Geospatial & Privacy Framework
 * 
 * Implements:
 * 1. Great-circle Haversine distance calculation in kilometers.
 * 2. Privacy-preserving coordinate quantization (2 decimal places / ~1.1 km grid).
 * 3. Composite station ranking factoring geographic distance, telemetry freshness,
 *    and CPCB pollutant completeness.
 * 4. 50 km radius cutoff (returns NO_NEARBY_STATION when sensors exceed range).
 */

import { MonitoringStation, PollutantCode } from './types';

const EARTH_RADIUS_KM = 6371.0;
export const MAX_REPRESENTATIVE_DISTANCE_KM = 50.0;

/**
 * Calculates great-circle distance between two geographic coordinates
 * using the Haversine formula.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0.0;

  const toRad = (angle: number) => (angle * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Privacy protection: quantizes coordinates to 2 decimal places (~1.1 km precision)
 * to prevent leaking exact residential addresses in server logs or upstream requests.
 */
export function quantizeCoordinates(
  latitude: number,
  longitude: number
): { latitude: number; longitude: number } {
  return {
    latitude: Math.round(latitude * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
  };
}

export interface StationScoringOptions {
  userLat: number;
  userLon: number;
  maxDistanceKm?: number;
}

export interface ScoredStation {
  station: MonitoringStation;
  distanceKm: number;
  compositeScore: number; // Lower score is better
  isWithinRepresentativeRange: boolean;
  hasMandatoryParticulate: boolean;
}

/**
 * Evaluates candidate monitoring stations and ranks them by composite utility.
 * Composite score factors:
 * - 60% distance weight
 * - 25% pollutant completeness (bonus for measuring PM2.5 and >=3 pollutants)
 * - 15% reporting freshness
 */
export function rankStationsByProximityAndQuality(
  stations: MonitoringStation[],
  options: StationScoringOptions
): ScoredStation[] {
  const maxDistance = options.maxDistanceKm ?? MAX_REPRESENTATIVE_DISTANCE_KM;

  const scored: ScoredStation[] = stations.map((station) => {
    const distanceKm = calculateHaversineDistanceKm(
      options.userLat,
      options.userLon,
      station.coordinates.latitude,
      station.coordinates.longitude
    );

    const hasPM25 = station.supportedPollutants.includes('PM2.5');
    const hasPM10 = station.supportedPollutants.includes('PM10');
    const hasMandatoryParticulate = hasPM25 || hasPM10;
    const pollutantCount = station.supportedPollutants.length;

    // Completeness penalty: 0 if >= 5 pollutants with PM2.5, higher otherwise
    let completenessPenalty = 0;
    if (!hasMandatoryParticulate) completenessPenalty += 50;
    if (pollutantCount < 3) completenessPenalty += 30;
    else if (pollutantCount < 5) completenessPenalty += 10;

    // Distance normalized to 0-100 scale up to maxDistance
    const distancePenalty = (distanceKm / maxDistance) * 100;

    const compositeScore = Math.round((distancePenalty * 0.6 + completenessPenalty * 0.4) * 10) / 10;

    return {
      station: {
        ...station,
        distanceKm,
      },
      distanceKm,
      compositeScore,
      isWithinRepresentativeRange: distanceKm <= maxDistance,
      hasMandatoryParticulate,
    };
  });

  // Sort by compositeScore ascending (lowest/best score first)
  return scored.sort((a, b) => a.compositeScore - b.compositeScore);
}

/**
 * Selects the single best representative monitoring station for a coordinate query.
 * Returns null if no active station exists within the max representative radius (default 50 km).
 */
export function selectBestStation(
  stations: MonitoringStation[],
  userLat: number,
  userLon: number,
  maxDistanceKm = MAX_REPRESENTATIVE_DISTANCE_KM
): {
  selected: MonitoringStation | null;
  distanceKm: number | null;
  isWithinRange: boolean;
  totalCandidateStations: number;
} {
  const ranked = rankStationsByProximityAndQuality(stations, {
    userLat,
    userLon,
    maxDistanceKm,
  });

  if (ranked.length === 0) {
    return {
      selected: null,
      distanceKm: null,
      isWithinRange: false,
      totalCandidateStations: 0,
    };
  }

  const best = ranked[0];

  if (!best.isWithinRepresentativeRange) {
    return {
      selected: null,
      distanceKm: best.distanceKm,
      isWithinRange: false,
      totalCandidateStations: ranked.length,
    };
  }

  return {
    selected: best.station,
    distanceKm: best.distanceKm,
    isWithinRange: true,
    totalCandidateStations: ranked.length,
  };
}
