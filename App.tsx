/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { SettingsScreen } from './src/screens/SettingsScreen';
import { VectorTileMapScreen } from './src/screens/VectorTileMapScreen';

type RootTabParamList = {
  Map: undefined;
  Settings: undefined;
};

type TilesHostOverrideContextValue = {
  tilesHostOverride: string;
  setTilesHostOverride: (value: string) => void;
};

type TabBarIconProps = {
  color: string;
  focused: boolean;
  size: number;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const TilesHostOverrideContext =
  React.createContext<TilesHostOverrideContextValue | null>(null);

function getTabIconName(routeName: keyof RootTabParamList, focused: boolean) {
  switch (routeName) {
    case 'Map':
      return focused ? 'map' : 'map-outline';
    case 'Settings':
      return focused ? 'settings' : 'settings-outline';
  }
}

function useTilesHostOverride() {
  const context = React.useContext(TilesHostOverrideContext);

  if (!context) {
    throw new Error('TilesHostOverrideContext is not available.');
  }

  return context;
}

function MapTabScreen() {
  const { tilesHostOverride } = useTilesHostOverride();

  return <VectorTileMapScreen hostOverride={tilesHostOverride} />;
}

function SettingsTabScreen() {
  const { tilesHostOverride, setTilesHostOverride } = useTilesHostOverride();

  return (
    <SafeAreaView edges={['top']} style={styles.settingsContainer}>
      <SettingsScreen
        tilesHostOverride={tilesHostOverride}
        onTilesHostOverrideChange={setTilesHostOverride}
      />
    </SafeAreaView>
  );
}

function MapTabIcon({ color, focused, size }: TabBarIconProps) {
  return (
    <Ionicons
      color={color}
      name={getTabIconName('Map', focused)}
      size={Math.max(size, 20)}
    />
  );
}

function SettingsTabIcon({ color, focused, size }: TabBarIconProps) {
  return (
    <Ionicons
      color={color}
      name={getTabIconName('Settings', focused)}
      size={Math.max(size, 20)}
    />
  );
}

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
  const isDarkMode = useColorScheme() === 'dark';
  const safeAreaInsets = useSafeAreaInsets();
  const [tilesHostOverride, setTilesHostOverride] = React.useState<string>('');
  const navigationTheme = isDarkMode ? DarkTheme : DefaultTheme;
  const tabBarActiveTintColor = isDarkMode ? '#f9fafb' : '#111827';
  const tabBarInactiveTintColor = isDarkMode ? '#9ca3af' : '#6b7280';
  const tabBarBottomInset = safeAreaInsets.bottom + 12;
  const tilesHostOverrideValue = React.useMemo(
    () => ({ tilesHostOverride, setTilesHostOverride }),
    [tilesHostOverride],
  );

  return (
    <TilesHostOverrideContext.Provider value={tilesHostOverrideValue}>
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          initialRouteName="Map"
          screenOptions={{
            headerShown: false,
            sceneStyle: styles.scene,
            tabBarActiveTintColor,
            tabBarInactiveTintColor,
            tabBarStyle: [
              styles.tabBar,
              {
                bottom: tabBarBottomInset,
                height: 56,
              },
              isDarkMode ? styles.tabBarDark : styles.tabBarLight,
            ],
            tabBarLabelStyle: styles.tabLabel,
            tabBarItemStyle: styles.tabItem,
          }}
        >
          <Tab.Screen
            component={MapTabScreen}
            name="Map"
            options={{ tabBarIcon: MapTabIcon }}
          />
          <Tab.Screen
            component={SettingsTabScreen}
            name="Settings"
            options={{ tabBarIcon: SettingsTabIcon }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </TilesHostOverrideContext.Provider>
  );
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
  },
  settingsContainer: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderTopWidth: 0,
    elevation: 0,
    paddingBottom: 8,
    paddingTop: 8,
    borderRadius: 18,
  },
  tabBarDark: {
    backgroundColor: 'rgba(17, 24, 39, 0.8)',
  },
  tabBarLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#111827',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabItem: {
    borderRadius: 12,
  },
});

export default App;
