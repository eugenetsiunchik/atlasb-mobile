import { NativeModules, Platform } from 'react-native';

import { getDevServerHost } from './devServer';

/**
 * iOS simulator: `localhost` -> host machine
 * Android emulator: use `10.0.2.2` -> host machine
 * Physical device: use your LAN IP (override via `LOCAL_TILE_HOST`).
 */
function isAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') return false;
  const c = (NativeModules as unknown as { PlatformConstants?: Record<string, unknown> })
    .PlatformConstants;

  const fingerprint = String(c?.Fingerprint ?? '');
  const model = String(c?.Model ?? '');
  const brand = String(c?.Brand ?? '');
  const device = String(c?.Device ?? '');
  const manufacturer = String(c?.Manufacturer ?? '');

  return (
    fingerprint.includes('generic') ||
    fingerprint.includes('unknown') ||
    model.includes('google_sdk') ||
    model.includes('Emulator') ||
    model.includes('Android SDK built for') ||
    manufacturer.includes('Genymotion') ||
    brand.startsWith('generic') ||
    device.startsWith('generic')
  );
}

export function getLocalTileHost(): string | null {
  const override = (globalThis as unknown as { LOCAL_TILE_HOST?: string })
    .LOCAL_TILE_HOST;
  if (override) return override;

  // In dev, Metro already points at your host machine; reuse that host for
  // local tile/style server URLs to avoid manual IP lookup.
  const devHost = getDevServerHost();
  if (devHost) return devHost;

  if (Platform.OS === 'android') {
    // 10.0.2.2 is emulator-only. On physical devices, the host machine is only
    // reachable via LAN IP, so we force an explicit override.
    return isAndroidEmulator() ? '10.0.2.2' : null;
  }

  // iOS simulator uses localhost. On physical iOS devices, users must override.
  return 'localhost';
}

export function buildLocalUrl(
  path: string,
  opts?: { hostOverride?: string; port?: number },
) {
  const override = opts?.hostOverride?.trim();
  const host = override ? override : getLocalTileHost();
  if (!host) return null;

  const normalized = path.startsWith('/') ? path : `/${path}`;
  const portPart = typeof opts?.port === 'number' ? `:${opts.port}` : '';
  return `http://${host}${portPart}${normalized}`;
}

