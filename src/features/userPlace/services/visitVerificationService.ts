import type {
  MapCoordinate,
  MapLocationPermission,
  MapUserLocation,
  PlaceMapItem,
} from '../../map/types';
import type { UserPlaceVisitRecord } from '../types';
import { getDistanceBetweenCoordinatesMeters } from '../utils/distance';

export const MAX_VISIT_GPS_ACCURACY_METERS = 100;
export const MAX_VISIT_LOCATION_AGE_MS = 30_000;

export type VisitVerificationResult =
  | {
      message: string;
      record: UserPlaceVisitRecord;
      status: 'verified';
    }
  | {
      message: string;
      record: UserPlaceVisitRecord | null;
      status: 'too-far';
    }
  | {
      message: string;
      status: 'weak-signal';
    };

function createVisitRecord(params: {
  distanceMeters: number | null;
  location: MapUserLocation | null;
  method: UserPlaceVisitRecord['method'];
  radiusMeters: number;
  verified: boolean;
}): UserPlaceVisitRecord {
  const { distanceMeters, location, method, radiusMeters, verified } = params;

  return {
    coordinates: location
      ? {
          accuracyMeters: location.accuracyMeters,
          capturedAtMs: location.capturedAtMs,
          latitude: location.latitude,
          longitude: location.longitude,
        }
      : null,
    distanceMeters,
    method,
    radiusMeters,
    verified,
  };
}

export function evaluateVisitVerification(params: {
  location: MapUserLocation | null;
  nowMs?: number;
  place: Pick<
    PlaceMapItem,
    | 'allowManualVisitMarking'
    | 'latitude'
    | 'longitude'
    | 'name'
    | 'visitVerificationRadiusMeters'
  >;
}): VisitVerificationResult {
  const { location, nowMs = Date.now(), place } = params;

  if (!location || nowMs - location.capturedAtMs > MAX_VISIT_LOCATION_AGE_MS) {
    return {
      message: 'GPS signal looks weak right now. Wait for a fresh location fix and try again.',
      status: 'weak-signal',
    };
  }

  if (
    typeof location.accuracyMeters === 'number' &&
    location.accuracyMeters > MAX_VISIT_GPS_ACCURACY_METERS
  ) {
    return {
      message: 'GPS accuracy is too weak right now. Move closer to open sky and try again.',
      status: 'weak-signal',
    };
  }

  const placeCoordinate: MapCoordinate = {
    latitude: place.latitude,
    longitude: place.longitude,
  };
  const distanceMeters = getDistanceBetweenCoordinatesMeters(location, placeCoordinate);

  if (distanceMeters <= place.visitVerificationRadiusMeters) {
    return {
      message: `Check-in verified. You are within ${Math.round(
        place.visitVerificationRadiusMeters,
      )}m of ${place.name}.`,
      record: createVisitRecord({
        distanceMeters,
        location,
        method: 'gps',
        radiusMeters: place.visitVerificationRadiusMeters,
        verified: true,
      }),
      status: 'verified',
    };
  }

  return {
    message: place.allowManualVisitMarking
      ? `You are about ${Math.round(
          distanceMeters,
        )}m away, so GPS could not verify this visit. You can still mark it manually.`
      : `You are about ${Math.round(
          distanceMeters,
        )}m away, which is outside the check-in radius for this place.`,
    record: place.allowManualVisitMarking
      ? createVisitRecord({
          distanceMeters,
          location,
          method: 'manual',
          radiusMeters: place.visitVerificationRadiusMeters,
          verified: false,
        })
      : null,
    status: 'too-far',
  };
}

export function getPermissionDeniedVisitMessage(permission: MapLocationPermission) {
  if (permission === 'blocked') {
    return 'Location permission is blocked. Enable it in system settings to verify this visit by GPS.';
  }

  if (permission === 'unavailable') {
    return 'Location services are unavailable on this device right now, so GPS cannot verify this visit.';
  }

  return 'Location permission is off. Enable it to verify this visit by GPS.';
}
