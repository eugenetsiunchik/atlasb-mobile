import { Platform } from 'react-native';
import {
  check,
  openSettings,
  PERMISSIONS,
  request,
  RESULTS,
  type PermissionStatus,
  type Rationale,
} from 'react-native-permissions';

import type { MapLocationPermission } from '../types';

const LOCATION_PERMISSION =
  Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : Platform.OS === 'android'
      ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
      : null;

const ANDROID_LOCATION_RATIONALE: Rationale = {
  buttonNegative: 'Not now',
  buttonPositive: 'Allow',
  message: 'AtlasB uses your location to verify place check-ins and help you navigate nearby places.',
  title: 'Allow location access',
};

function mapPermissionStatus(status: PermissionStatus): MapLocationPermission {
  switch (status) {
    case RESULTS.GRANTED:
    case RESULTS.LIMITED:
      return 'granted';
    case RESULTS.BLOCKED:
      return 'blocked';
    case RESULTS.DENIED:
      return 'denied';
    case RESULTS.UNAVAILABLE:
    default:
      return 'unavailable';
  }
}

export async function checkLocationPermission(): Promise<MapLocationPermission> {
  if (!LOCATION_PERMISSION) {
    return 'unavailable';
  }

  return mapPermissionStatus(await check(LOCATION_PERMISSION));
}

export async function requestLocationPermission(): Promise<MapLocationPermission> {
  if (!LOCATION_PERMISSION) {
    return 'unavailable';
  }

  const status = await request(
    LOCATION_PERMISSION,
    Platform.OS === 'android' ? ANDROID_LOCATION_RATIONALE : undefined,
  );

  return mapPermissionStatus(status);
}

export async function openAppPermissionSettings() {
  await openSettings('application');
}
