import React from 'react';
import { View } from 'react-native';

import { AppText, Card, Input } from '../components';
import { activeMapEnvironment } from '../config/activeMapEnvironment';
import { getLocalTileHost } from '../utils/localTiles';

type SettingsScreenProps = {
  tilesHostOverride: string;
  onTilesHostOverrideChange: (value: string) => void;
};

export function SettingsScreen({
  tilesHostOverride,
  onTilesHostOverrideChange,
}: SettingsScreenProps) {
  const detectedHost = React.useMemo(() => getLocalTileHost(), []);
  const usingAutoHost = !tilesHostOverride.trim();

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
    </View>
  );
}
