import React from 'react';
import { Alert, AppState, View } from 'react-native';

import { AppText, Button, Card, Input } from '../components';
import { activeMapEnvironment } from '../config/activeMapEnvironment';
import {
  checkLocationPermission,
  openAppPermissionSettings,
} from '../features/map/services/locationPermissionService';
import { mapActions, selectLocationPermission } from '../features/map/store';
import { useAppDispatch, useAppSelector } from '../store';
import { getLocalTileHost } from '../utils/localTiles';

type SettingsScreenProps = {
  tilesHostOverride: string;
  onTilesHostOverrideChange: (value: string) => void;
};

export function SettingsScreen({
  tilesHostOverride,
  onTilesHostOverrideChange,
}: SettingsScreenProps) {
  const dispatch = useAppDispatch();
  const locationPermission = useAppSelector(selectLocationPermission);
  const detectedHost = React.useMemo(() => getLocalTileHost(), []);
  const usingAutoHost = !tilesHostOverride.trim();
  const [gpsResetMessage, setGpsResetMessage] = React.useState<string | null>(null);

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

  return (
    <View className="flex-1 gap-3 p-4">
      <AppText variant="sectionTitle">Settings</AppText>
      <AppText tone="muted">
        Configure how the local vector tile map connects during development.
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
        <AppText variant="heading">Location</AppText>
        <AppText variant="caption">Current GPS grant: {locationPermission}</AppText>
        <Button label="Reset GPS grants" onPress={handleResetGpsGrants} variant="secondary" />
        <AppText variant="caption" tone="muted">
          AtlasB cannot revoke OS location permission itself, so this opens the app&apos;s system
          settings after clearing the cached GPS state.
        </AppText>
        {gpsResetMessage ? <AppText variant="caption">{gpsResetMessage}</AppText> : null}
      </Card>
    </View>
  );
}
