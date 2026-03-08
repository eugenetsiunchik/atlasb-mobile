import type { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export const USER_PLACE_STATES_SUBCOLLECTION_NAME = 'placeStates';

export type UserPlaceMutation =
  | 'toggleSave'
  | 'markDiscovered'
  | 'markVisited'
  | 'markCollected';

export type UserPlaceWriteAction =
  | 'save'
  | 'unsave'
  | 'markDiscovered'
  | 'markVisited'
  | 'markCollected';

export type UserPlaceMutationResult =
  | { status: 'fulfilled' }
  | { reason: 'auth-required' | 'noop' | 'pending'; status: 'skipped' }
  | { errorMessage: string; status: 'rejected' };

export type UserPlaceState = {
  placeId: string;
  collected: boolean;
  collectedAtMs: number | null;
  createdAtMs: number | null;
  discovered: boolean;
  discoveredAtMs: number | null;
  saved: boolean;
  savedAtMs: number | null;
  updatedAtMs: number | null;
  visited: boolean;
  visitedAtMs: number | null;
};

export type FirestoreUserPlaceState = {
  placeId: string;
  collected?: boolean;
  collectedAt?: FirebaseFirestoreTypes.Timestamp | null;
  createdAt?: FirebaseFirestoreTypes.Timestamp | null;
  discovered?: boolean;
  discoveredAt?: FirebaseFirestoreTypes.Timestamp | null;
  saved?: boolean;
  savedAt?: FirebaseFirestoreTypes.Timestamp | null;
  updatedAt?: FirebaseFirestoreTypes.Timestamp | null;
  visited?: boolean;
  visitedAt?: FirebaseFirestoreTypes.Timestamp | null;
};

export function createEmptyUserPlaceState(placeId: string): UserPlaceState {
  return {
    placeId,
    collected: false,
    collectedAtMs: null,
    createdAtMs: null,
    discovered: false,
    discoveredAtMs: null,
    saved: false,
    savedAtMs: null,
    updatedAtMs: null,
    visited: false,
    visitedAtMs: null,
  };
}

export function hasPersistedUserPlaceState(state: UserPlaceState) {
  return state.saved || state.discovered || state.visited || state.collected;
}
