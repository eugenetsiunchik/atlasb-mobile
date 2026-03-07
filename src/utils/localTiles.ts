import { NativeModules, Platform } from 'react-native';

import { activeMapEnvironment } from '../config/activeMapEnvironment';
import { getDevServerHost } from './devServer';

/**
 * iOS simulator: `localhost` -> host machine
 * Android emulator: use `10.0.2.2` -> host machine
 * Physical device: use your LAN IP for `local`, or select a fixed URL via the
 * active map environment config.
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

function getLocalTileBaseUrl(): string | null {
  const baseUrl = activeMapEnvironment.baseUrl?.trim();
  if (!baseUrl) return null;

  try {
    const parsed = new URL(baseUrl);
    const pathname =
      parsed.pathname && parsed.pathname !== '/'
        ? parsed.pathname.replace(/\/+$/, '')
        : '';
    return `${parsed.protocol}//${parsed.host}${pathname}`;
  } catch {
    return null;
  }
}

export function getLocalTileHost(): string | null {
  const baseUrl = getLocalTileBaseUrl();
  if (baseUrl) {
    try {
      return new URL(baseUrl).hostname || null;
    } catch {
      return null;
    }
  }

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
  const baseUrl = getLocalTileBaseUrl();
  if (baseUrl && !override && typeof opts?.port !== 'number') {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  }

  const host = override ? override : getLocalTileHost();
  if (!host) return null;

  const normalized = path.startsWith('/') ? path : `/${path}`;
  const configuredBaseUrl = baseUrl ? new URL(baseUrl) : null;
  const protocol = configuredBaseUrl?.protocol === 'https:' ? 'https' : 'http';
  const port =
    typeof opts?.port === 'number'
      ? opts.port
      : configuredBaseUrl?.port
        ? Number(configuredBaseUrl.port)
        : undefined;
  const portPart = typeof port === 'number' ? `:${port}` : '';
  return `${protocol}://${host}${portPart}${normalized}`;
}

