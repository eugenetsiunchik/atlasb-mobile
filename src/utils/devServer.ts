import { NativeModules } from 'react-native';

/**
 * Returns the host Metro is using (usually your machine LAN IP on devices).
 * Works in dev/debug builds; returns null in release (file:// bundle).
 */
export function getDevServerHost(): string | null {
  const scriptURL = String(
    (NativeModules as unknown as { SourceCode?: { scriptURL?: string } })
      ?.SourceCode?.scriptURL ?? '',
  );

  if (!scriptURL) return null;
  if (scriptURL.startsWith('file://')) return null;

  try {
    const u = new URL(scriptURL);
    return u.hostname || null;
  } catch {
    // Some RN setups may provide scriptURL without protocol; best-effort parse.
    const match = scriptURL.match(/^(?:https?:\/\/)?([^:/?#]+)(?::\d+)?/i);
    return match?.[1] ? match[1] : null;
  }
}

