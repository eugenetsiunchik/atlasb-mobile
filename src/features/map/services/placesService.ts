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

type PlaceImageUrls = Pick<PlaceMapItem, 'imageUrl' | 'thumbnailUrl'>;

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

const coverMediaUrlRequests = new Map<string, Promise<PlaceImageUrls | null>>();

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
    data.settlementGeo,
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

function readImageUrls(data: Record<string, unknown>): PlaceImageUrls {
  const imageUrl =
    readString(data.imageUrl) ??
    readString(data.coverImageUrl) ??
    readString(data.originalUrl) ??
    readString(data.image);
  const thumbnailUrl =
    readString(data.thumbnailUrl) ??
    readString(data.coverThumbnailUrl) ??
    imageUrl;

  return {
    imageUrl,
    thumbnailUrl,
  };
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

function getRegionLabel(regionId: string, data: Record<string, unknown>) {
  const oblastName = readString(data.oblastName);

  if (oblastName) {
    return oblastName;
  }

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
  const region = getRegionLabel(regionId, data);
  const { imageUrl, thumbnailUrl } = readImageUrls(data);
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
    coverMediaId,
    imageUrl,
    thumbnailUrl,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    name,
    region,
    regionId,
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

async function fetchCoverMediaUrls(placeId: string, mediaId: string) {
  const cacheKey = `${placeId}:${mediaId}`;
  const cachedRequest = coverMediaUrlRequests.get(cacheKey);

  if (cachedRequest) {
    return cachedRequest;
  }

  const request = (async () => {
    const mediaPath = `${PLACES_COLLECTION_NAME}/${placeId}/${PLACE_MEDIA_SUBCOLLECTION_NAME}/${mediaId}`;

    try {
      const coverMediaSnapshot = await getDoc(getPlaceCoverMediaDocument(placeId, mediaId));

      if (!coverMediaSnapshot.exists) {
        coverMediaUrlRequests.delete(cacheKey);
        return null;
      }

      const coverMediaUrls = normalizeCoverMediaUrls(
        coverMediaSnapshot.data() as FirestorePlacePhoto | undefined,
      );

      if (!coverMediaUrls) {
        coverMediaUrlRequests.delete(cacheKey);
      }

      return coverMediaUrls;
    } catch (error) {
      coverMediaUrlRequests.delete(cacheKey);
      logFirebaseError(
        'Firestore get place cover media failed',
        {
          operation: 'getDoc',
          path: mediaPath,
          placeId,
        },
        error,
      );

      return null;
    }
  })();

  coverMediaUrlRequests.set(cacheKey, request);

  return request;
}

export async function loadPlaceImageUrls(
  place: Pick<PlaceMapItem, 'coverMediaId' | 'id' | 'imageUrl' | 'thumbnailUrl'>,
): Promise<PlaceImageUrls | null> {
  if (place.imageUrl || place.thumbnailUrl) {
    return {
      imageUrl: place.imageUrl,
      thumbnailUrl: place.thumbnailUrl,
    };
  }

  if (!place.coverMediaId) {
    return null;
  }

  return fetchCoverMediaUrls(place.id, place.coverMediaId);
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
    (snapshot: FirebaseFirestoreTypes.QuerySnapshot<FirebaseFirestoreTypes.DocumentData>) => {
      const normalizedPlaceRecords = snapshot.docs
        .map(normalizePlace)
        .filter((place): place is NormalizedPlaceRecord => place !== null)
        .sort((left, right) => left.name.localeCompare(right.name));
      const normalizedPlaces: PlaceMapItem[] = normalizedPlaceRecords;

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
