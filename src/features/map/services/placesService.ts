import {
  collection,
  onSnapshot,
  query,
  type FirebaseFirestoreTypes,
  where,
} from '@react-native-firebase/firestore';

import {
  getFirebaseConfigurationErrorMessage,
  getFirebaseFirestore,
  isFirebaseConfigured,
  logFirebaseError,
} from '../../../firebase';
import type { MapCoordinate, MapFilters, PlaceMapItem } from '../types';

const PLACES_COLLECTION_NAME = 'places';
const ACTIVE_PLACE_STATUS = 'active';
const DEFAULT_VISIT_VERIFICATION_RADIUS_METERS = 150;

type FirestoreGeoPointLike = {
  latitude: number;
  longitude: number;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isGeoPointLike(value: unknown): value is FirestoreGeoPointLike {
  return (
    isObject(value) &&
    typeof value.latitude === 'number' &&
    typeof value.longitude === 'number'
  );
}

function readCoordinate(data: Record<string, unknown>): MapCoordinate | null {
  const nestedCandidates = [
    data.location,
    data.coordinates,
    data.coordinate,
    data.geoPoint,
  ];

  for (const candidate of nestedCandidates) {
    if (isGeoPointLike(candidate)) {
      return {
        latitude: candidate.latitude,
        longitude: candidate.longitude,
      };
    }
  }

  const latitudeCandidates = [data.latitude, data.lat];
  const longitudeCandidates = [data.longitude, data.lng, data.lon];

  const latitude = latitudeCandidates.find(
    candidate => typeof candidate === 'number',
  );
  const longitude = longitudeCandidates.find(
    candidate => typeof candidate === 'number',
  );

  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return {
      latitude,
      longitude,
    };
  }

  return null;
}

function normalizePlace(
  document: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>,
): PlaceMapItem | null {
  const data = document.data();

  if (!isObject(data)) {
    return null;
  }

  const coordinate = readCoordinate(data);
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const region = typeof data.region === 'string' ? data.region.trim() : '';
  const imageUrl =
    typeof data.imageUrl === 'string' && data.imageUrl.trim()
      ? data.imageUrl.trim()
      : typeof data.image === 'string' && data.image.trim()
        ? data.image.trim()
        : null;
  const allowManualVisitMarking =
    data.allowManualVisitMarking === true || data.manualVisitAllowed === true;
  const visitVerificationRadiusMetersCandidate =
    typeof data.visitVerificationRadiusMeters === 'number'
      ? data.visitVerificationRadiusMeters
      : typeof data.visitRadiusMeters === 'number'
        ? data.visitRadiusMeters
        : null;
  const visitVerificationRadiusMeters =
    typeof visitVerificationRadiusMetersCandidate === 'number' &&
    Number.isFinite(visitVerificationRadiusMetersCandidate) &&
    visitVerificationRadiusMetersCandidate > 0
      ? visitVerificationRadiusMetersCandidate
      : DEFAULT_VISIT_VERIFICATION_RADIUS_METERS;

  if (!coordinate || !name || !region) {
    return null;
  }

  return {
    id: document.id,
    imageUrl,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    name,
    region,
    allowManualVisitMarking,
    visitVerificationRadiusMeters,
  };
}

function applyFilters(places: PlaceMapItem[], filters: MapFilters) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const regionIds = new Set(filters.regionIds);

  return places.filter(place => {
    if (regionIds.size > 0 && !regionIds.has(place.region)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return `${place.name} ${place.region}`
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

function logLoadedPlaces(params: {
  filters: MapFilters;
  filteredPlaces: PlaceMapItem[];
  normalizedPlaces: PlaceMapItem[];
  snapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>;
}) {
  const { filters, filteredPlaces, normalizedPlaces, snapshot } = params;

  console.log('[Firebase] Firestore loaded places', {
    fetchedCount: snapshot.size,
    fetchedDocuments: snapshot.docs.map(documentSnapshot => ({
      id: documentSnapshot.id,
      ...documentSnapshot.data(),
    })),
    filteredCount: filteredPlaces.length,
    filters,
    normalizedCount: normalizedPlaces.length,
    normalizedPlaces,
  });
}

export function subscribeToPlaces(
  filters: MapFilters,
  options: {
    onError: (message: string) => void;
    onSuccess: (places: PlaceMapItem[]) => void;
  },
) {
  if (!isFirebaseConfigured()) {
    options.onError(getFirebaseConfigurationErrorMessage());
    return () => undefined;
  }

  const placesCollection = collection(getFirebaseFirestore(), PLACES_COLLECTION_NAME);
  const activePlacesQuery = query(
    placesCollection,
    where('status', '==', ACTIVE_PLACE_STATUS),
  );

  return onSnapshot(
    activePlacesQuery,
    (snapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>) => {
      const normalizedPlaces = snapshot.docs
        .map(normalizePlace)
        .filter((place): place is PlaceMapItem => place !== null)
        .sort((left, right) => left.name.localeCompare(right.name));
      const filteredPlaces = applyFilters(normalizedPlaces, filters);

      logLoadedPlaces({
        filteredPlaces,
        filters,
        normalizedPlaces,
        snapshot,
      });

      options.onSuccess(filteredPlaces);
    },
    error => {
      logFirebaseError(
        'Firestore subscribe places failed',
        {
          filters,
          operation: 'onSnapshot',
          path: `${PLACES_COLLECTION_NAME}?status=${ACTIVE_PLACE_STATUS}`,
        },
        error,
      );
      options.onError(
        error instanceof Error
          ? error.message
          : 'Unable to load places from Firestore.',
      );
    },
  );
}
