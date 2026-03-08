import React from 'react';
import { Text, TextInput, View } from 'react-native';

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
      <Text className="text-[22px] font-bold text-neutral-900">Settings</Text>
      <Text className="text-sm text-neutral-500">
        Configure how the local vector tile map connects during development.
      </Text>

      <View className="gap-2 rounded-2xl border border-neutral-300 bg-white p-4">
        <Text className="text-base font-semibold text-gray-900">Tiles</Text>
        <Text className="text-xs font-semibold text-neutral-700">Tiles host</Text>
        <TextInput
          value={tilesHostOverride}
          onChangeText={onTilesHostOverrideChange}
          placeholder={detectedHost ?? '192.168.x.x'}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          className="rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900"
          placeholderTextColor="#9ca3af"
        />
        <Text className="text-xs text-neutral-500">
          Leave empty to use the detected host automatically.
        </Text>
        <Text className="text-xs text-neutral-700">
          Active environment: {activeMapEnvironment.name}
        </Text>
        <Text className="text-xs text-neutral-700">
          Current host: {usingAutoHost ? detectedHost ?? 'not detected' : tilesHostOverride.trim()}
        </Text>
        {activeMapEnvironment.baseUrl ? (
          <Text className="text-xs text-neutral-700">
            Base URL: {activeMapEnvironment.baseUrl}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
