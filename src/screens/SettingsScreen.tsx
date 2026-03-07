import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

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
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        Configure how the local vector tile map connects during development.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Tiles</Text>
        <Text style={styles.label}>Tiles host</Text>
        <TextInput
          value={tilesHostOverride}
          onChangeText={onTilesHostOverrideChange}
          placeholder={detectedHost ?? '192.168.x.x'}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
        />
        <Text style={styles.helpText}>
          Leave empty to use the detected host automatically.
        </Text>
        <Text style={styles.metaText}>
          Active environment: {activeMapEnvironment.name}
        </Text>
        <Text style={styles.metaText}>
          Current host: {usingAutoHost ? detectedHost ?? 'not detected' : tilesHostOverride.trim()}
        </Text>
        {activeMapEnvironment.baseUrl ? (
          <Text style={styles.metaText}>
            Base URL: {activeMapEnvironment.baseUrl}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  card: {
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d7d7d7',
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
  },
  metaText: {
    fontSize: 12,
    color: '#444',
  },
});
