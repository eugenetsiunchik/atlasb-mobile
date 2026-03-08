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
} from '../../../firebase';
import {
  USER_PLACE_STATES_SUBCOLLECTION_NAME,
  createEmptyUserPlaceState,
  hasPersistedUserPlaceState,
  type FirestoreUserPlaceState,
  type UserPlaceState,
  type UserPlaceWriteAction,
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
  const userPlaceStateDocument = getUserPlaceStateDocument(uid, placeId);

  if (!nextState || !hasPersistedUserPlaceState(nextState)) {
    await deleteDoc(userPlaceStateDocument);
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
      break;
    case 'markCollected':
      payload.collected = true;
      payload.collectedAt = serverTimestamp();
      break;
  }

  await setDoc(userPlaceStateDocument, payload, { merge: true });
}
