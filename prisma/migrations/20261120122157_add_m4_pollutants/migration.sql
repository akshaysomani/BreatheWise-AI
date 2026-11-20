-- AlterTable
ALTER TABLE "AirQualitySnapshot" ADD COLUMN "co" REAL;
ALTER TABLE "AirQualitySnapshot" ADD COLUMN "distanceKm" REAL;
ALTER TABLE "AirQualitySnapshot" ADD COLUMN "nh3" REAL;
ALTER TABLE "AirQualitySnapshot" ADD COLUMN "pb" REAL;
ALTER TABLE "AirQualitySnapshot" ADD COLUMN "rawBreakdownJson" TEXT;
ALTER TABLE "AirQualitySnapshot" ADD COLUMN "so2" REAL;
