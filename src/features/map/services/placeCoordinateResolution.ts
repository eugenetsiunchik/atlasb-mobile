import type {
  MapCoordinate,
  PlaceCoordinatePrecision,
  PlaceCoordinateSource,
} from '../types';

type FirestoreGeoPointLike = {
  latitude: number;
  longitude: number;
};

type CoordinateCandidate = {
  coordinate: MapCoordinate;
  precision: PlaceCoordinatePrecision;
  source: PlaceCoordinateSource;
};

const DEFAULT_SETTLEMENT_APPROXIMATE_RADIUS_METERS = 6_000;
const DEFAULT_REGION_APPROXIMATE_RADIUS_METERS = 35_000;

const REGION_CENTER_BY_ID: Record<string, MapCoordinate> = {
  brest: {
    latitude: 52.09755,
    longitude: 23.68775,
  },
  gomel: {
    latitude: 52.4345,
    longitude: 30.9754,
  },
  grodno: {
    latitude: 53.6694,
    longitude: 23.8131,
  },
  hrodna: {
    latitude: 53.6694,
    longitude: 23.8131,
  },
  mahilyow: {
    latitude: 53.898,
    longitude: 30.332,
  },
  minsk: {
    latitude: 53.9006,
    longitude: 27.559,
  },
  'minsk-city': {
    latitude: 53.9006,
    longitude: 27.559,
  },
  'minsk-region': {
    latitude: 53.9006,
    longitude: 27.559,
  },
  mogilev: {
    latitude: 53.898,
    longitude: 30.332,
  },
  vitebsk: {
    latitude: 55.1904,
    longitude: 30.2049,
  },
};

export type ResolvedPlaceCoordinate = {
  approximateRadiusMeters: number | null;
  coordinatePrecision: PlaceCoordinatePrecision;
  coordinateSource: PlaceCoordinateSource;
  latitude: number;
  longitude: number;
  preciseLocationMissing: boolean;
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

function readPositiveNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function toCoordinate(value: FirestoreGeoPointLike): MapCoordinate {
  return {
    latitude: value.latitude,
    longitude: value.longitude,
  };
}

function readLatLngCoordinate(data: Record<string, unknown>) {
  const latitudeCandidates = [data.latitude, data.lat];
  const longitudeCandidates = [data.longitude, data.lng, data.lon];
  const latitude = latitudeCandidates.find(candidate => typeof candidate === 'number');
  const longitude = longitudeCandidates.find(candidate => typeof candidate === 'number');

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function readExactCoordinateCandidate(data: Record<string, unknown>): CoordinateCandidate | null {
  const nestedCandidates: Array<[unknown, PlaceCoordinateSource]> = [
    [data.geo, 'geo'],
    [data.location, 'location'],
    [data.coordinates, 'coordinates'],
    [data.coordinate, 'coordinate'],
    [data.geoPoint, 'geoPoint'],
  ];

  for (const [candidate, source] of nestedCandidates) {
    if (isGeoPointLike(candidate)) {
      return {
        coordinate: toCoordinate(candidate),
        precision: 'exact',
        source,
      };
    }
  }

  const latLngCoordinate = readLatLngCoordinate(data);

  if (!latLngCoordinate) {
    return null;
  }

  return {
    coordinate: latLngCoordinate,
    precision: 'exact',
    source: 'latLng',
  };
}

function readApproximateCoordinateCandidate(
  data: Record<string, unknown>,
  regionId: string,
): CoordinateCandidate | null {
  const approximateCandidates: Array<[unknown, PlaceCoordinateSource]> = [
    [data.settlementGeo, 'settlementGeo'],
    [data.approximateGeo, 'approximateGeo'],
    [data.regionGeo, 'regionGeo'],
  ];

  for (const [candidate, source] of approximateCandidates) {
    if (isGeoPointLike(candidate)) {
      return {
        coordinate: toCoordinate(candidate),
        precision: 'approximate',
        source,
      };
    }
  }

  const regionCenter = REGION_CENTER_BY_ID[regionId.trim().toLowerCase()];

  if (!regionCenter) {
    return null;
  }

  return {
    coordinate: regionCenter,
    precision: 'approximate',
    source: 'regionCenter',
  };
}

function readApproximateRadiusMeters(
  data: Record<string, unknown>,
  source: PlaceCoordinateSource,
) {
  const configuredRadius =
    readPositiveNumber(data.approximateRadiusMeters) ??
    readPositiveNumber(data.discoveryRadiusMeters) ??
    readPositiveNumber(data.locationQuestRadiusMeters);

  if (configuredRadius) {
    return configuredRadius;
  }

  if (source === 'settlementGeo' || source === 'approximateGeo') {
    return DEFAULT_SETTLEMENT_APPROXIMATE_RADIUS_METERS;
  }

  if (source === 'regionCenter' || source === 'regionGeo') {
    return DEFAULT_REGION_APPROXIMATE_RADIUS_METERS;
  }

  return null;
}

export function resolvePlaceCoordinate(data: Record<string, unknown>, regionId: string) {
  const exactCandidate = readExactCoordinateCandidate(data);

  if (exactCandidate) {
    return {
      approximateRadiusMeters: null,
      coordinatePrecision: exactCandidate.precision,
      coordinateSource: exactCandidate.source,
      latitude: exactCandidate.coordinate.latitude,
      longitude: exactCandidate.coordinate.longitude,
      preciseLocationMissing: false,
    } satisfies ResolvedPlaceCoordinate;
  }

  const approximateCandidate = readApproximateCoordinateCandidate(data, regionId);

  if (!approximateCandidate) {
    return null;
  }

  return {
    approximateRadiusMeters: readApproximateRadiusMeters(data, approximateCandidate.source),
    coordinatePrecision: approximateCandidate.precision,
    coordinateSource: approximateCandidate.source,
    latitude: approximateCandidate.coordinate.latitude,
    longitude: approximateCandidate.coordinate.longitude,
    preciseLocationMissing: true,
  } satisfies ResolvedPlaceCoordinate;
}
