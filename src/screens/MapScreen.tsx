import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Camera,
  CircleLayer,
  FillLayer,
  LineLayer,
  MapView,
  ShapeSource,
  SymbolLayer,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlacePreviewCard } from '../features/map/components/PlacePreviewCard';
import { PlaceDetailsSheet } from '../features/map/components/PlaceDetailsSheet';
import {
  getAdaptiveFogOfWarRadiusMeters,
  getFogOfWarRuleForLevel,
} from '../features/map/config/fogOfWarProgression';
import { loadResolvedMapStyle } from '../features/map/config/tileServer';
import {
  checkLocationPermission,
  openAppPermissionSettings,
  requestLocationPermission,
} from '../features/map/services/locationPermissionService';
import {
  TERRITORY_REVEAL_FORWARD_OFFSET_METERS,
  persistExplorationForLocation,
  selectAllExploredTerritoryReveals,
  selectTerritoryResetVersion,
} from '../features/territory';
import {
  createFogOverlay,
} from '../features/territory/utils/overlay';
import {
  createExplorationRevealFromLocation,
  createRevealCircleRing,
  doesRevealContainCoordinate,
  mergeExplorationReveals,
} from '../features/territory/utils/reveals';
import { getDistanceBetweenCoordinatesMeters } from '../features/userPlace/utils/distance';
import { logFirebaseError } from '../firebase';
import {
  mapActions,
  selectAllMapPlaces,
  selectAllUserPlaceStates,
  selectEffectiveUserLevel,
  selectLocationPermission,
  selectMapError,
  selectMapFilters,
  selectMapPlacesStatus,
  selectSelectedPlace,
  selectUserLocation,
  useAppDispatch,
  useAppSelector,
} from '../store';

const BELARUS_CENTER: [number, number] = [27.9534, 53.7098];
const BELARUS_ZOOM_LEVEL = 5.6;
const MAX_EXPLORATION_ACCURACY_METERS = 250;
const MIN_EXPLORATION_WRITE_INTERVAL_MS = 120_000;
const NEARBY_PLACE_VISIBILITY_RADIUS_METERS = 5_000;
const APPROXIMATE_SELECTION_HALO_RADIUS_METERS = 1_000;

type GeoJsonPlaceFeature = {
  geometry: {
    coordinates: [number, number];
    type: 'Point';
  };
  id: string;
  properties: {
    imageUrl: string | null;
    isSelected: 0 | 1;
    markerLabel: string | null;
    markerVariant: 'approximate' | 'question' | 'visited';
    name: string;
    placeId: string;
    region: string;
  };
  type: 'Feature';
};

type GeoJsonPlaceFeatureCollection = {
  features: GeoJsonPlaceFeature[];
  type: 'FeatureCollection';
};

type GeoJsonSelectionHaloFeatureCollection = {
  features: Array<{
    geometry: {
      coordinates: number[][][];
      type: 'Polygon';
    };
    id: string;
    properties: {
      kind: 'approximate-selection-halo';
    };
    type: 'Feature';
  }>;
  type: 'FeatureCollection';
};

type MapCameraRef = {
  setCamera?: (config: {
    animationDuration?: number;
    centerCoordinate?: [number, number];
    zoomLevel?: number;
  }) => void;
};

type MapViewRef = {
  getVisibleBounds?: () => Promise<[[number, number], [number, number]]>;
  getZoom?: () => Promise<number>;
};

type MapScreenProps = {
  hostOverride?: string;
  maxZoomLevelOverride?: number | null;
  showPlaceMarkers?: boolean;
};

type MapViewportState = {
  bounds: {
    northEast: [number, number];
    southWest: [number, number];
  };
  zoomLevel: number;
};

const EMPTY_PLACE_FEATURE_COLLECTION: GeoJsonPlaceFeatureCollection = {
  features: [],
  type: 'FeatureCollection',
};

const EMPTY_SELECTION_HALO_FEATURE_COLLECTION: GeoJsonSelectionHaloFeatureCollection = {
  features: [],
  type: 'FeatureCollection',
};

const EMPTY_REVEAL_EDGE_FEATURE_COLLECTION: {
  features: never[];
  type: 'FeatureCollection';
} = {
  features: [],
  type: 'FeatureCollection',
};

function formatNearbyRadiusLabel(radiusMeters: number) {
  return radiusMeters >= 1_000
    ? `Within ${radiusMeters / 1_000} km`
    : `Within ${radiusMeters} m`;
}

function formatViewportCoordinate(value: number) {
  return value.toFixed(5);
}

