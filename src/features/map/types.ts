export type MapLocationPermission =
  | 'unknown'
  | 'requested'
  | 'granted'
  | 'denied'
  | 'blocked'
  | 'unavailable';

export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

export type MapUserLocation = MapCoordinate & {
  accuracyMeters: number | null;
  capturedAtMs: number;
};

export type PlaceMapItem = {
  allowManualVisitMarking: boolean;
  id: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  latitude: number;
  longitude: number;
  name: string;
  region: string;
  regionId: string;
  visitVerificationRadiusMeters: number;
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
