-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HouseholdProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "neighborhood" TEXT,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "homeType" TEXT NOT NULL,
    "floorAreaSqFt" REAL NOT NULL,
    "ceilingHeightFt" REAL NOT NULL DEFAULT 9.0,
    "hasHEPAFilter" BOOLEAN NOT NULL DEFAULT false,
    "hepaCADR" REAL,
    "windowSealing" TEXT NOT NULL DEFAULT 'MODERATE',
    "primaryCookingFuel" TEXT NOT NULL DEFAULT 'LPG_GAS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HouseholdProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "nameOrAlias" TEXT NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "hasAsthma" BOOLEAN NOT NULL DEFAULT false,
    "hasHeartCondition" BOOLEAN NOT NULL DEFAULT false,
    "isPregnant" BOOLEAN NOT NULL DEFAULT false,
    "outdoorHoursPerDay" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "HouseholdProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AirQualitySnapshot" (
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
    "measurementTimestamp" DATETIME NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isStale" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "SavedRoutine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "distanceKm" REAL NOT NULL,
    "departureTime" TEXT NOT NULL,
    "returnTime" TEXT,
    "baselineMode" TEXT NOT NULL,
    "optimizedMode" TEXT,
    "estimatedDoseReduction" REAL,
    "estimatedCO2SavingsKg" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedRoutine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImpactLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "co2AvoidedKg" REAL NOT NULL,
    "pm25AvoidedGrams" REAL NOT NULL,
    "distanceShiftedKm" REAL,
    "calculationFormula" TEXT NOT NULL,
    "uncertaintyMargin" REAL NOT NULL DEFAULT 0.15,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImpactLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunityReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fuzzedLatitude" REAL NOT NULL,
    "fuzzedLongitude" REAL NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "isOfficialData" BOOLEAN NOT NULL DEFAULT false,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecommendationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "category" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "scientificReason" TEXT NOT NULL,
    "expectedBenefit" TEXT NOT NULL,
    "quantifiedImpact" TEXT,
    "assumptionsAndUncertainty" TEXT NOT NULL,
    "implementationSteps" TEXT NOT NULL,
    "disclaimer" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecommendationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdProfile_userId_key" ON "HouseholdProfile"("userId");

-- CreateIndex
CREATE INDEX "HouseholdProfile_userId_idx" ON "HouseholdProfile"("userId");

-- CreateIndex
CREATE INDEX "HouseholdProfile_latitude_longitude_idx" ON "HouseholdProfile"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "HouseholdMember_householdId_idx" ON "HouseholdMember"("householdId");

-- CreateIndex
CREATE INDEX "AirQualitySnapshot_latitude_longitude_idx" ON "AirQualitySnapshot"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "AirQualitySnapshot_fetchedAt_idx" ON "AirQualitySnapshot"("fetchedAt");

-- CreateIndex
CREATE INDEX "SavedRoutine_userId_idx" ON "SavedRoutine"("userId");

-- CreateIndex
CREATE INDEX "ImpactLog_userId_date_idx" ON "ImpactLog"("userId", "date");

-- CreateIndex
CREATE INDEX "CommunityReport_fuzzedLatitude_fuzzedLongitude_idx" ON "CommunityReport"("fuzzedLatitude", "fuzzedLongitude");

-- CreateIndex
CREATE INDEX "CommunityReport_userId_idx" ON "CommunityReport"("userId");

-- CreateIndex
CREATE INDEX "RecommendationRecord_userId_category_idx" ON "RecommendationRecord"("userId", "category");
