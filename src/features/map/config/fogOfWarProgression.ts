import { isCoordinateInsideHardcodedCityBoundary } from './hardcodedCityBoundaries';
import type { MapCoordinate } from '../types';

type FogOfWarLevelRule = {
  cityVisibleRadiusMeters: number;
  level: number;
  minZoomLevel: number;
  maxZoomLevel: number;
  ruralVisibleRadiusMeters: number;
};

const DEFAULT_LEVEL = 1;

const FOG_OF_WAR_LEVEL_RULES: FogOfWarLevelRule[] = [
  { level: 1, minZoomLevel: 12.2, maxZoomLevel: 14.2, cityVisibleRadiusMeters: 150, ruralVisibleRadiusMeters: 2_000 },
  { level: 2, minZoomLevel: 11.8, maxZoomLevel: 14.4, cityVisibleRadiusMeters: 200, ruralVisibleRadiusMeters: 3_000 },
  { level: 3, minZoomLevel: 11.4, maxZoomLevel: 14.6, cityVisibleRadiusMeters: 300, ruralVisibleRadiusMeters: 4_000 },
  { level: 4, minZoomLevel: 11, maxZoomLevel: 14.8, cityVisibleRadiusMeters: 450, ruralVisibleRadiusMeters: 6_000 },
  { level: 5, minZoomLevel: 10.6, maxZoomLevel: 15, cityVisibleRadiusMeters: 650, ruralVisibleRadiusMeters: 8_500 },
  { level: 6, minZoomLevel: 10.2, maxZoomLevel: 15.2, cityVisibleRadiusMeters: 900, ruralVisibleRadiusMeters: 12_000 },
  { level: 7, minZoomLevel: 9.8, maxZoomLevel: 15.4, cityVisibleRadiusMeters: 1_200, ruralVisibleRadiusMeters: 17_000 },
  { level: 8, minZoomLevel: 9.4, maxZoomLevel: 15.6, cityVisibleRadiusMeters: 1_600, ruralVisibleRadiusMeters: 24_000 },
  { level: 9, minZoomLevel: 9, maxZoomLevel: 15.8, cityVisibleRadiusMeters: 2_100, ruralVisibleRadiusMeters: 34_000 },
  { level: 10, minZoomLevel: 8.6, maxZoomLevel: 16, cityVisibleRadiusMeters: 2_800, ruralVisibleRadiusMeters: 48_000 },
];

function normalizeLevel(level: number | null | undefined) {
  if (typeof level !== 'number' || !Number.isFinite(level)) {
    return DEFAULT_LEVEL;
  }

  return Math.max(DEFAULT_LEVEL, Math.floor(level));
}

export function getFogOfWarRuleForLevel(level: number | null | undefined) {
  const normalizedLevel = normalizeLevel(level);

  for (let index = FOG_OF_WAR_LEVEL_RULES.length - 1; index >= 0; index -= 1) {
    const candidate = FOG_OF_WAR_LEVEL_RULES[index];

    if (candidate && normalizedLevel >= candidate.level) {
      return candidate;
    }
  }

  return FOG_OF_WAR_LEVEL_RULES[0];
}

export function getAdaptiveFogOfWarRadiusMeters(params: {
  levelRule: FogOfWarLevelRule;
  userLocation: MapCoordinate | null;
}) {
  const { levelRule, userLocation } = params;

  if (!userLocation) {
    return levelRule.ruralVisibleRadiusMeters;
  }

  return isCoordinateInsideHardcodedCityBoundary(userLocation)
    ? levelRule.cityVisibleRadiusMeters
    : levelRule.ruralVisibleRadiusMeters;
}

export { DEFAULT_LEVEL as DEFAULT_FOG_OF_WAR_LEVEL, FOG_OF_WAR_LEVEL_RULES };
