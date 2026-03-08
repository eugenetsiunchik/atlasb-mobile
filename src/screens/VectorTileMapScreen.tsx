import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';

import { requireAuthForAction } from '../services/auth';
import { buildLocalUrl, getLocalTileHost } from '../utils/localTiles';

type AnyStyle = Record<string, unknown> & {
  version?: number;
  sources?: Record<string, { tiles?: string[]; url?: string }>;
  glyphs?: string;
  sprite?: string;
};

const STYLE_PATH = '/styles/style-dark.json';

type VectorTileMapScreenProps = {
  hostOverride?: string;
};

function getOrigin(url: string) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}

function absolutizeUrl(input: unknown, origin: string) {
  if (typeof input !== 'string') return input;
  if (input.startsWith('http://') || input.startsWith('https://') || input.startsWith('file://')) {
    return input;
  }
  if (input.startsWith('/')) return `${origin}${input}`;
  return `${origin}/${input}`;
}

function absolutizeStyle(style: AnyStyle, origin: string): AnyStyle {
  const next: AnyStyle = { ...style };

  if (next.glyphs) next.glyphs = String(absolutizeUrl(next.glyphs, origin));
  if (next.sprite) next.sprite = String(absolutizeUrl(next.sprite, origin));

  if (next.sources) {
    const sources: AnyStyle['sources'] = { ...next.sources };
    for (const [k, v] of Object.entries(sources)) {
      const src = { ...v };
      if (Array.isArray(src.tiles)) {
        src.tiles = src.tiles.map(t => String(absolutizeUrl(t, origin)));
      }
      if (typeof src.url === 'string') {
        src.url = String(absolutizeUrl(src.url, origin));
      }
      sources[k] = src;
    }
    next.sources = sources;
  }

  return next;
}

export function VectorTileMapScreen({
  hostOverride = '',
}: VectorTileMapScreenProps) {
  const hostAuto = React.useMemo(() => getLocalTileHost(), []);
  const host = hostOverride.trim() ? hostOverride.trim() : hostAuto ?? '';
  const styleURL = React.useMemo(
    () => buildLocalUrl(STYLE_PATH, { hostOverride: host }) ?? '',
    [host],
  );
  const origin = getOrigin(styleURL);

  const [mapStyle, setMapStyle] = React.useState<string | AnyStyle>(
    styleURL || '',
  );

  const [errorText, setErrorText] = React.useState<string>('');

  const handleUploadPost = React.useCallback(() => {
    if (!requireAuthForAction('uploadPost')) {
      return;
    }

    Alert.alert('Post flow', 'Authenticated users can continue into the upload flow from here.');
  }, []);

  const handleSuggestEdit = React.useCallback(() => {
    if (!requireAuthForAction('suggestEdit')) {
      return;
    }

    Alert.alert('Suggest edit', 'Authenticated users can continue into the edit suggestion flow from here.');
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErrorText('');
        if (!styleURL) {
          setErrorText(
            'Local tile host is not set. On physical devices, enter your computer LAN IP.',
          );
          return;
        }
        const res = await fetch(styleURL);
        const text = await res.text();
        if (!res.ok) throw new Error(`Failed to load style (${res.status})`);
        const json: unknown = JSON.parse(text);
        if (cancelled) return;

        const styleObj = (json ?? {}) as AnyStyle;
        setMapStyle(absolutizeStyle(styleObj, origin));
      } catch (e) {
        if (cancelled) return;
        // Let MapLibre try to load the original style URL (it may surface a more
        // detailed native error than our fetch path).
        setMapStyle(styleURL);
        setErrorText(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [origin, styleURL]);

  return (
    <View className="flex-1">
      {!!styleURL && (
        <MapLibreGL.MapView style={styles.map} mapStyle={mapStyle}>
          <MapLibreGL.Camera
            zoomLevel={10.22}
            centerCoordinate={[23.995, 53.6847]}
          />
        </MapLibreGL.MapView>
      )}
      {!!errorText && (
        <View className="absolute left-4 right-4 top-4 rounded-xl bg-rose-800/95 px-3 py-2.5">
          <Text className="text-xs text-white">
            {errorText}
            {'\n'}Tip: make sure the server is reachable from the device.
            {hostAuto ? ` Auto-detected host: ${hostAuto}.` : ''}
          </Text>
        </View>
      )}
      <View className="absolute bottom-6 left-4 right-4 gap-2 rounded-2xl bg-white/92 p-3">
        <Text className="text-sm font-semibold text-neutral-950">
          Guest-first actions
        </Text>
        <Text className="text-xs leading-4 text-neutral-500">
          Browsing stays open. Posting and edit suggestions ask for sign-in only when needed.
        </Text>
        <View className="flex-row gap-2">
          <Pressable
            className="flex-1 items-center rounded-xl bg-sky-600 px-3 py-3"
            onPress={handleUploadPost}
          >
            <Text className="text-sm font-semibold text-white">Create post</Text>
          </Pressable>
          <Pressable
            className="flex-1 items-center rounded-xl border border-neutral-300 bg-white px-3 py-3"
            onPress={handleSuggestEdit}
          >
            <Text className="text-sm font-semibold text-neutral-900">Suggest edit</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});