function getCoordinateFromLocationEvent(location: unknown) {
  if (typeof location !== 'object' || location === null) {
    return null;
  }

  const candidate = location as {
    coords?: {
      accuracy?: number;
      heading?: number;
      latitude?: number;
      longitude?: number;
    };
    latitude?: number;
    longitude?: number;
    timestamp?: number;
  };

  const accuracyMeters = candidate.coords?.accuracy;
  const headingDegrees = candidate.coords?.heading;
  const latitude = candidate.coords?.latitude ?? candidate.latitude;
  const longitude = candidate.coords?.longitude ?? candidate.longitude;
  const capturedAtMs =
    typeof candidate.timestamp === 'number' ? candidate.timestamp : Date.now();

  return typeof latitude === 'number' && typeof longitude === 'number'
    ? {
        accuracyMeters: typeof accuracyMeters === 'number' ? accuracyMeters : null,
        capturedAtMs,
        headingDegrees:
          typeof headingDegrees === 'number' && Number.isFinite(headingDegrees) && headingDegrees >= 0
            ? headingDegrees
            : null,
        latitude,
        longitude,
      }
    : null;
}

function constrainZoomLevel(zoomLevel: number, minZoomLevel: number, maxZoomLevel: number) {
  return Math.min(Math.max(zoomLevel, minZoomLevel), maxZoomLevel);
}

function getExplorationMovementThresholdMeters(visibilityRadiusMeters: number) {
  return Math.max(8, Math.min(60, Math.round(visibilityRadiusMeters * 0.4)));
}

