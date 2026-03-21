import type { MapViewportBounds, TerritoryCellId } from '../types';
import {
  getTerritoryCellBounds,
  getTerritoryCellForCoordinate,
  getTerritoryCellId,
  getTerritoryCellsForViewport,
} from './grid';

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

function getRectanglePolygon(params: {
  gridZoom: number;
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
}) {
  const northWestBounds = getTerritoryCellBounds({
    gridZoom: params.gridZoom,
    x: params.minX,
    y: params.minY,
  });
  const southEastBounds = getTerritoryCellBounds({
    gridZoom: params.gridZoom,
    x: params.maxX,
    y: params.maxY,
  });

  return [
    [
      [northWestBounds.west, northWestBounds.north],
      [southEastBounds.east, northWestBounds.north],
      [southEastBounds.east, southEastBounds.south],
      [northWestBounds.west, southEastBounds.south],
      [northWestBounds.west, northWestBounds.north],
    ],
  ];
}

function createRectangleFeature(params: {
  gridZoom: number;
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
}) {
  return {
    geometry: {
      coordinates: getRectanglePolygon(params),
      type: 'Polygon' as const,
    },
    id: `fog:${params.gridZoom}:${params.minX}:${params.minY}:${params.maxX}:${params.maxY}`,
    properties: {
      kind: 'fog' as const,
    },
    type: 'Feature' as const,
  };
}

function createHiddenCellMatrix(params: {
  gridZoom: number;
  revealedCellIds: Set<TerritoryCellId>;
  viewportBounds: MapViewportBounds;
}) {
  const northWestCell = getTerritoryCellForCoordinate(
    params.viewportBounds.southWest[0],
    params.viewportBounds.northEast[1],
    params.gridZoom,
  );
  const southEastCell = getTerritoryCellForCoordinate(
    params.viewportBounds.northEast[0],
    params.viewportBounds.southWest[1],
    params.gridZoom,
  );
  const minX = Math.min(northWestCell.x, southEastCell.x);
  const maxX = Math.max(northWestCell.x, southEastCell.x);
  const minY = Math.min(northWestCell.y, southEastCell.y);
  const maxY = Math.max(northWestCell.y, southEastCell.y);
  const viewportCells = getTerritoryCellsForViewport(params.viewportBounds, params.gridZoom);
  const hiddenByKey = new Set<string>();

  viewportCells.forEach(cell => {
    const cellId = getTerritoryCellId(cell);

    if (!params.revealedCellIds.has(cellId)) {
      hiddenByKey.add(`${cell.x}:${cell.y}`);
    }
  });

  return {
    hiddenByKey,
    maxX,
    maxY,
    minX,
    minY,
  };
}

export function createFogOverlay(params: {
  displayGridZoom: number;
  revealedCellIds: Set<TerritoryCellId>;
  viewportBounds: MapViewportBounds;
}): GeoJsonPolygonFeatureCollection {
  const { hiddenByKey, maxX, maxY, minX, minY } = createHiddenCellMatrix({
    gridZoom: params.displayGridZoom,
    revealedCellIds: params.revealedCellIds,
    viewportBounds: params.viewportBounds,
  });
  const visited = new Set<string>();
  const features: GeoJsonPolygonFeature[] = [];

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const startKey = `${x}:${y}`;

      if (!hiddenByKey.has(startKey) || visited.has(startKey)) {
        continue;
      }

      let endX = x;

      while (
        endX + 1 <= maxX &&
        hiddenByKey.has(`${endX + 1}:${y}`) &&
        !visited.has(`${endX + 1}:${y}`)
      ) {
        endX += 1;
      }

      let endY = y;
      let canGrow = true;

      while (canGrow && endY + 1 <= maxY) {
        for (let candidateX = x; candidateX <= endX; candidateX += 1) {
          const candidateKey = `${candidateX}:${endY + 1}`;

          if (!hiddenByKey.has(candidateKey) || visited.has(candidateKey)) {
            canGrow = false;
            break;
          }
        }

        if (canGrow) {
          endY += 1;
        }
      }

      for (let visitedY = y; visitedY <= endY; visitedY += 1) {
        for (let visitedX = x; visitedX <= endX; visitedX += 1) {
          visited.add(`${visitedX}:${visitedY}`);
        }
      }

      features.push(
        createRectangleFeature({
          gridZoom: params.displayGridZoom,
          maxX: endX,
          maxY: endY,
          minX: x,
          minY: y,
        }),
      );
    }
  }

  return {
    features,
    type: 'FeatureCollection',
  };
}
