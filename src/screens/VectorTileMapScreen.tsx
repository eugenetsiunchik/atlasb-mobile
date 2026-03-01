import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';

import { buildLocalUrl, getLocalTileHost } from '../utils/localTiles';

type AnyStyle = Record<string, unknown> & {
  version?: number;
  sources?: Record<string, { tiles?: string[]; url?: string }>;
  glyphs?: string;
  sprite?: string;
};

const STYLE_PATH = '/styles/style-dark.json';

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

export function VectorTileMapScreen() {
  const [hostOverride, setHostOverride] = React.useState<string>('');
  const [portOverride, setPortOverride] = React.useState<string>('');
  const hostAuto = React.useMemo(() => getLocalTileHost(), []);
  const host = hostOverride.trim() ? hostOverride.trim() : hostAuto ?? '';
  const port = React.useMemo(() => {
    const t = portOverride.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? n : undefined;
  }, [portOverride]);
  const styleURL = React.useMemo(
    () => buildLocalUrl(STYLE_PATH, { hostOverride: host, port }) ?? '',
    [host, port],
  );
  const origin = getOrigin(styleURL);

  const [mapStyle, setMapStyle] = React.useState<string | AnyStyle>(
    styleURL || '',
  );
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [errorText, setErrorText] = React.useState<string>('');

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setErrorText('');
        if (!styleURL) {
          setStatus('error');
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
        setStatus('ready');
      } catch (e) {
        if (cancelled) return;
        setStatus('error');
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
    <View style={styles.container}>
      <Text style={styles.title}>Vector tiles (local)</Text>
      <Text style={styles.subtitle}>
        {styleURL || '(no local tile host configured)'} ({status})
      </Text>
      <View style={styles.row}>
        <Text style={styles.label}>Host</Text>
        <TextInput
          value={hostOverride}
          onChangeText={setHostOverride}
          placeholder={hostAuto ?? '192.168.x.x'}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
        />
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Port</Text>
        <TextInput
          value={portOverride}
          onChangeText={setPortOverride}
          placeholder="(optional)"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>
      {!!errorText && (
        <Text style={styles.error}>
          {errorText}
          {'\n'}Tip: make sure the server is reachable at the URL above.
        </Text>
      )}

      {!!styleURL && (
        <MapLibreGL.MapView style={styles.map} mapStyle={mapStyle}>
          <MapLibreGL.Camera
            zoomLevel={10.22}
            centerCoordinate={[23.995, 53.6847]}
          />
        </MapLibreGL.MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    width: 40,
    color: '#444',
    fontSize: 12,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
  },
  error: {
    fontSize: 12,
    color: '#b00020',
  },
  map: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

