-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AirQualitySnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "stationId" TEXT,
    "stationName" TEXT,
    "sourceProvider" TEXT NOT NULL,
    "aqiValue" INTEGER NOT NULL,
    "aqiCategory" TEXT NOT NULL,
    "dominantPollutant" TEXT NOT NULL,
    "pm25" REAL,
    "pm10" REAL,
    "no2" REAL,
    "o3" REAL,
    "so2" REAL,
    "co" REAL,
    "nh3" REAL,
    "pb" REAL,
    "distanceKm" REAL,
    "rawBreakdownJson" TEXT,
    "measurementTimestamp" DATETIME NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isStale" BOOLEAN NOT NULL DEFAULT false,
    "provenanceType" TEXT NOT NULL DEFAULT 'UNKNOWN_PROVENANCE',
    "averagingPeriod" TEXT NOT NULL DEFAULT '1_HOUR',
    "completenessHours" REAL NOT NULL DEFAULT 1.0
);
INSERT INTO "new_AirQualitySnapshot" ("aqiCategory", "aqiValue", "co", "distanceKm", "dominantPollutant", "fetchedAt", "id", "isStale", "latitude", "longitude", "measurementTimestamp", "nh3", "no2", "o3", "pb", "pm10", "pm25", "rawBreakdownJson", "so2", "sourceProvider", "stationId", "stationName") SELECT "aqiCategory", "aqiValue", "co", "distanceKm", "dominantPollutant", "fetchedAt", "id", "isStale", "latitude", "longitude", "measurementTimestamp", "nh3", "no2", "o3", "pb", "pm10", "pm25", "rawBreakdownJson", "so2", "sourceProvider", "stationId", "stationName" FROM "AirQualitySnapshot";
DROP TABLE "AirQualitySnapshot";
ALTER TABLE "new_AirQualitySnapshot" RENAME TO "AirQualitySnapshot";
CREATE INDEX "AirQualitySnapshot_latitude_longitude_idx" ON "AirQualitySnapshot"("latitude", "longitude");
CREATE INDEX "AirQualitySnapshot_fetchedAt_idx" ON "AirQualitySnapshot"("fetchedAt");
CREATE INDEX "AirQualitySnapshot_stationId_measurementTimestamp_idx" ON "AirQualitySnapshot"("stationId", "measurementTimestamp");
CREATE INDEX "AirQualitySnapshot_provenanceType_idx" ON "AirQualitySnapshot"("provenanceType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
