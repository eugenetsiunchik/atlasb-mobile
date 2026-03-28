import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export const TERRITORY_CELLS_SUBCOLLECTION_NAME = 'exploredCells';
export const TERRITORY_REVEAL_FORWARD_OFFSET_METERS = 15;

export type TerritoryRevealId = string;

export type ExploredTerritoryReveal = {
  createdAtMs: number | null;
  headingDegrees: number | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  revealId: TerritoryRevealId;
  updatedAtMs: number | null;
};

export type FirestoreExploredTerritoryReveal = {
  createdAt?: FirebaseFirestoreTypes.Timestamp | null;
  headingDegrees?: number | null;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  revealId?: string;
  updatedAt?: FirebaseFirestoreTypes.Timestamp | null;
};

export type MapViewportBounds = {
  northEast: [number, number];
  southWest: [number, number];
};
