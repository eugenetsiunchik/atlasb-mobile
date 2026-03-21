import {
  collection,
  doc,
  getDoc,
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
const PLACE_MEDIA_SUBCOLLECTION_NAME = 'media';
const ACTIVE_PLACE_STATUS = 'active';
const DEFAULT_VISIT_VERIFICATION_RADIUS_METERS = 150;

type FirestoreGeoPointLike = {
  latitude: number;
  longitude: number;
};

type FirestorePlacePhoto = {
  originalUrl?: string;
  reviewStatus?: string;
  status?: string;
  thumbnails?: {
    large?: string;
    small?: string;
  };
};

type NormalizedPlaceRecord = PlaceMapItem & {
  coverMediaId: string | null;
};

const REGION_LABELS_BY_ID: Record<string, string> = {
  brest: 'Brest',
  gomel: 'Gomel',
  grodno: 'Grodno',
  hrodna: 'Hrodna',
  minsk: 'Minsk',
  'minsk-city': 'Minsk',
  'minsk-region': 'Minsk Region',
  mogilev: 'Mogilev',
  mahilyow: 'Mogilev',
  vitebsk: 'Vitebsk',
  unknown: 'Unknown region',
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

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readCoordinate(data: Record<string, unknown>): MapCoordinate | null {
  const nestedCandidates = [
    data.geo,
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

function toTitleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function readRegionId(data: Record<string, unknown>) {
  if (typeof data.regionId === 'string' && data.regionId.trim()) {
    return data.regionId.trim();
  }

  if (typeof data.region === 'string' && data.region.trim()) {
    return data.region.trim();
  }

  return 'unknown';
}

function getRegionLabel(regionId: string) {
  const normalizedRegionId = regionId.trim().toLowerCase();

  if (REGION_LABELS_BY_ID[normalizedRegionId]) {
    return REGION_LABELS_BY_ID[normalizedRegionId];
  }

  return toTitleCase(normalizedRegionId.replace(/[-_]+/g, ' '));
}

function normalizePlace(
  document: FirebaseFirestoreTypes.QueryDocumentSnapshot<FirebaseFirestoreTypes.DocumentData>,
): NormalizedPlaceRecord | null {
  const data = document.data();

  if (!isObject(data)) {
    return null;
  }

  const coordinate = readCoordinate(data);
  const name = readString(data.name) ?? '';
  const regionId = readRegionId(data);
  const region = getRegionLabel(regionId);
  const imageUrl = readString(data.imageUrl) ?? readString(data.image);
  const coverMediaId = readString(data.coverMediaId);
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

  if (!coordinate || !name) {
    return null;
  }

  return {
    id: document.id,
    imageUrl,
    thumbnailUrl: imageUrl,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    name,
    region,
    regionId,
    coverMediaId,
    allowManualVisitMarking,
    visitVerificationRadiusMeters,
  };
}

function getPlaceDocument(placeId: string) {
  return doc(collection(getFirebaseFirestore(), PLACES_COLLECTION_NAME), placeId);
}

function getPlaceCoverMediaDocument(placeId: string, mediaId: string) {
  return doc(collection(getPlaceDocument(placeId), PLACE_MEDIA_SUBCOLLECTION_NAME), mediaId);
}

function normalizeCoverMediaUrls(data: FirestorePlacePhoto | undefined) {
  if (!data || data.status !== 'READY') {
    return null;
  }

  if (typeof data.reviewStatus === 'string' && data.reviewStatus === 'REJECTED') {
    return null;
  }

  const small = readString(data.thumbnails?.small);
  const large = readString(data.thumbnails?.large);
  const original = readString(data.originalUrl);

  if (!small && !large && !original) {
    return null;
  }

  return {
    imageUrl: large ?? original ?? small,
    thumbnailUrl: small ?? large ?? original,
  };
}

async function hydratePlacesWithCoverMedia(places: NormalizedPlaceRecord[]) {
  return Promise.all(
    places.map(async place => {
      if (!place.coverMediaId) {
        return place;
      }

      const mediaPath = `${PLACES_COLLECTION_NAME}/${place.id}/${PLACE_MEDIA_SUBCOLLECTION_NAME}/${place.coverMediaId}`;

      try {
        const coverMediaSnapshot = await getDoc(
          getPlaceCoverMediaDocument(place.id, place.coverMediaId),
        );

        if (!coverMediaSnapshot.exists) {
          return place;
        }

        const coverMediaUrls = normalizeCoverMediaUrls(
          coverMediaSnapshot.data() as FirestorePlacePhoto | undefined,
        );

        if (!coverMediaUrls) {
          return place;
        }

        return {
          ...place,
          imageUrl: coverMediaUrls.imageUrl,
          thumbnailUrl: coverMediaUrls.thumbnailUrl,
        };
      } catch (error) {
        logFirebaseError(
          'Firestore get place cover media failed',
          {
            operation: 'getDoc',
            path: mediaPath,
            placeId: place.id,
          },
          error,
        );

        return place;
      }
    }),
  );
}

function applyFilters(places: PlaceMapItem[], filters: MapFilters) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const regionIds = new Set(filters.regionIds);

  return places.filter(place => {
    if (
      regionIds.size > 0 &&
      !regionIds.has(place.regionId) &&
      !regionIds.has(place.region)
    ) {
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
    filteredCount: filteredPlaces.length,
    filters,
    normalizedCount: normalizedPlaces.length,
  });
}

export function subscribeToPlaces(
  filters: MapFilters,
  options: {
    onError: (message: string) => void;
    onSuccess: (places: PlaceMapItem[]) => void;
  },
) {
  console.log('[Firebase] Subscribing to places', {
    filters,
    path: `${PLACES_COLLECTION_NAME}?status=${ACTIVE_PLACE_STATUS}`,
  });

  if (!isFirebaseConfigured()) {
    console.warn('[Firebase] Places subscription skipped because Firebase is not configured', {
      filters,
    });
    options.onError(getFirebaseConfigurationErrorMessage());
    return () => undefined;
  }

  const placesCollection = collection(getFirebaseFirestore(), PLACES_COLLECTION_NAME);
  const activePlacesQuery = query(
    placesCollection,
    where('status', '==', ACTIVE_PLACE_STATUS),
  );
  let isActive = true;

  const unsubscribe = onSnapshot(
    activePlacesQuery,
    async (snapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>) => {
      const normalizedPlaceRecords = snapshot.docs
        .map(normalizePlace)
        .filter((place): place is NormalizedPlaceRecord => place !== null)
        .sort((left, right) => left.name.localeCompare(right.name));
      const normalizedPlaces = await hydratePlacesWithCoverMedia(normalizedPlaceRecords);

      if (!isActive) {
        return;
      }

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

  return () => {
    isActive = false;
    unsubscribe();
  };
}
