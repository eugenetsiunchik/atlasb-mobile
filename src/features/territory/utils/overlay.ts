import type { ExploredTerritoryReveal, MapViewportBounds } from '../types';
import { createRevealCircleRing, doesRevealIntersectViewport } from './reveals';

type GeoJsonPolygonFeature = {
  geometry: {
    coordinates: number[][][];
    type: 'Polygon';
  };
  id: string;
  properties: {
    kind: 'fog';
  };
  type: 'Feature';
};

export type GeoJsonPolygonFeatureCollection = {
  features: GeoJsonPolygonFeature[];
  type: 'FeatureCollection';
};

const METERS_PER_DEGREE_LAT = 111_320;

const WORLD_FOG_RING: [number, number][] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

function approximateDistanceBetweenRevealsMeters(
  a: Pick<ExploredTerritoryReveal, 'latitude' | 'longitude'>,
  b: Pick<ExploredTerritoryReveal, 'latitude' | 'longitude'>,
): number {
  const dLat = (a.latitude - b.latitude) * METERS_PER_DEGREE_LAT;
  const avgLatRadians = (((a.latitude + b.latitude) / 2) * Math.PI) / 180;
  const dLng =
    (a.longitude - b.longitude) * METERS_PER_DEGREE_LAT * Math.cos(avgLatRadians);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

function cross(
  o: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/**
 * Andrew's monotone chain convex hull. Returns points in CCW order (positive
 * signed area in [lng, lat] space). Callers that need CW order should
 * `.reverse()` the result.
 */
function convexHull(points: [number, number][]): [number, number][] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  if (sorted.length <= 2) {
    return sorted;
  }

  const lower: [number, number][] = [];

  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: [number, number][] = [];

  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();

  return [...lower, ...upper];
}

/**
 * Groups reveals into connected components where circles overlap.
 * Two reveals are connected when the distance between their centers
 * is less than the sum of their radii.
 */
function findOverlappingGroups(
  reveals: ExploredTerritoryReveal[],
): ExploredTerritoryReveal[][] {
  const visited = new Set<number>();
  const groups: ExploredTerritoryReveal[][] = [];

  for (let i = 0; i < reveals.length; i += 1) {
    if (visited.has(i)) {
      continue;
    }

    const groupIndices: number[] = [];
    const queue = [i];
    visited.add(i);

    while (queue.length > 0) {
      const current = queue.shift()!;
      groupIndices.push(current);

      for (let j = 0; j < reveals.length; j += 1) {
        if (visited.has(j)) {
          continue;
        }

        const distance = approximateDistanceBetweenRevealsMeters(
          reveals[current],
          reveals[j],
        );

        if (distance < reveals[current].radiusMeters + reveals[j].radiusMeters) {
          visited.add(j);
          queue.push(j);
        }
      }
    }

    groups.push(groupIndices.map(idx => reveals[idx]));
  }

  return groups;
}

/**
 * Earcut (MapLibre's polygon triangulation library) produces invalid geometry
 * when polygon holes overlap. This function builds non-overlapping hole rings:
 *
 * - Isolated circles that don't overlap anything → normal circle ring.
 * - Connected groups of overlapping circles → convex hull of all their
 *   boundary points, which is a single non-self-intersecting ring that fully
 *   covers the union of those circles.
 *
 * All returned rings are CW (negative signed area), the winding MapLibre
 * expects for polygon holes.
 */
function buildNonOverlappingHoleRings(
  reveals: ExploredTerritoryReveal[],
): [number, number][][] {
  if (reveals.length === 0) {
    return [];
  }

  if (reveals.length === 1) {
    return [createRevealCircleRing(reveals[0])];
  }

  const groups = findOverlappingGroups(reveals);
  const holes: [number, number][][] = [];

  for (const group of groups) {
    if (group.length === 1) {
      holes.push(createRevealCircleRing(group[0]));
      continue;
    }

    const allBoundaryPoints: [number, number][] = [];

    for (const reveal of group) {
      allBoundaryPoints.push(...createRevealCircleRing(reveal));
    }

    const hull = convexHull(allBoundaryPoints);

    if (hull.length < 3) {
      for (const reveal of group) {
        holes.push(createRevealCircleRing(reveal));
      }
      continue;
    }

    // convexHull returns CCW; reverse to CW so classifyRings treats it as hole
    hull.reverse();
    // close the ring
    hull.push([hull[0][0], hull[0][1]]);
    holes.push(hull);
  }

  return holes;
}

function expandViewportBounds(viewportBounds: MapViewportBounds): MapViewportBounds {
  const longitudePadding = Math.max(
    0.25,
    Math.abs(viewportBounds.northEast[0] - viewportBounds.southWest[0]) * 0.5,
  );
  const latitudePadding = Math.max(
    0.25,
    Math.abs(viewportBounds.northEast[1] - viewportBounds.southWest[1]) * 0.5,
  );

  return {
    northEast: [
      Math.min(180, viewportBounds.northEast[0] + longitudePadding),
      Math.min(85, viewportBounds.northEast[1] + latitudePadding),
    ],
    southWest: [
      Math.max(-180, viewportBounds.southWest[0] - longitudePadding),
      Math.max(-85, viewportBounds.southWest[1] - latitudePadding),
    ],
  };
}

function createFogFeature(holeRings: [number, number][][]) {
  return {
    geometry: {
      coordinates: [WORLD_FOG_RING, ...holeRings],
      type: 'Polygon' as const,
    },
    id: 'fog:viewport',
    properties: {
      kind: 'fog' as const,
    },
    type: 'Feature' as const,
  };
}

export function createFogOverlay(params: {
  reveals: ExploredTerritoryReveal[];
  viewportBounds?: MapViewportBounds;
}): GeoJsonPolygonFeatureCollection {
  const revealBounds = params.viewportBounds
    ? expandViewportBounds(params.viewportBounds)
    : null;
  const relevantReveals = revealBounds
    ? params.reveals.filter(reveal => doesRevealIntersectViewport(reveal, revealBounds))
    : params.reveals;
  const holeRings = buildNonOverlappingHoleRings(relevantReveals);

  return {
    features: [createFogFeature(holeRings)],
    type: 'FeatureCollection',
  };
}
