import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlacePreviewCard } from '../features/map/components/PlacePreviewCard';
import { loadResolvedMapStyle } from '../features/map/config/tileServer';
import { subscribeToPlaces } from '../features/map/services/placesService';
import { logFirebaseError } from '../firebase';
import {
  mapActions,
  selectAllMapPlaces,
  selectLocationPermission,
  selectMapError,
  selectMapFilters,
  selectMapPlacesStatus,
  selectSelectedPlace,
  selectUserLocation,
} from '../features/map/store';
import { useAppDispatch, useAppSelector } from '../store';

const BELARUS_CENTER: [number, number] = [27.9534, 53.7098];
const BELARUS_ZOOM_LEVEL = 5.6;

type GeoJsonPlaceFeature = {
  geometry: {
    coordinates: [number, number];
    type: 'Point';
  };
  id: string;
  properties: {
    imageUrl: string | null;
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

type MapCameraRef = {
  setCamera?: (config: {
    animationDuration?: number;
    centerCoordinate?: [number, number];
    zoomLevel?: number;
  }) => void;
};

type MapScreenProps = {
  hostOverride?: string;
};

function getCoordinateFromLocationEvent(location: unknown) {
  if (typeof location !== 'object' || location === null) {
    return null;
  }

  const candidate = location as {
    coords?: {
      latitude?: number;
      longitude?: number;
    };
    latitude?: number;
    longitude?: number;
  };

  const latitude = candidate.coords?.latitude ?? candidate.latitude;
  const longitude = candidate.coords?.longitude ?? candidate.longitude;

  return typeof latitude === 'number' && typeof longitude === 'number'
    ? {
        latitude,
        longitude,
      }
    : null;
}

export function MapScreen({ hostOverride = '' }: MapScreenProps) {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const places = useAppSelector(selectAllMapPlaces);
  const filters = useAppSelector(selectMapFilters);
  const selectedPlace = useAppSelector(selectSelectedPlace);
  const placesStatus = useAppSelector(selectMapPlacesStatus);
  const mapError = useAppSelector(selectMapError);
  const userLocation = useAppSelector(selectUserLocation);
  const locationPermission = useAppSelector(selectLocationPermission);

  const [mapStyle, setMapStyle] = React.useState<string | Record<string, unknown>>('');
  const [mapStyleWarning, setMapStyleWarning] = React.useState<string | null>(null);
  const [isMapStyleLoading, setIsMapStyleLoading] = React.useState(true);
  const [isDetailsVisible, setIsDetailsVisible] = React.useState(false);
  const cameraRef = React.useRef<MapCameraRef | null>(null);

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
    dispatch(mapActions.placesLoadingStarted());

    return subscribeToPlaces(filters, {
      onError: message => {
        dispatch(mapActions.placesLoadFailed(message));
      },
      onSuccess: loadedPlaces => {
        dispatch(mapActions.placesReceived(loadedPlaces));
      },
    });
  }, [dispatch, filters]);

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

  const placesFeatureCollection = React.useMemo<GeoJsonPlaceFeatureCollection>(
    () => ({
      features: places.map(place => ({
        geometry: {
          coordinates: [place.longitude, place.latitude],
          type: 'Point',
        },
        id: place.id,
        properties: {
          imageUrl: place.imageUrl,
          name: place.name,
          placeId: place.id,
          region: place.region,
        },
        type: 'Feature',
      })),
      type: 'FeatureCollection',
    }),
    [places],
  );

  const moveCamera = React.useCallback(
    (centerCoordinate: [number, number], zoomLevel = BELARUS_ZOOM_LEVEL) => {
      cameraRef.current?.setCamera?.({
        animationDuration: 500,
        centerCoordinate,
        zoomLevel,
      });
    },
    [],
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
    },
    [dispatch],
  );

  const ensureLocationPermission = React.useCallback(async () => {
    if (Platform.OS !== 'android') {
      dispatch(mapActions.locationPermissionSet('requested'));
      return true;
    }

    dispatch(mapActions.locationPermissionSet('requested'));

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        buttonNegative: 'Not now',
        buttonPositive: 'Allow',
        message: 'AtlasB uses your location to center the map near you.',
        title: 'Allow location access',
      },
    );

    const granted = result === PermissionsAndroid.RESULTS.GRANTED;

    dispatch(mapActions.locationPermissionSet(granted ? 'granted' : 'denied'));

    return granted;
  }, [dispatch]);

  const handleNearMePress = React.useCallback(async () => {
    const granted = await ensureLocationPermission();

    if (!granted) {
      Alert.alert(
        'Location unavailable',
        'Grant location permission to jump to your current position.',
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

  const handleOpenDetails = React.useCallback(() => {
    if (!selectedPlace) {
      return;
    }

    setIsDetailsVisible(true);
  }, [selectedPlace]);

  return (
    <View className="flex-1 bg-slate-950">
      {!!mapStyle && (
        <MapLibreGL.MapView
          mapStyle={mapStyle}
          onPress={handleMapPress}
          style={styles.map}
        >
          <MapLibreGL.Camera
            defaultSettings={{
              centerCoordinate: BELARUS_CENTER,
              zoomLevel: BELARUS_ZOOM_LEVEL,
            }}
            ref={cameraRef as never}
          />
          <MapLibreGL.UserLocation
            animated={false}
            onUpdate={handleUserLocationUpdate}
            visible
          />
          <MapLibreGL.ShapeSource
            cluster
            clusterMaxZoomLevel={13}
            clusterRadius={44}
            id="places"
            onPress={handleShapeSourcePress}
            shape={placesFeatureCollection}
          >
            <MapLibreGL.CircleLayer
              filter={['has', 'point_count']}
              id="cluster-circles"
              style={clusterCircleStyle as never}
            />
            <MapLibreGL.SymbolLayer
              filter={['has', 'point_count']}
              id="cluster-count"
              style={clusterLabelStyle as never}
            />
            <MapLibreGL.CircleLayer
              filter={['!', ['has', 'point_count']]}
              id="place-points"
              style={placeCircleStyle as never}
            />
          </MapLibreGL.ShapeSource>
        </MapLibreGL.MapView>
      )}

      <View
        className="absolute left-4 right-4"
        style={{ top: insets.top + 12 }}
        pointerEvents="box-none"
      >
        <View className="self-start rounded-2xl bg-slate-950/90 px-4 py-3">
          <Text className="text-lg font-semibold text-white">
            Discover places in Belarus
          </Text>
        </View>
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

      {locationPermission === 'denied' && (
        <View className="absolute inset-x-4 top-[21rem] rounded-2xl bg-slate-900/92 px-4 py-3">
          <Text className="text-sm text-slate-200">
            Location permission is off. The map still works, but &quot;Near me&quot; and
            the user location puck need access.
          </Text>
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
          <View
            className="rounded-t-3xl bg-slate-950 px-4 pb-8 pt-4"
            style={{ paddingBottom: insets.bottom + 24 }}
          >
            <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-slate-700" />
            {selectedPlace?.imageUrl ? (
              <Image
                source={{ uri: selectedPlace.imageUrl }}
                className="h-56 w-full rounded-3xl"
                resizeMode="cover"
              />
            ) : (
              <View className="h-56 w-full items-center justify-center rounded-3xl bg-slate-800">
                <Text className="text-sm font-medium text-slate-300">
                  No preview image
                </Text>
              </View>
            )}
            <Text className="mt-4 text-2xl font-semibold text-white">
              {selectedPlace?.name}
            </Text>
            <Text className="mt-1 text-base text-slate-300">
              {selectedPlace?.region}
            </Text>
            <Text className="mt-4 text-sm leading-6 text-slate-300">
              This modal is the hand-off point for a future place details screen or
              nested map stack route.
            </Text>
            <Pressable
              className="mt-6 rounded-2xl bg-amber-400 px-4 py-3"
              onPress={() => setIsDetailsVisible(false)}
            >
              <Text className="text-center text-base font-semibold text-slate-950">
                Close details
              </Text>
            </Pressable>
          </View>
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
