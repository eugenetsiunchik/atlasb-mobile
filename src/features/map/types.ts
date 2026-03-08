export type MapLocationPermission =
  | 'unknown'
  | 'requested'
  | 'granted'
  | 'denied';

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type PlaceMapItem = {
  id: string;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  name: string;
  region: string;
};

export type MapFilters = {
  query: string;
  regionIds: string[];
};

export type MapTileServerConfig = {
  attribution: string;
  maxZoomLevel: number;
  minZoomLevel: number;
  rasterTilesPath: string;
  rasterTilesUrl: string | null;
  stylePath: string;
  styleUrl: string | null;
  tileSize: number;
};
