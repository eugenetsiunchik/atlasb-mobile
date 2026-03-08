/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import './global.css';
import React from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Map, MapPinned, Settings, Settings2 } from 'lucide-react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

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

function getTabIcon(
  routeName: keyof RootTabParamList,
  focused: boolean,
) {
  switch (routeName) {
    case 'Map':
      return focused ? MapPinned : Map;
    case 'Settings':
      return focused ? Settings2 : Settings;
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
    <SafeAreaView edges={['top']} className="flex-1">
      <SettingsScreen
        tilesHostOverride={tilesHostOverride}
        onTilesHostOverrideChange={setTilesHostOverride}
      />
    </SafeAreaView>
  );
}

function TabBarIcon({
  color,
  focused,
  routeName,
  size,
}: TabBarIconProps & { routeName: keyof RootTabParamList }) {
  const Icon = getTabIcon(routeName, focused);

  return (
    <Icon color={color} size={Math.max(size, 20)} strokeWidth={focused ? 2.25 : 2} />
  );
}

function renderTabBarIcon(
  routeName: keyof RootTabParamList,
  props: TabBarIconProps,
) {
  return <TabBarIcon {...props} routeName={routeName} />;
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
  const tabBarHeight = 56 + safeAreaInsets.bottom;
  const tilesHostOverrideValue = React.useMemo(
    () => ({ tilesHostOverride, setTilesHostOverride }),
    [tilesHostOverride],
  );

  return (
    <TilesHostOverrideContext.Provider value={tilesHostOverrideValue}>
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator
          initialRouteName="Map"
          screenOptions={({ route }) => ({
            headerShown: false,
            sceneStyle: styles.scene,
            tabBarActiveTintColor,
            tabBarInactiveTintColor,
            tabBarStyle: [
              styles.tabBar,
              {
                height: tabBarHeight,
                paddingBottom: safeAreaInsets.bottom + 8,
              },
              isDarkMode ? styles.tabBarDark : styles.tabBarLight,
            ],
            tabBarLabelStyle: styles.tabLabel,
            tabBarIconStyle: styles.tabIcon,
            tabBarItemStyle: styles.tabItem,
            tabBarIcon: props => renderTabBarIcon(route.name, props),
          })}
        >
          <Tab.Screen component={MapTabScreen} name="Map" />
          <Tab.Screen component={SettingsTabScreen} name="Settings" />
        </Tab.Navigator>
      </NavigationContainer>
    </TilesHostOverrideContext.Provider>
  );
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 0,
    elevation: 0,
    paddingTop: 8,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  tabBarDark: {
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
  },
  tabBarLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
  tabIcon: {
    marginBottom: 0,
    alignSelf: 'center',
  },
  tabItem: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default App;
