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
  type ExploredTerritoryCell,
  type FirestoreExploredTerritoryCell,
  type TerritoryCellCoordinate,
} from '../types';
import { getTerritoryCellId } from '../utils/grid';

const USERS_COLLECTION_NAME = 'users';

function getTerritoryCellsCollection(uid: string) {
  return collection(
    doc(collection(getFirebaseFirestore(), USERS_COLLECTION_NAME), uid),
    TERRITORY_CELLS_SUBCOLLECTION_NAME,
  );
}

function getTerritoryCellDocument(uid: string, cellId: string) {
  return doc(getTerritoryCellsCollection(uid), cellId);
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

function normalizeTerritoryCell(
  documentSnapshot: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>,
): ExploredTerritoryCell | null {
  const data = documentSnapshot.data() as FirestoreExploredTerritoryCell | undefined;

  if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') {
    return null;
  }

  const gridZoom =
    typeof data.gridZoom === 'number' && Number.isFinite(data.gridZoom) ? data.gridZoom : null;

  if (gridZoom === null) {
    return null;
  }

  return {
    cellId:
      typeof data.cellId === 'string' && data.cellId.trim() ? data.cellId : documentSnapshot.id,
    createdAtMs: readTimestampMs(data.createdAt),
    gridZoom,
    updatedAtMs: readTimestampMs(data.updatedAt),
    x: data.x,
    y: data.y,
  };
}

export function subscribeToExploredTerritory(
  uid: string,
  options: {
    onError: (message: string) => void;
    onSuccess: (cells: ExploredTerritoryCell[]) => void;
  },
) {
  if (!isFirebaseConfigured()) {
    options.onError(getFirebaseConfigurationErrorMessage());
    return () => undefined;
  }

  return onSnapshot(
    getTerritoryCellsCollection(uid),
    snapshot => {
      const cells = snapshot.docs.map(normalizeTerritoryCell).filter(Boolean) as ExploredTerritoryCell[];

      options.onSuccess(cells);
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

export async function persistExploredTerritoryCells(params: {
  cells: TerritoryCellCoordinate[];
  uid: string;
}) {
  if (params.cells.length === 0 || !isFirebaseConfigured()) {
    return;
  }

  const firestore = getFirebaseFirestore();
  const batch = writeBatch(firestore);

  params.cells.forEach(cell => {
    const cellId = getTerritoryCellId(cell);

    batch.set(
      getTerritoryCellDocument(params.uid, cellId),
      {
        cellId,
        createdAt: serverTimestamp(),
        gridZoom: cell.gridZoom,
        updatedAt: serverTimestamp(),
        x: cell.x,
        y: cell.y,
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
        cellCount: params.cells.length,
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
