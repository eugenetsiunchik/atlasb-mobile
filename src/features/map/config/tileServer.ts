import { buildLocalUrl } from '../../../utils/localTiles';
import type { MapTileServerConfig } from '../types';

type MapLibreStyle = Record<string, unknown> & {
  glyphs?: string;
  layers?: Array<Record<string, unknown>>;
  sources?: Record<
    string,
    Record<string, unknown> & {
      tiles?: string[];
      url?: string;
    }
  >;
  sprite?: string;
  version?: number;
};

const DEFAULT_STYLE_PATH = '/styles/style-dark.json';
const DEFAULT_RASTER_TILES_PATH = '/tiles/{z}/{x}/{y}.png';

function getOrigin(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
}

function absolutizeUrl(input: unknown, origin: string) {
  if (typeof input !== 'string') {
    return input;
  }

  if (
    input.startsWith('http://') ||
    input.startsWith('https://') ||
    input.startsWith('file://')
  ) {
    return input;
  }

  if (input.startsWith('/')) {
    return `${origin}${input}`;
  }

  return `${origin}/${input}`;
}

function absolutizeStyle(style: MapLibreStyle, origin: string): MapLibreStyle {
  const nextStyle: MapLibreStyle = { ...style };

  if (nextStyle.glyphs) {
    nextStyle.glyphs = String(absolutizeUrl(nextStyle.glyphs, origin));
  }

  if (nextStyle.sprite) {
    nextStyle.sprite = String(absolutizeUrl(nextStyle.sprite, origin));
  }

  if (nextStyle.sources) {
    const sources: MapLibreStyle['sources'] = { ...nextStyle.sources };

    Object.entries(sources).forEach(([sourceKey, sourceValue]) => {
      const nextSource = { ...sourceValue };

      if (Array.isArray(nextSource.tiles)) {
        nextSource.tiles = nextSource.tiles.map(tile =>
          String(absolutizeUrl(tile, origin)),
        );
      }

      if (typeof nextSource.url === 'string') {
        nextSource.url = String(absolutizeUrl(nextSource.url, origin));
      }

      sources[sourceKey] = nextSource;
    });

    nextStyle.sources = sources;
  }

  return nextStyle;
}

export function createMapTileServerConfig(
  hostOverride = '',
): MapTileServerConfig {
  return {
    attribution: 'AtlasB tile server',
    maxZoomLevel: 18,
    minZoomLevel: 5,
    rasterTilesPath: DEFAULT_RASTER_TILES_PATH,
    rasterTilesUrl:
      buildLocalUrl(DEFAULT_RASTER_TILES_PATH, { hostOverride }) ?? null,
    stylePath: DEFAULT_STYLE_PATH,
    styleUrl: buildLocalUrl(DEFAULT_STYLE_PATH, { hostOverride }) ?? null,
    tileSize: 256,
  };
}

export function createFallbackRasterStyle(
  config: MapTileServerConfig,
): MapLibreStyle {
  return {
    version: 8,
    sources: config.rasterTilesUrl
      ? {
          atlasbRasterTiles: {
            attribution: config.attribution,
            maxzoom: config.maxZoomLevel,
            minzoom: config.minZoomLevel,
            tileSize: config.tileSize,
            tiles: [config.rasterTilesUrl],
            type: 'raster',
          },
        }
      : {},
    layers: [
      {
        id: 'atlasb-background',
        paint: {
          'background-color': '#0b1220',
        },
        type: 'background',
      },
      ...(config.rasterTilesUrl
        ? [
            {
              id: 'atlasb-raster',
              source: 'atlasbRasterTiles',
              type: 'raster',
            },
          ]
        : []),
    ],
  };
}

export async function loadResolvedMapStyle(hostOverride = ''): Promise<{
  config: MapTileServerConfig;
  mapStyle: string | MapLibreStyle;
  warning: string | null;
}> {
  const config = createMapTileServerConfig(hostOverride);

  if (!config.styleUrl) {
    return {
      config,
      mapStyle: createFallbackRasterStyle(config),
      warning:
        'Tile server host is not configured. Set a map environment or override the host in Dev Settings.',
    };
  }

  try {
    const response = await fetch(config.styleUrl);
    const payload = await response.text();

    if (!response.ok) {
      throw new Error(`Failed to load map style (${response.status}).`);
    }

    const style = JSON.parse(payload) as MapLibreStyle;

    return {
      config,
      mapStyle: absolutizeStyle(style, getOrigin(config.styleUrl)),
      warning: null,
    };
  } catch (error) {
    return {
      config,
      mapStyle: createFallbackRasterStyle(config),
      warning:
        error instanceof Error
          ? error.message
          : 'Unable to load the remote style. Falling back to raster tiles.',
    };
  }
}
