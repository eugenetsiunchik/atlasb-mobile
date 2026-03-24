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

export type PlaceCoordinatePrecision = 'exact' | 'approximate';

export type PlaceCoordinateSource =
  | 'approximateGeo'
  | 'coordinate'
  | 'coordinates'
  | 'geo'
  | 'geoPoint'
  | 'latLng'
  | 'location'
  | 'regionCenter'
  | 'regionGeo'
  | 'settlementGeo';

export type MapUserLocation = MapCoordinate & {
  accuracyMeters: number | null;
  capturedAtMs: number;
};

export type PlaceMapItem = {
  allowManualVisitMarking: boolean;
  approximateRadiusMeters: number | null;
  coordinatePrecision: PlaceCoordinatePrecision;
  coordinateSource: PlaceCoordinateSource;
  coverMediaId?: string | null;
  discoveryQuestLabel: string | null;
  id: string;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  latitude: number;
  longitude: number;
  name: string;
  preciseLocationMissing: boolean;
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
