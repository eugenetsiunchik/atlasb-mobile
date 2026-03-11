import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import {
  getFirebaseConfigurationErrorMessage,
  getFirebaseFirestore,
  isFirebaseConfigured,
  logFirebaseError,
} from '../../../firebase';
import {
  USER_PLACE_STATES_SUBCOLLECTION_NAME,
  createEmptyUserPlaceState,
  hasPersistedUserPlaceState,
  type FirestoreUserPlaceState,
  type UserPlaceState,
  type UserPlaceWriteAction,
  type VisitCoordinates,
} from '../types';

const USERS_COLLECTION_NAME = 'users';

function getUserPlaceStatesCollection(uid: string) {
  return collection(
    doc(collection(getFirebaseFirestore(), USERS_COLLECTION_NAME), uid),
    USER_PLACE_STATES_SUBCOLLECTION_NAME,
  );
}

function getUserPlaceStateDocument(uid: string, placeId: string) {
  return doc(getUserPlaceStatesCollection(uid), placeId);
}

function readTimestampMs(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    'toMillis' in value &&
    typeof value.toMillis === 'function'
  ) {
    return value.toMillis();
  }

  return null;
}

function readVisitCoordinates(value: unknown): VisitCoordinates | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as {
    accuracyMeters?: unknown;
    capturedAtMs?: unknown;
    latitude?: unknown;
    longitude?: unknown;
  };

  return typeof candidate.latitude === 'number' &&
    typeof candidate.longitude === 'number' &&
    typeof candidate.capturedAtMs === 'number'
    ? {
        accuracyMeters:
          typeof candidate.accuracyMeters === 'number' ? candidate.accuracyMeters : null,
        capturedAtMs: candidate.capturedAtMs,
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      }
    : null;
}

function normalizeUserPlaceState(
  documentSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>,
): UserPlaceState {
  const data = documentSnapshot.data() as FirestoreUserPlaceState | undefined;
  const baseState = createEmptyUserPlaceState(documentSnapshot.id);

  if (!data) {
    return baseState;
  }

  return {
    placeId:
      typeof data.placeId === 'string' && data.placeId.trim()
        ? data.placeId
        : documentSnapshot.id,
    collected: data.collected === true,
    collectedAtMs: readTimestampMs(data.collectedAt),
    createdAtMs: readTimestampMs(data.createdAt),
    discovered: data.discovered === true,
    discoveredAtMs: readTimestampMs(data.discoveredAt),
    saved: data.saved === true,
    savedAtMs: readTimestampMs(data.savedAt),
    updatedAtMs: readTimestampMs(data.updatedAt),
    visitCoordinates: readVisitCoordinates(data.visitCoordinates),
    visitDistanceMeters:
      typeof data.visitDistanceMeters === 'number' ? data.visitDistanceMeters : null,
    visitMethod: data.visitMethod === 'gps' || data.visitMethod === 'manual'
      ? data.visitMethod
      : null,
    visitRadiusMeters:
      typeof data.visitRadiusMeters === 'number' ? data.visitRadiusMeters : null,
    visitVerified: typeof data.visitVerified === 'boolean' ? data.visitVerified : null,
    visited: data.visited === true,
    visitedAtMs: readTimestampMs(data.visitedAt),
  };
}

export function subscribeToUserPlaceStates(
  uid: string,
  options: {
    onError: (message: string) => void;
    onSuccess: (states: UserPlaceState[]) => void;
  },
) {
  if (!isFirebaseConfigured()) {
    options.onError(getFirebaseConfigurationErrorMessage());
    return () => undefined;
  }

  return onSnapshot(
    getUserPlaceStatesCollection(uid),
    snapshot => {
      const states = snapshot.docs
        .map(normalizeUserPlaceState)
        .filter(hasPersistedUserPlaceState);

      options.onSuccess(states);
    },
    error => {
      logFirebaseError(
        'Firestore subscribe user place states failed',
        {
          operation: 'onSnapshot',
          path: `users/${uid}/${USER_PLACE_STATES_SUBCOLLECTION_NAME}`,
          uid,
        },
        error,
      );
      options.onError(
        error instanceof Error
          ? error.message
          : 'Unable to load user place states from Firestore.',
      );
    },
  );
}

export async function applyUserPlaceWriteAction(params: {
  action: UserPlaceWriteAction;
  nextState: UserPlaceState | null;
  placeId: string;
  previousState: UserPlaceState;
  uid: string;
}) {
  const { action, nextState, placeId, previousState, uid } = params;
  const documentPath = `users/${uid}/${USER_PLACE_STATES_SUBCOLLECTION_NAME}/${placeId}`;
  const userPlaceStateDocument = getUserPlaceStateDocument(uid, placeId);

  if (!nextState || !hasPersistedUserPlaceState(nextState)) {
    try {
      await deleteDoc(userPlaceStateDocument);
    } catch (error) {
      logFirebaseError(
        'Firestore delete user place state failed',
        {
          action,
          operation: 'deleteDoc',
          path: documentPath,
          placeId,
          uid,
        },
        error,
      );
      throw error;
    }
    return;
  }

  const shouldSetCreatedAt = !hasPersistedUserPlaceState(previousState);
  const payload: Record<string, unknown> = {
    placeId,
    updatedAt: serverTimestamp(),
  };

  if (shouldSetCreatedAt) {
    payload.createdAt = serverTimestamp();
  }

  switch (action) {
    case 'save':
      payload.saved = true;
      payload.savedAt = serverTimestamp();
      break;
    case 'unsave':
      payload.saved = false;
      payload.savedAt = null;
      break;
    case 'markDiscovered':
      payload.discovered = true;
      payload.discoveredAt = serverTimestamp();
      break;
    case 'markVisited':
      payload.visited = true;
      payload.visitedAt = serverTimestamp();
      payload.visitCoordinates = nextState.visitCoordinates
        ? {
            accuracyMeters: nextState.visitCoordinates.accuracyMeters,
            capturedAtMs: nextState.visitCoordinates.capturedAtMs,
            latitude: nextState.visitCoordinates.latitude,
            longitude: nextState.visitCoordinates.longitude,
          }
        : null;
      payload.visitDistanceMeters = nextState.visitDistanceMeters;
      payload.visitMethod = nextState.visitMethod;
      payload.visitRadiusMeters = nextState.visitRadiusMeters;
      payload.visitVerified = nextState.visitVerified;
      break;
    case 'markCollected':
      payload.collected = true;
      payload.collectedAt = serverTimestamp();
      break;
  }

  try {
    await setDoc(userPlaceStateDocument, payload, { merge: true });
  } catch (error) {
    logFirebaseError(
      'Firestore write user place state failed',
      {
        action,
        operation: 'setDoc',
        path: documentPath,
        payload,
        placeId,
        uid,
      },
      error,
    );
    throw error;
  }
}
