import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { UrlTile } from 'react-native-maps';

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>AtlasbMobile</Text>
      <Text style={styles.subtitle}>React Native + Firebase + OSM</Text>

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
      <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#666',
  },
  map: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  attribution: {
    fontSize: 12,
    color: '#666',
  },
});

