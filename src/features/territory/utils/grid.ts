import { getDistanceBetweenCoordinatesMeters } from '../../userPlace/utils/distance';
import type { MapCoordinate } from '../../map/types';
import type { MapViewportBounds, TerritoryCellCoordinate, TerritoryCellId } from '../types';

const MAX_MERCATOR_LATITUDE = 85.05112878;
const EARTH_RADIUS_METERS = 6_371_000;

function clampLatitude(latitude: number) {
  return Math.min(Math.max(latitude, -MAX_MERCATOR_LATITUDE), MAX_MERCATOR_LATITUDE);
}

function normalizeLongitude(longitude: number) {
  const wrapped = ((longitude + 180) % 360 + 360) % 360;

  return wrapped - 180;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getGridDimension(gridZoom: number) {
  return 2 ** gridZoom;
}

export function getTerritoryCellId(cell: TerritoryCellCoordinate): TerritoryCellId {
  return `${cell.gridZoom}:${cell.x}:${cell.y}`;
}

export function parseTerritoryCellId(cellId: TerritoryCellId): TerritoryCellCoordinate | null {
  const [gridZoomValue, xValue, yValue] = cellId.split(':');
  const gridZoom = Number.parseInt(gridZoomValue ?? '', 10);
  const x = Number.parseInt(xValue ?? '', 10);
  const y = Number.parseInt(yValue ?? '', 10);

  return Number.isInteger(gridZoom) && Number.isInteger(x) && Number.isInteger(y)
    ? {
        gridZoom,
        x,
        y,
      }
    : null;
}

export function getTerritoryCellForCoordinate(
  longitude: number,
  latitude: number,
  gridZoom: number,
): TerritoryCellCoordinate {
  const clampedLatitude = clampLatitude(latitude);
  const normalizedLongitude = normalizeLongitude(longitude);
  const gridDimension = getGridDimension(gridZoom);
  const x = Math.min(
    gridDimension - 1,
    Math.max(0, Math.floor(((normalizedLongitude + 180) / 360) * gridDimension)),
  );
  const latitudeRadians = toRadians(clampedLatitude);
  const mercatorY =
    (1 -
      Math.log(
        Math.tan(latitudeRadians) + 1 / Math.cos(latitudeRadians),
      ) /
        Math.PI) /
    2;
  const y = Math.min(
    gridDimension - 1,
    Math.max(0, Math.floor(mercatorY * gridDimension)),
  );

  return {
    gridZoom,
    x,
    y,
  };
}

export function getTerritoryCellBounds(cell: TerritoryCellCoordinate) {
  const gridDimension = getGridDimension(cell.gridZoom);
  const west = (cell.x / gridDimension) * 360 - 180;
  const east = ((cell.x + 1) / gridDimension) * 360 - 180;
  const northRadians = Math.atan(Math.sinh(Math.PI * (1 - (2 * cell.y) / gridDimension)));
  const southRadians = Math.atan(
    Math.sinh(Math.PI * (1 - (2 * (cell.y + 1)) / gridDimension)),
  );

  return {
    east,
    north: (northRadians * 180) / Math.PI,
    south: (southRadians * 180) / Math.PI,
    west,
  };
}

export function getTerritoryCellCenter(cell: TerritoryCellCoordinate): MapCoordinate {
  const bounds = getTerritoryCellBounds(cell);

  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.west + bounds.east) / 2,
  };
}

export function getTerritoryCellPolygon(cell: TerritoryCellCoordinate) {
  const bounds = getTerritoryCellBounds(cell);

  return [
    [
      [bounds.west, bounds.north],
      [bounds.east, bounds.north],
      [bounds.east, bounds.south],
      [bounds.west, bounds.south],
      [bounds.west, bounds.north],
    ],
  ];
}

export function getParentTerritoryCellId(
  sourceCellId: TerritoryCellId,
  targetGridZoom: number,
): TerritoryCellId | null {
  const sourceCell = parseTerritoryCellId(sourceCellId);

  if (!sourceCell || targetGridZoom > sourceCell.gridZoom) {
    return null;
  }

  if (targetGridZoom === sourceCell.gridZoom) {
    return sourceCellId;
  }

  const zoomDelta = sourceCell.gridZoom - targetGridZoom;
  const scale = 2 ** zoomDelta;

  return getTerritoryCellId({
    gridZoom: targetGridZoom,
    x: Math.floor(sourceCell.x / scale),
    y: Math.floor(sourceCell.y / scale),
  });
}

function createViewportCellRange(bounds: MapViewportBounds, gridZoom: number) {
  const southWestCell = getTerritoryCellForCoordinate(
    bounds.southWest[0],
    bounds.southWest[1],
    gridZoom,
  );
  const northEastCell = getTerritoryCellForCoordinate(
    bounds.northEast[0],
    bounds.northEast[1],
    gridZoom,
  );

  return {
    maxX: Math.max(southWestCell.x, northEastCell.x),
    maxY: Math.max(southWestCell.y, northEastCell.y),
    minX: Math.min(southWestCell.x, northEastCell.x),
    minY: Math.min(southWestCell.y, northEastCell.y),
  };
}

export function getTerritoryCellsForViewport(bounds: MapViewportBounds, gridZoom: number) {
  const range = createViewportCellRange(bounds, gridZoom);
  const cells: TerritoryCellCoordinate[] = [];

  for (let y = range.minY; y <= range.maxY; y += 1) {
    for (let x = range.minX; x <= range.maxX; x += 1) {
      cells.push({
        gridZoom,
        x,
        y,
      });
    }
  }

  return cells;
}

function getLatitudeDeltaDegrees(radiusMeters: number) {
  return (radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
}

function getLongitudeDeltaDegrees(radiusMeters: number, latitude: number) {
  const latitudeRadians = toRadians(clampLatitude(latitude));
  const latitudeCosine = Math.cos(latitudeRadians);

  if (Math.abs(latitudeCosine) < 1e-6) {
    return 180;
  }

  return (radiusMeters / (EARTH_RADIUS_METERS * latitudeCosine)) * (180 / Math.PI);
}

export function getTerritoryCellsWithinRadius(params: {
  center: MapCoordinate;
  gridZoom: number;
  radiusMeters: number;
}) {
  const { center, gridZoom, radiusMeters } = params;
  const latitudeDelta = getLatitudeDeltaDegrees(radiusMeters);
  const longitudeDelta = getLongitudeDeltaDegrees(radiusMeters, center.latitude);
  const bounds: MapViewportBounds = {
    northEast: [
      normalizeLongitude(center.longitude + longitudeDelta),
      clampLatitude(center.latitude + latitudeDelta),
    ],
    southWest: [
      normalizeLongitude(center.longitude - longitudeDelta),
      clampLatitude(center.latitude - latitudeDelta),
    ],
  };
  const candidateCells = getTerritoryCellsForViewport(bounds, gridZoom);

  return candidateCells.filter(cell => {
    const cellBounds = getTerritoryCellBounds(cell);
    const nearestCoordinate = {
      latitude: Math.min(Math.max(center.latitude, cellBounds.south), cellBounds.north),
      longitude: Math.min(Math.max(center.longitude, cellBounds.west), cellBounds.east),
    };

    return (
      getDistanceBetweenCoordinatesMeters(center, nearestCoordinate) <= params.radiusMeters
    );
  });
}
