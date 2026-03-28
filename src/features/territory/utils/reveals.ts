import type { MapCoordinate, MapUserLocation } from '../../map/types';
import { getDistanceBetweenCoordinatesMeters } from '../../userPlace/utils/distance';
import type {
  ExploredTerritoryReveal,
  MapViewportBounds,
  TerritoryRevealId,
} from '../types';

const EARTH_RADIUS_METERS = 6_371_000;
const CIRCLE_SEGMENTS = 48;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function normalizeHeadingDegrees(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return ((value % 360) + 360) % 360;
}

function createRevealId(params: {
  capturedAtMs: number;
  latitude: number;
  longitude: number;
}): TerritoryRevealId {
  return [
    params.capturedAtMs,
    params.latitude.toFixed(6),
    params.longitude.toFixed(6),
  ].join(':');
}

export function getOffsetCoordinate(params: {
  distanceMeters: number;
  headingDegrees: number;
  origin: MapCoordinate;
}) {
  const angularDistance = params.distanceMeters / EARTH_RADIUS_METERS;
  const headingRadians = toRadians(params.headingDegrees);
  const latitudeRadians = toRadians(params.origin.latitude);
  const longitudeRadians = toRadians(params.origin.longitude);
  const nextLatitudeRadians = Math.asin(
    Math.sin(latitudeRadians) * Math.cos(angularDistance) +
      Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(headingRadians),
  );
  const nextLongitudeRadians =
    longitudeRadians +
    Math.atan2(
      Math.sin(headingRadians) * Math.sin(angularDistance) * Math.cos(latitudeRadians),
      Math.cos(angularDistance) - Math.sin(latitudeRadians) * Math.sin(nextLatitudeRadians),
    );

  return {
    latitude: toDegrees(nextLatitudeRadians),
    longitude: toDegrees(nextLongitudeRadians),
  };
}

export function createExplorationRevealFromLocation(params: {
  forwardOffsetMeters: number;
  location: MapUserLocation;
  radiusMeters: number;
}): ExploredTerritoryReveal {
  const headingDegrees = normalizeHeadingDegrees(params.location.headingDegrees);
  const center =
    headingDegrees === null
      ? {
          latitude: params.location.latitude,
          longitude: params.location.longitude,
        }
      : getOffsetCoordinate({
          distanceMeters: params.forwardOffsetMeters,
          headingDegrees,
          origin: params.location,
        });

  return {
    createdAtMs: params.location.capturedAtMs,
    headingDegrees,
    latitude: center.latitude,
    longitude: center.longitude,
    radiusMeters: params.radiusMeters,
    revealId: createRevealId({
      capturedAtMs: params.location.capturedAtMs,
      latitude: center.latitude,
      longitude: center.longitude,
    }),
    updatedAtMs: params.location.capturedAtMs,
  };
}

export function createRevealCircleRing(reveal: Pick<
  ExploredTerritoryReveal,
  'latitude' | 'longitude' | 'radiusMeters'
>) {
  const ring: [number, number][] = [];

  for (let index = 0; index <= CIRCLE_SEGMENTS; index += 1) {
    const headingDegrees = (index / CIRCLE_SEGMENTS) * 360;
    const point = getOffsetCoordinate({
      distanceMeters: reveal.radiusMeters,
      headingDegrees,
      origin: {
        latitude: reveal.latitude,
        longitude: reveal.longitude,
      },
    });

    ring.push([point.longitude, point.latitude]);
  }

  return ring;
}

export function doesRevealContainCoordinate(
  reveal: Pick<ExploredTerritoryReveal, 'latitude' | 'longitude' | 'radiusMeters'>,
  coordinate: MapCoordinate,
) {
  return (
    getDistanceBetweenCoordinatesMeters(
      {
        latitude: reveal.latitude,
        longitude: reveal.longitude,
      },
      coordinate,
    ) <= reveal.radiusMeters
  );
}

export function doesRevealIntersectViewport(
  reveal: Pick<ExploredTerritoryReveal, 'latitude' | 'longitude' | 'radiusMeters'>,
  viewportBounds: MapViewportBounds,
) {
  const latitudeExpansion = reveal.radiusMeters / 111_320;
  const cosLatitude = Math.cos(toRadians(reveal.latitude));
  const longitudeExpansion =
    Math.abs(cosLatitude) < 0.000001
      ? 180
      : reveal.radiusMeters / (111_320 * Math.abs(cosLatitude));

  return (
    reveal.latitude >= viewportBounds.southWest[1] - latitudeExpansion &&
    reveal.latitude <= viewportBounds.northEast[1] + latitudeExpansion &&
    reveal.longitude >= viewportBounds.southWest[0] - longitudeExpansion &&
    reveal.longitude <= viewportBounds.northEast[0] + longitudeExpansion
  );
}

export function mergeExplorationReveals(
  primaryReveals: ExploredTerritoryReveal[],
  secondaryReveals: ExploredTerritoryReveal[],
) {
  const mergedReveals = new Map<TerritoryRevealId, ExploredTerritoryReveal>();

  primaryReveals.forEach(reveal => {
    mergedReveals.set(reveal.revealId, reveal);
  });

  secondaryReveals.forEach(reveal => {
    if (!mergedReveals.has(reveal.revealId)) {
      mergedReveals.set(reveal.revealId, reveal);
    }
  });

  return Array.from(mergedReveals.values()).sort((left, right) =>
    left.createdAtMs === right.createdAtMs
      ? left.revealId.localeCompare(right.revealId)
      : (left.createdAtMs ?? 0) - (right.createdAtMs ?? 0),
  );
}
