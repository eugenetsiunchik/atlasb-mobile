import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export const TERRITORY_CELLS_SUBCOLLECTION_NAME = 'exploredCells';
export const TERRITORY_STORAGE_GRID_ZOOM = 11;
export const TERRITORY_MIN_DISPLAY_GRID_ZOOM = 7;
export const TERRITORY_MAX_DISPLAY_GRID_ZOOM = 10;

export type TerritoryCellId = string;

export type ExploredTerritoryCell = {
  cellId: TerritoryCellId;
  createdAtMs: number | null;
  gridZoom: number;
  updatedAtMs: number | null;
  x: number;
  y: number;
};

export type FirestoreExploredTerritoryCell = {
  cellId?: string;
  createdAt?: FirebaseFirestoreTypes.Timestamp | null;
  gridZoom?: number;
  updatedAt?: FirebaseFirestoreTypes.Timestamp | null;
  x?: number;
  y?: number;
};

export type TerritoryCellCoordinate = {
  gridZoom: number;
  x: number;
  y: number;
};

export type MapViewportBounds = {
  northEast: [number, number];
  southWest: [number, number];
};