function areCoordinatesClose(
  left: [number, number],
  right: [number, number],
  tolerance = 0.0001,
) {
  return (
    Math.abs(left[0] - right[0]) <= tolerance &&
    Math.abs(left[1] - right[1]) <= tolerance
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function metersToLatitudeDegrees(meters: number) {
  return meters / 111_320;
}

function metersToLongitudeDegrees(meters: number, latitude: number) {
  const latitudeRadians = (latitude * Math.PI) / 180;
  const metersPerDegree = 111_320 * Math.cos(latitudeRadians);

  if (Math.abs(metersPerDegree) < 0.000001) {
    return 0;
  }

  return meters / metersPerDegree;
}

function getApproximateSpreadRadiusMeters(zoomLevel: number) {
  return clamp(2400 / 2 ** Math.max(0, zoomLevel - 5), 150, 1200);
}

function getApproximateMarkerRingPosition(index: number) {
  let remainingIndex = index;
  let ring = 0;

  while (true) {
    const capacity = ring === 0 ? 1 : ring * 6;

    if (remainingIndex < capacity) {
      return {
        positionInRing: remainingIndex,
        ring,
        ringCapacity: capacity,
      };
    }

    remainingIndex -= capacity;
    ring += 1;
  }
}

function getApproximateMarkerDisplayCoordinate(params: {
  baseCoordinate: [number, number];
  baseRadiusMeters: number;
  index: number;
}): [number, number] {
  const { baseCoordinate, baseRadiusMeters, index } = params;

  if (index === 0 || baseRadiusMeters <= 0) {
    return baseCoordinate;
  }

  const { positionInRing, ring, ringCapacity } = getApproximateMarkerRingPosition(index);
  const distanceMeters = baseRadiusMeters * ring;
  const angle = (positionInRing / ringCapacity) * Math.PI * 2 - Math.PI / 2;
  const longitudeOffset = metersToLongitudeDegrees(
    Math.cos(angle) * distanceMeters,
    baseCoordinate[1],
  );
  const latitudeOffset = metersToLatitudeDegrees(Math.sin(angle) * distanceMeters);

  return [baseCoordinate[0] + longitudeOffset, baseCoordinate[1] + latitudeOffset];
}

function createHaloPolygon(params: {
  center: [number, number];
  radiusMeters: number;
  steps?: number;
}) {
  const { center, radiusMeters, steps = 48 } = params;
  const coordinates: number[][] = [];

  for (let step = 0; step <= steps; step += 1) {
    const angle = (step / steps) * Math.PI * 2;
    const eastMeters = Math.cos(angle) * radiusMeters;
    const northMeters = Math.sin(angle) * radiusMeters;

    coordinates.push([
      center[0] + metersToLongitudeDegrees(eastMeters, center[1]),
      center[1] + metersToLatitudeDegrees(northMeters),
    ]);
  }

  return [coordinates];
}

function areViewportStatesEquivalent(
  left: MapViewportState | null,
  right: MapViewportState,
) {
  if (!left) {
    return false;
  }

  return (
    Math.abs(left.zoomLevel - right.zoomLevel) <= 0.01 &&
    areCoordinatesClose(left.bounds.northEast, right.bounds.northEast) &&
    areCoordinatesClose(left.bounds.southWest, right.bounds.southWest)
  );
}

export function MapScreen({
  hostOverride = '',
  maxZoomLevelOverride = null,
  showPlaceMarkers = true,
}: MapScreenProps) {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const places = useAppSelector(selectAllMapPlaces);
  const filters = useAppSelector(selectMapFilters);
  const selectedPlace = useAppSelector(selectSelectedPlace);
  const placesStatus = useAppSelector(selectMapPlacesStatus);
  const mapError = useAppSelector(selectMapError);
  const userLocation = useAppSelector(selectUserLocation);
  const locationPermission = useAppSelector(selectLocationPermission);
  const effectiveUserLevel = useAppSelector(selectEffectiveUserLevel);
  const exploredTerritoryReveals = useAppSelector(selectAllExploredTerritoryReveals);
  const territoryResetVersion = useAppSelector(selectTerritoryResetVersion);
  const userPlaceStates = useAppSelector(selectAllUserPlaceStates);

  const [mapStyle, setMapStyle] = React.useState<string | Record<string, unknown>>('');
  const [mapStyleWarning, setMapStyleWarning] = React.useState<string | null>(null);
  const [isMapStyleLoading, setIsMapStyleLoading] = React.useState(true);
  const [isDetailsVisible, setIsDetailsVisible] = React.useState(false);
  const [viewportState, setViewportState] = React.useState<MapViewportState | null>(null);
  const cameraRef = React.useRef<MapCameraRef | null>(null);
  const mapViewRef = React.useRef<MapViewRef | null>(null);
  const lastExplorationWriteRef = React.useRef<{
    capturedAtMs: number;
    latitude: number;
    longitude: number;
  } | null>(null);
  const hasRequestedInitialPermissionRef = React.useRef(false);
  const hasAutoCenteredOnUserLocationRef = React.useRef(false);
  const fogOfWarRule = React.useMemo(
    () => getFogOfWarRuleForLevel(effectiveUserLevel),
    [effectiveUserLevel],
  );
  const currentVisibilityRadiusMeters = React.useMemo(
    () =>
      getAdaptiveFogOfWarRadiusMeters({
        levelRule: fogOfWarRule,
        userLocation,
      }),
    [fogOfWarRule, userLocation],
  );
  const effectiveMaxZoomLevel = React.useMemo(() => {
    if (
      typeof maxZoomLevelOverride !== 'number' ||
      !Number.isFinite(maxZoomLevelOverride)
    ) {
      return fogOfWarRule.maxZoomLevel;
    }

    return Math.max(fogOfWarRule.minZoomLevel, maxZoomLevelOverride);
  }, [fogOfWarRule.maxZoomLevel, fogOfWarRule.minZoomLevel, maxZoomLevelOverride]);
  const constrainedDefaultZoomLevel = React.useMemo(
    () =>
      constrainZoomLevel(
        BELARUS_ZOOM_LEVEL,
        fogOfWarRule.minZoomLevel,
        effectiveMaxZoomLevel,
      ),
    [effectiveMaxZoomLevel, fogOfWarRule.minZoomLevel],
  );
  const visitedPlaceIds = React.useMemo(
    () =>
      new Set(
        userPlaceStates
          .filter(placeState => placeState.visited)
          .map(placeState => placeState.placeId),
      ),
    [userPlaceStates],
  );
  const nearbyPlacesCount = React.useMemo(() => {
    if (!userLocation) {
      return null;
    }

    return places.reduce((count, place) => {
      const distanceMeters = getDistanceBetweenCoordinatesMeters(userLocation, place);

      return distanceMeters <= NEARBY_PLACE_VISIBILITY_RADIUS_METERS ? count + 1 : count;
    }, 0);
  }, [places, userLocation]);
  const viewportCenterCoordinate = React.useMemo(() => {
    if (!viewportState) {
      return null;
    }

    const [northEastLongitude, northEastLatitude] = viewportState.bounds.northEast;
    const [southWestLongitude, southWestLatitude] = viewportState.bounds.southWest;

    return {
      latitude: (northEastLatitude + southWestLatitude) / 2,
      longitude: (northEastLongitude + southWestLongitude) / 2,
    };
  }, [viewportState]);

  React.useEffect(() => {
    let isMounted = true;

    (async () => {
      setIsMapStyleLoading(true);

      const result = await loadResolvedMapStyle(hostOverride);

      if (!isMounted) {
        return;
      }

      setMapStyle(result.mapStyle);
      setMapStyleWarning(result.warning);
      setIsMapStyleLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, [hostOverride]);

  React.useEffect(() => {
    if (!mapError) {
      return;
    }

    logFirebaseError(
      'Map Redux error state set',
      {
        filters,
        placesStatus,
      },
      new Error(mapError),
    );
  }, [filters, mapError, placesStatus]);

  const refreshViewportState = React.useCallback(async () => {
    try {
      const [visibleBounds, zoomLevel] = await Promise.all([
        mapViewRef.current?.getVisibleBounds?.(),
        mapViewRef.current?.getZoom?.(),
      ]);

      if (!visibleBounds || typeof zoomLevel !== 'number') {
        return;
      }

      const nextViewportState = {
        bounds: {
          northEast: visibleBounds[0],
          southWest: visibleBounds[1],
        },
        zoomLevel,
      };

      setViewportState(currentViewportState =>
        areViewportStatesEquivalent(currentViewportState, nextViewportState)
          ? currentViewportState
          : nextViewportState,
      );
    } catch (error) {
      logFirebaseError('Map viewport refresh failed', { screen: 'MapScreen' }, error);
    }
  }, []);

  const currentLiveTerritoryReveal = React.useMemo(
    () =>
      userLocation
        ? createExplorationRevealFromLocation({
            forwardOffsetMeters: 0,
            location: userLocation,
            radiusMeters: currentVisibilityRadiusMeters,
          })
        : null,
    [currentVisibilityRadiusMeters, userLocation],
  );
  const visibleTerritoryReveals = React.useMemo(
    () =>
      currentLiveTerritoryReveal
        ? mergeExplorationReveals(exploredTerritoryReveals, [currentLiveTerritoryReveal])
        : exploredTerritoryReveals,
    [currentLiveTerritoryReveal, exploredTerritoryReveals],
  );

  const approximateMarkerLayout = React.useMemo<{
    featureCollection: GeoJsonPlaceFeatureCollection;
    selectedApproximateDisplayCoordinate: [number, number] | null;
  }>(() => {
    if (!showPlaceMarkers || !viewportState) {
      return {
        featureCollection: EMPTY_PLACE_FEATURE_COLLECTION,
        selectedApproximateDisplayCoordinate: null as [number, number] | null,
      };
    }

    const visiblePlaces = places.filter(place =>
      visibleTerritoryReveals.some(reveal =>
        doesRevealContainCoordinate(reveal, {
          latitude: place.latitude,
          longitude: place.longitude,
        }),
      ) ||
      (!!userLocation &&
        getDistanceBetweenCoordinatesMeters(userLocation, {
          latitude: place.latitude,
          longitude: place.longitude,
        }) <= NEARBY_PLACE_VISIBILITY_RADIUS_METERS),
    );
    const approximateGroupIndices = new Map<string, number>();
    const approximateGroupSizes = new Map<string, number>();
    const approximateSpreadRadiusMeters = getApproximateSpreadRadiusMeters(
      viewportState.zoomLevel,
    );
    let selectedApproximateDisplayCoordinate: [number, number] | null = null;

    visiblePlaces.forEach(place => {
      if (place.coordinatePrecision !== 'approximate') {
        return;
      }

      const key = `${place.longitude.toFixed(5)}:${place.latitude.toFixed(5)}`;
      approximateGroupSizes.set(key, (approximateGroupSizes.get(key) ?? 0) + 1);
    });

    return {
      featureCollection: {
        features: visiblePlaces.map<GeoJsonPlaceFeature>(place => {
          const isVisited = visitedPlaceIds.has(place.id);
          const baseCoordinate: [number, number] = [place.longitude, place.latitude];
          const approximateGroupKey = `${place.longitude.toFixed(5)}:${place.latitude.toFixed(5)}`;
          const approximateGroupSize = approximateGroupSizes.get(approximateGroupKey) ?? 0;
          const nextApproximateIndex = approximateGroupIndices.get(approximateGroupKey) ?? 0;
          const displayCoordinate =
            place.coordinatePrecision === 'approximate' && approximateGroupSize > 1
              ? getApproximateMarkerDisplayCoordinate({
                  baseCoordinate,
                  baseRadiusMeters: approximateSpreadRadiusMeters,
                  index: nextApproximateIndex,
                })
              : baseCoordinate;

          if (place.coordinatePrecision === 'approximate') {
            approximateGroupIndices.set(approximateGroupKey, nextApproximateIndex + 1);
          }

          if (selectedPlace?.id === place.id && place.coordinatePrecision === 'approximate') {
            selectedApproximateDisplayCoordinate = displayCoordinate;
          }

          return {
            geometry: {
              coordinates: displayCoordinate,
              type: 'Point',
            },
            id: place.id,
            properties: {
              imageUrl: place.imageUrl,
              isSelected: selectedPlace?.id === place.id ? 1 : 0,
              markerLabel: isVisited
                ? null
                : place.coordinatePrecision === 'approximate'
                  ? 'Q'
                  : '?',
              markerVariant: isVisited
                ? 'visited'
                : place.coordinatePrecision === 'approximate'
                  ? 'approximate'
                  : 'question',
              name: place.name,
              placeId: place.id,
              region: place.region,
            },
            type: 'Feature',
          };
        }),
        type: 'FeatureCollection',
      },
      selectedApproximateDisplayCoordinate,
    };
  }, [
    places,
    selectedPlace?.id,
    showPlaceMarkers,
    userLocation,
    visibleTerritoryReveals,
    viewportState,
    visitedPlaceIds,
  ]);

  const placesFeatureCollection = approximateMarkerLayout.featureCollection;

  const approximateSelectionHaloShape = React.useMemo<GeoJsonSelectionHaloFeatureCollection>(() => {
    if (!selectedPlace || selectedPlace.coordinatePrecision !== 'approximate') {
      return EMPTY_SELECTION_HALO_FEATURE_COLLECTION;
    }

    const center =
      approximateMarkerLayout.selectedApproximateDisplayCoordinate ??
      ([selectedPlace.longitude, selectedPlace.latitude] as [number, number]);

    return {
      features: [
        {
          geometry: {
            coordinates: createHaloPolygon({
              center,
              radiusMeters: APPROXIMATE_SELECTION_HALO_RADIUS_METERS,
            }),
            type: 'Polygon',
          },
          id: `approximate-selection-halo:${selectedPlace.id}`,
          properties: {
            kind: 'approximate-selection-halo',
          },
          type: 'Feature',
        },
      ],
      type: 'FeatureCollection',
    };
  }, [
    approximateMarkerLayout.selectedApproximateDisplayCoordinate,
    selectedPlace,
  ]);

  const fogOverlayShape = React.useMemo(() => {
    return createFogOverlay({
      reveals: visibleTerritoryReveals,
      viewportBounds: viewportState?.bounds,
    });
  }, [viewportState?.bounds, visibleTerritoryReveals]);

  const fogRevealEdgeShape = React.useMemo(() => {
    if (!currentLiveTerritoryReveal) {
      return EMPTY_REVEAL_EDGE_FEATURE_COLLECTION;
    }

    const ring = createRevealCircleRing(currentLiveTerritoryReveal);

    return {
      features: [
        {
          geometry: {
            coordinates: ring,
            type: 'LineString' as const,
          },
          id: 'reveal-edge:live',
          properties: {},
          type: 'Feature' as const,
        },
      ],
      type: 'FeatureCollection' as const,
    };
  }, [currentLiveTerritoryReveal]);

  React.useEffect(() => {
    lastExplorationWriteRef.current = null;
  }, [territoryResetVersion]);

  const moveCamera = React.useCallback(
    (centerCoordinate: [number, number], zoomLevel = BELARUS_ZOOM_LEVEL) => {
      cameraRef.current?.setCamera?.({
        animationDuration: 500,
        centerCoordinate,
        zoomLevel: constrainZoomLevel(
          zoomLevel,
          fogOfWarRule.minZoomLevel,
          effectiveMaxZoomLevel,
        ),
      });
    },
    [effectiveMaxZoomLevel, fogOfWarRule.minZoomLevel],
  );

  const handleMapPress = React.useCallback(() => {
    dispatch(mapActions.placeSelectionCleared());
  }, [dispatch]);

  const handleShapeSourcePress = React.useCallback(
    (event: any) => {
      const feature = event.features?.[0];

      if (!feature) {
        return;
      }

      const isCluster =
        feature.properties?.cluster === true ||
        typeof feature.properties?.point_count === 'number';

      if (isCluster && feature.geometry?.coordinates) {
        moveCamera(feature.geometry.coordinates as [number, number], 7.8);
        return;
      }

      const placeId =
        typeof feature.properties?.placeId === 'string'
          ? feature.properties.placeId
          : typeof feature.id === 'string'
            ? feature.id
            : null;

      if (placeId) {
        dispatch(mapActions.placeSelected(placeId));
      }
    },
    [dispatch, moveCamera],
  );

  const handleUserLocationUpdate = React.useCallback(
    (location: unknown) => {
      const coordinate = getCoordinateFromLocationEvent(location);

      if (!coordinate) {
        return;
      }

      dispatch(mapActions.userLocationUpdated(coordinate));

      if (
        typeof coordinate.accuracyMeters === 'number' &&
        coordinate.accuracyMeters > MAX_EXPLORATION_ACCURACY_METERS
      ) {
        return;
      }

      const nextReveal = createExplorationRevealFromLocation({
        forwardOffsetMeters: TERRITORY_REVEAL_FORWARD_OFFSET_METERS,
        location: coordinate,
        radiusMeters: currentVisibilityRadiusMeters,
      });

      const lastExplorationWrite = lastExplorationWriteRef.current;

      if (lastExplorationWrite) {
        const movementMeters = getDistanceBetweenCoordinatesMeters(lastExplorationWrite, nextReveal);
        const elapsedMs = coordinate.capturedAtMs - lastExplorationWrite.capturedAtMs;

        if (
          movementMeters < getExplorationMovementThresholdMeters(currentVisibilityRadiusMeters) &&
          elapsedMs < MIN_EXPLORATION_WRITE_INTERVAL_MS
        ) {
          return;
        }
      }

      lastExplorationWriteRef.current = {
        capturedAtMs: coordinate.capturedAtMs,
        latitude: nextReveal.latitude,
        longitude: nextReveal.longitude,
      };

      dispatch(
        persistExplorationForLocation({
          location: coordinate,
          radiusMeters: currentVisibilityRadiusMeters,
        }),
      );
    },
    [currentVisibilityRadiusMeters, dispatch],
  );

  const ensureLocationPermission = React.useCallback(async () => {
    dispatch(mapActions.locationPermissionSet('requested'));
    const permission = await requestLocationPermission();
    dispatch(mapActions.locationPermissionSet(permission));
    return permission;
  }, [dispatch]);

  React.useEffect(() => {
    if (hasRequestedInitialPermissionRef.current) {
      return;
    }

    hasRequestedInitialPermissionRef.current = true;
    let isMounted = true;

    (async () => {
      const existingPermission = await checkLocationPermission();

      if (!isMounted) {
        return;
      }

      if (existingPermission === 'granted') {
        dispatch(mapActions.locationPermissionSet(existingPermission));
        return;
      }

      if (existingPermission === 'blocked' || existingPermission === 'unavailable') {
        dispatch(mapActions.locationPermissionSet(existingPermission));
        return;
      }

      await ensureLocationPermission();
    })();

    return () => {
      isMounted = false;
    };
  }, [dispatch, ensureLocationPermission]);

  React.useEffect(() => {
    if (!userLocation || locationPermission !== 'granted' || hasAutoCenteredOnUserLocationRef.current) {
      return;
    }

    hasAutoCenteredOnUserLocationRef.current = true;
    moveCamera(
      [userLocation.longitude, userLocation.latitude],
      Math.max(fogOfWarRule.minZoomLevel, 13.2),
    );
  }, [
    fogOfWarRule.minZoomLevel,
    locationPermission,
    moveCamera,
    userLocation,
  ]);

  React.useEffect(() => {
    if (showPlaceMarkers) {
      return;
    }

    dispatch(mapActions.placeSelectionCleared());
    setIsDetailsVisible(false);
  }, [dispatch, showPlaceMarkers]);

  const handleNearMePress = React.useCallback(async () => {
    const permission = await ensureLocationPermission();

    if (permission !== 'granted') {
      Alert.alert(
        'Location unavailable',
        permission === 'blocked'
          ? 'Location access is blocked for AtlasB. Open the app settings and allow location to jump to your current position.'
          : permission === 'unavailable'
            ? 'Location services are unavailable on this device right now.'
            : 'Grant location permission to jump to your current position.',
      );
      return;
    }

    if (!userLocation) {
      Alert.alert(
        'Waiting for location',
        'Turn on device location services and try again in a moment.',
      );
      return;
    }

    moveCamera([userLocation.longitude, userLocation.latitude], 11.8);
  }, [ensureLocationPermission, moveCamera, userLocation]);

  const handleGrantLocationAccessPress = React.useCallback(async () => {
    if (locationPermission === 'blocked') {
      await openAppPermissionSettings();
      return;
    }

    const permission = await ensureLocationPermission();

    if (permission !== 'granted') {
      Alert.alert(
        'Location unavailable',
        permission === 'blocked'
          ? 'Location access is blocked for AtlasB. Open the app settings to enable map centering on your position.'
          : permission === 'unavailable'
            ? 'Location services are unavailable on this device right now.'
            : 'Grant location permission to center the map on your current position.',
      );
    }
  }, [ensureLocationPermission, locationPermission]);

  const handleOpenDetails = React.useCallback(() => {
    if (!selectedPlace) {
      return;
    }

    setIsDetailsVisible(true);
  }, [selectedPlace]);

  return (
    <View className="flex-1 bg-slate-950">
      {!!mapStyle && (
        <MapView
          mapStyle={mapStyle}
          onDidFinishLoadingMap={refreshViewportState}
          onPress={handleMapPress}
          onRegionDidChange={refreshViewportState}
          ref={mapViewRef as never}
          regionDidChangeDebounceTime={250}
          style={styles.map}
        >
          <Camera
            defaultSettings={{
              centerCoordinate: BELARUS_CENTER,
              zoomLevel: constrainedDefaultZoomLevel,
            }}
            minZoomLevel={fogOfWarRule.minZoomLevel}
            maxZoomLevel={effectiveMaxZoomLevel}
            ref={cameraRef as never}
          />
          <UserLocation
            animated={false}
            onUpdate={handleUserLocationUpdate}
            visible
          />
          <ShapeSource
            id="fog-of-war"
            key={`fog-of-war:${territoryResetVersion}:${currentLiveTerritoryReveal ? 'live' : 'init'}`}
            shape={fogOverlayShape}
          >
            <FillLayer id="fog-fill" style={fogFillStyle as never} />
          </ShapeSource>
          {fogRevealEdgeShape.features.length > 0 ? (
            <ShapeSource id="fog-reveal-edge" shape={fogRevealEdgeShape}>
              <LineLayer id="fog-reveal-edge-line" style={fogRevealEdgeStyle as never} />
            </ShapeSource>
          ) : null}
          {approximateSelectionHaloShape.features.length > 0 ? (
            <ShapeSource id="approximate-selection-halo" shape={approximateSelectionHaloShape}>
              <FillLayer id="approximate-selection-halo-fill" style={approximateHaloFillStyle as never} />
              <LineLayer id="approximate-selection-halo-outline" style={approximateHaloOutlineStyle as never} />
            </ShapeSource>
          ) : null}
          {showPlaceMarkers ? (
            <ShapeSource
              cluster
              clusterMaxZoomLevel={12}
              clusterRadius={44}
              id="places"
              onPress={handleShapeSourcePress}
              shape={placesFeatureCollection}
            >
              <CircleLayer
                filter={['has', 'point_count']}
                id="cluster-circles"
                style={clusterCircleStyle as never}
              />
              <SymbolLayer
                filter={['has', 'point_count']}
                id="cluster-count"
                style={clusterLabelStyle as never}
              />
              <CircleLayer
                filter={[
                  'all',
                  ['!', ['has', 'point_count']],
                  ['==', 'isSelected', 1],
                  ['==', 'markerVariant', 'approximate'],
                ]}
                id="place-approximate-selection-ring"
                style={placeApproximateSelectionRingStyle as never}
              />
              <CircleLayer
                filter={[
                  'all',
                  ['!', ['has', 'point_count']],
                  ['==', 'markerVariant', 'visited'],
                ]}
                id="place-points"
                style={placeCircleStyle as never}
              />
              <CircleLayer
                filter={[
                  'all',
                  ['!', ['has', 'point_count']],
                  ['==', 'markerVariant', 'question'],
                ]}
                id="place-question-badges"
                style={placeQuestionBadgeStyle as never}
              />
              <CircleLayer
                filter={[
                  'all',
                  ['!', ['has', 'point_count']],
                  ['==', 'markerVariant', 'approximate'],
                ]}
                id="place-approximate-badges"
                style={placeApproximateBadgeStyle as never}
              />
              <SymbolLayer
                filter={[
                  'all',
                  ['!', ['has', 'point_count']],
                  ['==', 'markerVariant', 'question'],
                ]}
                id="place-question-labels"
                style={placeQuestionLabelStyle as never}
              />
              <SymbolLayer
                filter={[
                  'all',
                  ['!', ['has', 'point_count']],
                  ['==', 'markerVariant', 'approximate'],
                ]}
                id="place-approximate-labels"
                style={placeApproximateLabelStyle as never}
              />
            </ShapeSource>
          ) : null}
        </MapView>
      )}

      <View
        className="absolute left-4 right-4"
        style={{ top: insets.top + 12 }}
        pointerEvents="box-none"
      >
        <View className="self-start rounded-2xl bg-slate-950/90 px-4 py-3">
          <Text className="text-xs font-medium uppercase tracking-[0.8px] text-slate-300">
            Dev map info
          </Text>
          <Text className="mt-1 text-base font-semibold text-white">
            Zoom:{' '}
            {typeof viewportState?.zoomLevel === 'number'
              ? viewportState.zoomLevel.toFixed(2)
              : '--'}
          </Text>
          <Text className="mt-1 text-sm text-slate-100">
            Position:{' '}
            {viewportCenterCoordinate
              ? `${formatViewportCoordinate(viewportCenterCoordinate.latitude)}, ${formatViewportCoordinate(viewportCenterCoordinate.longitude)}`
              : '--'}
          </Text>
        </View>
        {nearbyPlacesCount !== null ? (
          <View className="mt-3 self-start rounded-2xl bg-slate-950/90 px-4 py-3">
            <Text className="text-xs font-medium uppercase tracking-[0.8px] text-slate-300">
              {formatNearbyRadiusLabel(NEARBY_PLACE_VISIBILITY_RADIUS_METERS)}
            </Text>
            <Text className="mt-1 text-base font-semibold text-white">
              {nearbyPlacesCount} place{nearbyPlacesCount === 1 ? '' : 's'}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        className="absolute right-4"
        pointerEvents="box-none"
        style={{ top: insets.top + 92 }}
      >
        <Pressable
          className="rounded-2xl bg-white px-4 py-3"
          onPress={handleNearMePress}
        >
          <Text className="text-sm font-semibold text-slate-950">Near me</Text>
        </Pressable>
      </View>

      {(isMapStyleLoading || placesStatus === 'loading') && (
        <View className="absolute inset-x-4 top-28 rounded-2xl bg-slate-950/88 px-4 py-3">
          <View className="flex-row items-center gap-3">
            <ActivityIndicator color="#f0b268" />
            <Text className="text-sm text-slate-100">
              Loading map and places...
            </Text>
          </View>
        </View>
      )}

      {!!mapStyleWarning && (
        <View className="absolute inset-x-4 top-44 rounded-2xl bg-amber-500/95 px-4 py-3">
          <Text className="text-sm font-medium text-slate-950">
            {mapStyleWarning}
          </Text>
        </View>
      )}

      {!!mapError && (
        <View className="absolute inset-x-4 top-60 rounded-2xl bg-rose-700/95 px-4 py-3">
          <Text className="text-sm font-medium text-white">{mapError}</Text>
        </View>
      )}

      {(locationPermission === 'denied' || locationPermission === 'blocked') && (
        <View className="absolute inset-x-4 top-[21rem] rounded-2xl bg-slate-900/92 px-4 py-3">
          <Text className="text-sm text-slate-200">
            {locationPermission === 'blocked'
              ? 'Location permission is blocked in system settings. Previously explored territory stays visible, but nearby fog clearing and "Near me" need access.'
              : 'Location permission is off. Previously explored territory stays visible, but nearby fog clearing and "Near me" need access.'}
          </Text>
        </View>
      )}

      {(locationPermission === 'denied' || locationPermission === 'blocked') && (
        <View className="absolute inset-0 items-center justify-center px-6" pointerEvents="box-none">
          <View className="w-full max-w-sm rounded-3xl bg-slate-950/92 px-5 py-5">
            <Text className="text-center text-lg font-semibold text-white">
              Enable location access
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-200">
              {locationPermission === 'blocked'
                ? 'Open app settings to grant location access and center the map on your position.'
                : 'Grant location access so the map can open around your current position.'}
            </Text>
            <Pressable
              className="mt-4 rounded-2xl bg-white px-4 py-3"
              onPress={handleGrantLocationAccessPress}
            >
              <Text className="text-center text-sm font-semibold text-slate-950">
                {locationPermission === 'blocked' ? 'Open settings' : 'Grant access'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {selectedPlace ? (
        <View
          className="absolute inset-x-4"
          pointerEvents="box-none"
          style={{ bottom: insets.bottom + 92 }}
        >
          <PlacePreviewCard
            onClose={() => dispatch(mapActions.placeSelectionCleared())}
            onOpenDetails={handleOpenDetails}
            place={selectedPlace}
          />
        </View>
      ) : null}

      <Modal
        animationType="slide"
        onRequestClose={() => setIsDetailsVisible(false)}
        transparent
        visible={isDetailsVisible && !!selectedPlace}
      >
        <View className="flex-1 justify-end bg-slate-950/65">
          {selectedPlace ? (
            <View style={{ paddingBottom: insets.bottom + 24 }}>
              <PlaceDetailsSheet
                onClose={() => setIsDetailsVisible(false)}
                place={selectedPlace}
              />
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});

const fogFillStyle = {
  fillColor: '#020617',
  fillOpacity: 0.84,
};

const fogRevealEdgeStyle = {
  lineBlur: 1,
  lineColor: '#38bdf8',
  lineOpacity: 0.35,
  lineWidth: 2,
};

const clusterCircleStyle = {
  circleColor: '#f0b268',
  circleOpacity: 0.92,
  circleRadius: 22,
  circleStrokeColor: '#0f172a',
  circleStrokeWidth: 2,
};

const clusterLabelStyle = {
  textHaloColor: '#ffffff',
  textHaloWidth: 1,
  textColor: '#0f172a',
  textField: '{point_count_abbreviated}',
  textSize: 12,
};

const placeCircleStyle = {
  circleColor: '#fb923c',
  circleRadius: 8,
  circleStrokeColor: '#ffffff',
  circleStrokeWidth: 2,
};

const placeQuestionBadgeStyle = {
  circleColor: '#0f172a',
  circleRadius: 11,
  circleStrokeColor: '#fbbf24',
  circleStrokeWidth: 2,
};

const placeQuestionLabelStyle = {
  textAllowOverlap: true,
  textColor: '#fbbf24',
  textField: '{markerLabel}',
  textFont: ['Open Sans Bold'],
  textIgnorePlacement: true,
  textSize: 14,
};

const placeApproximateSelectionRingStyle = {
  circleBlur: 0.15,
  circleColor: '#38bdf8',
  circleOpacity: 0.18,
  circleRadius: 22,
  circleStrokeColor: '#bae6fd',
  circleStrokeWidth: 2,
};

const placeApproximateBadgeStyle = {
  circleColor: '#082f49',
  circleRadius: 13,
  circleStrokeColor: '#7dd3fc',
  circleStrokeWidth: 2,
};

const placeApproximateLabelStyle = {
  textAllowOverlap: true,
  textColor: '#e0f2fe',
  textField: '{markerLabel}',
  textFont: ['Open Sans Bold'],
  textIgnorePlacement: true,
  textSize: 13,
};

const approximateHaloFillStyle = {
  fillColor: '#38bdf8',
  fillOpacity: 0.12,
};

const approximateHaloOutlineStyle = {
  lineColor: '#7dd3fc',
  lineOpacity: 0.75,
  lineWidth: 2,
};
