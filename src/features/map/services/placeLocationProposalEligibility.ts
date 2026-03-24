import type { MapLocationPermission, MapUserLocation } from '../types';
import {
  MAX_VISIT_GPS_ACCURACY_METERS,
  MAX_VISIT_LOCATION_AGE_MS,
} from '../../userPlace/services/visitVerificationService';

export type LocationProposalEligibilityResult =
  | {
      coordinates: MapUserLocation;
      status: 'ready';
    }
  | {
      message: string;
      status: 'weak-signal';
    };

export function evaluateLocationProposalEligibility(params: {
  location: MapUserLocation | null;
  nowMs?: number;
}): LocationProposalEligibilityResult {
  const { location, nowMs = Date.now() } = params;

  if (!location || nowMs - location.capturedAtMs > MAX_VISIT_LOCATION_AGE_MS) {
    return {
      message: 'AtlasB needs a fresh GPS fix before you can submit a precise location.',
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

  return {
    coordinates: location,
    status: 'ready',
  };
}

export function getPermissionDeniedLocationProposalMessage(permission: MapLocationPermission) {
  if (permission === 'blocked') {
    return 'Location permission is blocked. Enable it in system settings before submitting a precise location.';
  }

  if (permission === 'unavailable') {
    return 'Location services are unavailable on this device right now, so AtlasB cannot capture a precise location.';
  }

  return 'Location permission is off. Enable it to submit a precise location.';
}
