import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  type FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

import {
  getFirebaseConfigurationErrorMessage,
  getFirebaseFirestore,
  isFirebaseConfigured,
  logFirebaseError,
} from '../../../firebase';
import {
  TERRITORY_CELLS_SUBCOLLECTION_NAME,
  type ExploredTerritoryReveal,
  type FirestoreExploredTerritoryReveal,
} from '../types';

const USERS_COLLECTION_NAME = 'users';

function getTerritoryCellsCollection(uid: string) {
  return collection(
    doc(collection(getFirebaseFirestore(), USERS_COLLECTION_NAME), uid),
    TERRITORY_CELLS_SUBCOLLECTION_NAME,
  );
}

function getTerritoryRevealDocument(uid: string, revealId: string) {
  return doc(getTerritoryCellsCollection(uid), revealId);
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

function normalizeTerritoryReveal(
  documentSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>,
): ExploredTerritoryReveal | null {
  const data = documentSnapshot.data() as FirestoreExploredTerritoryReveal | undefined;

  if (
    !data ||
    typeof data.latitude !== 'number' ||
    typeof data.longitude !== 'number' ||
    typeof data.radiusMeters !== 'number'
  ) {
    return null;
  }

  return {
    createdAtMs: readTimestampMs(data.createdAt),
    headingDegrees:
      typeof data.headingDegrees === 'number' && Number.isFinite(data.headingDegrees)
        ? data.headingDegrees
        : null,
    latitude: data.latitude,
    longitude: data.longitude,
    radiusMeters: data.radiusMeters,
    revealId:
      typeof data.revealId === 'string' && data.revealId.trim()
        ? data.revealId
        : documentSnapshot.id,
    updatedAtMs: readTimestampMs(data.updatedAt),
  };
}

export function subscribeToExploredTerritory(
  uid: string,
  options: {
    onError: (message: string) => void;
    onSuccess: (reveals: ExploredTerritoryReveal[]) => void;
  },
) {
  if (!isFirebaseConfigured()) {
    options.onError(getFirebaseConfigurationErrorMessage());
    return () => undefined;
  }

  return onSnapshot(
    getTerritoryCellsCollection(uid),
    snapshot => {
      const reveals = snapshot.docs
        .map(normalizeTerritoryReveal)
        .filter(Boolean) as ExploredTerritoryReveal[];

      options.onSuccess(reveals);
    },
    error => {
      logFirebaseError(
        'Firestore subscribe explored territory failed',
        {
          operation: 'onSnapshot',
          path: `users/${uid}/${TERRITORY_CELLS_SUBCOLLECTION_NAME}`,
          uid,
        },
        error,
      );
      options.onError(
        error instanceof Error
          ? error.message
          : 'Unable to load explored territory from Firestore.',
      );
    },
  );
}

export async function persistExploredTerritoryReveals(params: {
  reveals: ExploredTerritoryReveal[];
  uid: string;
}) {
  if (params.reveals.length === 0 || !isFirebaseConfigured()) {
    return;
  }

  const firestore = getFirebaseFirestore();
  const batch = writeBatch(firestore);

  params.reveals.forEach(reveal => {
    batch.set(
      getTerritoryRevealDocument(params.uid, reveal.revealId),
      {
        createdAt: serverTimestamp(),
        headingDegrees: reveal.headingDegrees,
        latitude: reveal.latitude,
        longitude: reveal.longitude,
        radiusMeters: reveal.radiusMeters,
        revealId: reveal.revealId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  try {
    await batch.commit();
  } catch (error) {
    logFirebaseError(
      'Firestore write explored territory failed',
      {
        revealCount: params.reveals.length,
        operation: 'writeBatch',
        path: `users/${params.uid}/${TERRITORY_CELLS_SUBCOLLECTION_NAME}`,
        uid: params.uid,
      },
      error,
    );
    throw error;
  }
}

export async function clearExploredTerritory(uid: string) {
  if (!isFirebaseConfigured()) {
    return;
  }

  const snapshot = await getDocs(getTerritoryCellsCollection(uid));

  if (snapshot.empty) {
    return;
  }

  const firestore = getFirebaseFirestore();
  const documents = snapshot.docs;

  try {
    for (let index = 0; index < documents.length; index += 450) {
      const batch = writeBatch(firestore);

      documents
        .slice(index, index + 450)
        .forEach(
          (
            documentSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>,
          ) => {
        batch.delete(documentSnapshot.ref);
          },
        );

      await batch.commit();
    }
  } catch (error) {
    logFirebaseError(
      'Firestore clear explored territory failed',
      {
        cellCount: documents.length,
        operation: 'writeBatch.delete',
        path: `users/${uid}/${TERRITORY_CELLS_SUBCOLLECTION_NAME}`,
        uid,
      },
      error,
    );
    throw error;
  }
}
