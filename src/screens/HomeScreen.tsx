import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { UrlTile } from 'react-native-maps';

export function HomeScreen() {
  return (
    <View className="flex-1 gap-2 p-4">
      <Text className="text-[22px] font-bold text-neutral-900">AtlasbMobile</Text>
      <Text className="text-sm text-neutral-500">React Native + Firebase + OSM</Text>

      <MapView
        style={styles.map}
        mapType={Platform.OS === 'android' ? 'none' : 'standard'}
        initialRegion={{
          latitude: 53.6847,
          longitude: 23.995,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          tileSize={256}
        />
      </MapView>
      <Text className="text-xs text-neutral-500">© OpenStreetMap contributors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
});

