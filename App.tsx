/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { SettingsScreen } from './src/screens/SettingsScreen';
import { VectorTileMapScreen } from './src/screens/VectorTileMapScreen';

type TabKey = 'map' | 'settings';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'map', label: 'Map' },
  { key: 'settings', label: 'Settings' },
];

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = React.useState<TabKey>('map');
  const [tilesHostOverride, setTilesHostOverride] = React.useState<string>('');
  const tabBarBottomPadding = Math.max(safeAreaInsets.bottom, 12);
  const settingsBottomInset = tabBarBottomPadding + 56;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.content,
          activeTab === 'settings' && { paddingTop: safeAreaInsets.top },
          activeTab === 'settings' && { paddingBottom: settingsBottomInset },
        ]}
      >
        {activeTab === 'map' ? (
          <VectorTileMapScreen hostOverride={tilesHostOverride} />
        ) : (
          <SettingsScreen
            tilesHostOverride={tilesHostOverride}
            onTilesHostOverrideChange={setTilesHostOverride}
          />
        )}
      </View>
      <View
        style={[
          styles.tabBar,
          { paddingBottom: tabBarBottomPadding },
        ]}
      >
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
            >
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 0,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
  },
  tabButtonActive: {
    backgroundColor: '#111827',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tabLabelActive: {
    color: '#fff',
  },
});

export default App;
