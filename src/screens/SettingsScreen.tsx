import React from 'react';
import { Alert, AppState, View } from 'react-native';

import { AppText, Button, Card, Input } from '../components';
import { activeMapEnvironment } from '../config/activeMapEnvironment';
import {
  checkLocationPermission,
  openAppPermissionSettings,
} from '../features/map/services/locationPermissionService';
import { resetExplorationProgress } from '../features/territory';
import { mapActions, selectLocationPermission } from '../features/map/store';
import { selectIsAuthenticated, useAppDispatch, useAppSelector } from '../store';
import { getLocalTileHost } from '../utils/localTiles';

type SettingsScreenProps = {
  maxZoomOverride: string;
  onMaxZoomOverrideChange: (value: string) => void;
  onShowPlaceMarkersChange: (value: boolean) => void;
  tilesHostOverride: string;
  onTilesHostOverrideChange: (value: string) => void;
  showPlaceMarkers: boolean;
};

export function SettingsScreen({
  maxZoomOverride,
  onMaxZoomOverrideChange,
  onShowPlaceMarkersChange,
  tilesHostOverride,
  onTilesHostOverrideChange,
  showPlaceMarkers,
}: SettingsScreenProps) {
  const dispatch = useAppDispatch();
  const locationPermission = useAppSelector(selectLocationPermission);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const detectedHost = React.useMemo(() => getLocalTileHost(), []);
  const usingAutoHost = !tilesHostOverride.trim();
  const [gpsResetMessage, setGpsResetMessage] = React.useState<string | null>(null);
  const [isResettingProgress, setIsResettingProgress] = React.useState(false);
  const [progressResetMessage, setProgressResetMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    const syncLocationPermission = async () => {
      const permission = await checkLocationPermission();

      if (isMounted) {
        dispatch(
          mapActions.locationPermissionSet(
            locationPermission === 'blocked' && permission === 'denied' ? 'blocked' : permission,
          ),
        );
      }
    };

    void syncLocationPermission();

    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        void syncLocationPermission();
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [dispatch, locationPermission]);

  const handleResetGpsGrants = React.useCallback(async () => {
    dispatch(mapActions.locationPermissionReset());

    try {
      await openAppPermissionSettings();
      setGpsResetMessage(
        'Opened system settings. Reset or re-enable location access there, then return to AtlasB.',
      );
    } catch {
      Alert.alert(
        'Unable to open settings',
        'Open this app in system settings and reset the location permission there.',
      );
      setGpsResetMessage(
        'Open the app in system settings and reset the location permission there.',
      );
    }
  }, [dispatch]);

  const handleResetProgressPress = React.useCallback(() => {
    if (!isAuthenticated) {
      setProgressResetMessage('Sign in to reset saved fog-of-war exploration progress.');
      return;
    }

    Alert.alert(
      'Reset exploration progress?',
      'This will permanently clear your explored territory and fog-of-war progress for this account.',
      [
        {
          style: 'cancel',
          text: 'Cancel',
        },
        {
          style: 'destructive',
          text: 'Reset',
          onPress: () => {
            setIsResettingProgress(true);
            setProgressResetMessage(null);

            dispatch(resetExplorationProgress())
              .then(didReset => {
                setProgressResetMessage(
                  didReset
                    ? 'Exploration progress was reset for this account.'
                    : 'Sign in to reset saved fog-of-war exploration progress.',
                );
              })
              .catch(() => {
                Alert.alert(
                  'Unable to reset progress',
                  'Please try again in a moment.',
                );
              })
              .finally(() => {
                setIsResettingProgress(false);
              });
          },
        },
      ],
    );
  }, [dispatch, isAuthenticated]);

  const handleTogglePlaceMarkers = React.useCallback(() => {
    onShowPlaceMarkersChange(!showPlaceMarkers);
  }, [onShowPlaceMarkersChange, showPlaceMarkers]);

  return (
    <View className="flex-1 gap-3 p-4">
      <AppText variant="sectionTitle">Dev Settings</AppText>
      <AppText tone="muted">
        Developer tools for local map configuration, GPS permission resets, and fog-of-war
        troubleshooting.
      </AppText>

      <Card className="gap-3 rounded-[28px] px-4 py-4">
        <AppText variant="heading">Tiles</AppText>
        <Input
          inputClassName="rounded-xl px-3 py-2 text-sm"
          keyboardType="url"
          label="Tiles host"
          onChangeText={onTilesHostOverrideChange}
          placeholder={detectedHost ?? '192.168.x.x'}
          size="sm"
          value={tilesHostOverride}
        />
        <AppText variant="caption" tone="muted">
          Leave empty to use the detected host automatically.
        </AppText>
        <AppText variant="caption">
          Active environment: {activeMapEnvironment.name}
        </AppText>
        <AppText variant="caption">
          Current host: {usingAutoHost ? detectedHost ?? 'not detected' : tilesHostOverride.trim()}
        </AppText>
        {activeMapEnvironment.baseUrl ? (
          <AppText variant="caption">
            Base URL: {activeMapEnvironment.baseUrl}
          </AppText>
        ) : null}
      </Card>

      <Card className="gap-3 rounded-[28px] px-4 py-4">
        <AppText variant="heading">Map markers</AppText>
        <AppText variant="caption">
          Place markers are currently {showPlaceMarkers ? 'visible' : 'hidden'} on the map.
        </AppText>
        <Button
          label={showPlaceMarkers ? 'Hide place markers' : 'Show place markers'}
          onPress={handleTogglePlaceMarkers}
          variant="secondary"
        />
        <AppText variant="caption" tone="muted">
          Use this to quickly inspect the map without place markers rendered on top.
        </AppText>
      </Card>

      <Card className="gap-3 rounded-[28px] px-4 py-4">
        <AppText variant="heading">Zoom</AppText>
        <Input
          inputClassName="rounded-xl px-3 py-2 text-sm"
          keyboardType="decimal-pad"
          label="Max zoom override"
          onChangeText={onMaxZoomOverrideChange}
          placeholder="Leave empty"
          size="sm"
          value={maxZoomOverride}
        />
        <AppText variant="caption" tone="muted">
          Leave empty to use the default max zoom for the current fog-of-war level.
        </AppText>
        <AppText variant="caption" tone="muted">
          Values below the current minimum zoom are clamped automatically.
        </AppText>
      </Card>

      <Card className="gap-3 rounded-[28px] px-4 py-4">
        <AppText variant="heading">Location</AppText>
        <AppText variant="caption">Current GPS grant: {locationPermission}</AppText>
        <Button label="Reset GPS grants" onPress={handleResetGpsGrants} variant="secondary" />
        <AppText variant="caption" tone="muted">
          AtlasB cannot revoke OS location permission itself, so this opens the app&apos;s system
          settings after clearing the cached GPS state.
        </AppText>
        {gpsResetMessage ? <AppText variant="caption">{gpsResetMessage}</AppText> : null}
      </Card>

      <Card className="gap-3 rounded-[28px] px-4 py-4">
        <AppText variant="heading">Fog of war</AppText>
        <AppText variant="caption" tone="muted">
          Clear your saved explored territory and start map discovery from scratch.
        </AppText>
        <Button
          disabled={!isAuthenticated}
          label="Reset exploration progress"
          loading={isResettingProgress}
          onPress={handleResetProgressPress}
          variant="destructive"
        />
        {!isAuthenticated ? (
          <AppText variant="caption" tone="muted">
            Sign in to reset saved exploration progress.
          </AppText>
        ) : null}
        {progressResetMessage ? <AppText variant="caption">{progressResetMessage}</AppText> : null}
      </Card>
    </View>
  );
}
