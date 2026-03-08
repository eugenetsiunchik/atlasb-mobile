/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import './global.css';
import React from 'react';
import { Pressable, StatusBar, StyleSheet, Text, useColorScheme, View } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { CurvedBottomBar } from 'react-native-curved-bottom-bar';
import { Map, MapPinned, Plus, Settings, Settings2, User } from 'lucide-react-native';
import { Provider } from 'react-redux';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { AuthPromptModal, CreateActionMenu } from './src/components';
import { ensureUserProfile, subscribeToAuthStateChanges } from './src/services/auth';
import { theme } from './src/theme';
import {
  ProfileScreen,
  SettingsScreen,
  VectorTileMapScreen,
} from './src/screens';
import { authActions, store, useAppDispatch } from './src/store';

type RootTabParamList = {
  Map: undefined;
  Profile: undefined;
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
const TilesHostOverrideContext =
  React.createContext<TilesHostOverrideContextValue | null>(null);
const CurvedBottomBarNavigator =
  CurvedBottomBar.Navigator as unknown as React.ComponentType<any>;
const CurvedBottomBarScreen =
  CurvedBottomBar.Screen as unknown as React.ComponentType<any>;

function getTabIcon(
  routeName: keyof RootTabParamList,
  focused: boolean,
) {
  switch (routeName) {
    case 'Map':
      return focused ? MapPinned : Map;
    case 'Profile':
      return User;
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

function ProfileTabScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1">
      <ProfileScreen />
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
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <AppContent />
      </SafeAreaProvider>
    </Provider>
  );
}

function AuthBootstrap() {
  const dispatch = useAppDispatch();

  React.useEffect(() => {
    let isMounted = true;
    let authChangeVersion = 0;

    dispatch(authActions.authBootstrapStarted());

    const unsubscribe = subscribeToAuthStateChanges(async user => {
      const currentVersion = ++authChangeVersion;

      if (!user) {
        if (!isMounted || currentVersion !== authChangeVersion) {
          return;
        }

        dispatch(authActions.authSessionCleared());
        return;
      }

      try {
        const profile = await ensureUserProfile(user);

        if (!isMounted || currentVersion !== authChangeVersion) {
          return;
        }

        dispatch(
          authActions.authSessionChanged({
            profile,
            user,
          }),
        );
      } catch (error) {
        if (!isMounted || currentVersion !== authChangeVersion) {
          return;
        }

        dispatch(
          authActions.authSessionChanged({
            profile: null,
            user,
          }),
        );
        dispatch(
          authActions.authErrorSet(
            error instanceof Error
              ? error.message
              : 'Unable to load your account profile.',
          ),
        );
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [dispatch]);

  return null;
}

function AppContent() {
  const isDarkMode = useColorScheme() === 'dark';
  const themeMode = isDarkMode ? 'dark' : 'light';
  const safeAreaInsets = useSafeAreaInsets();
  const [tilesHostOverride, setTilesHostOverride] = React.useState<string>('');
  const [createMenuVisible, setCreateMenuVisible] = React.useState(false);
  const navigationTheme = isDarkMode ? DarkTheme : DefaultTheme;
  const sceneBackgroundColor = navigationTheme.colors.background;
  const tabBarActiveTintColor = theme.tabBar.accent[themeMode];
  const tabBarInactiveTintColor = theme.tabBar.inactiveTint[themeMode];
  const tabBarBackgroundColor = theme.tabBar.background[themeMode];
  const tilesHostOverrideValue = React.useMemo(
    () => ({ tilesHostOverride, setTilesHostOverride }),
    [tilesHostOverride],
  );
  const handleCloseCreateMenu = React.useCallback(() => {
    setCreateMenuVisible(false);
  }, []);
  const handleToggleCreateMenu = React.useCallback(() => {
    setCreateMenuVisible(currentValue => !currentValue);
  }, []);
  const renderCurvedTabItem = React.useCallback(
    ({
      navigate,
      routeName,
      selectedTab,
    }: {
      navigate: (routeName: string) => void;
      routeName: string;
      selectedTab: string;
    }) => {
      const typedRouteName = routeName as keyof RootTabParamList;
      const focused = routeName === selectedTab;
      const color = focused ? tabBarActiveTintColor : tabBarInactiveTintColor;

      return (
        <Pressable
          onPress={() => {
            handleCloseCreateMenu();
            navigate(routeName);
          }}
          style={styles.curvedTabItem}
        >
          {renderTabBarIcon(typedRouteName, {
            color,
            focused,
            size: 22,
          })}
          <Text style={[styles.curvedTabLabel, { color }]}>{routeName}</Text>
        </Pressable>
      );
    },
    [handleCloseCreateMenu, tabBarActiveTintColor, tabBarInactiveTintColor],
  );
  const renderCreateButton = React.useCallback(() => {
    return (
      <View
        style={[
          styles.createButtonShell,
          {
            backgroundColor: tabBarBackgroundColor,
          },
        ]}
      >
        <Pressable
          accessibilityLabel={createMenuVisible ? 'Close create menu' : 'Open create menu'}
          accessibilityRole="button"
          onPress={handleToggleCreateMenu}
          style={[
            styles.createButton,
            {
              backgroundColor: tabBarActiveTintColor,
            },
          ]}
        >
          <Plus color={sceneBackgroundColor} size={28} strokeWidth={2.6} />
        </Pressable>
      </View>
    );
  }, [
    createMenuVisible,
    handleToggleCreateMenu,
    sceneBackgroundColor,
    tabBarActiveTintColor,
    tabBarBackgroundColor,
  ]);

  return (
    <TilesHostOverrideContext.Provider value={tilesHostOverrideValue}>
      <AuthBootstrap />
      <NavigationContainer theme={navigationTheme}>
        <CreateActionMenu
          bottomOffset={safeAreaInsets.bottom + 90}
          isDarkMode={isDarkMode}
          onClose={handleCloseCreateMenu}
          visible={createMenuVisible}
        />
        <CurvedBottomBarNavigator
          bgColor={tabBarBackgroundColor}
          borderTopLeftRight
          circlePosition="CENTER"
          circleWidth={60}
          height={66}
          initialRouteName="Map"
          renderCircle={renderCreateButton}
          screenOptions={{
            headerShown: false,
            sceneStyle: styles.scene,
            tabBarItemStyle: styles.curvedTabScreen,
            tabBarLabelStyle: styles.tabLabel,
          }}
          shadowStyle={isDarkMode ? styles.curvedShadowDark : styles.curvedShadowLight}
          style={[
            styles.curvedBar,
            {
              paddingBottom: safeAreaInsets.bottom,
            },
          ]}
          tabBar={renderCurvedTabItem}
          type="DOWN"
        >
          <CurvedBottomBarScreen component={MapTabScreen} name="Map" position="LEFT" />
          <CurvedBottomBarScreen
            component={ProfileTabScreen}
            name="Profile"
            position="RIGHT"
          />
          <CurvedBottomBarScreen
            component={SettingsTabScreen}
            name="Settings"
            position="RIGHT"
          />
        </CurvedBottomBarNavigator>
      </NavigationContainer>
      <AuthPromptModal />
    </TilesHostOverrideContext.Provider>
  );
}

const styles = StyleSheet.create({
  scene: {
    flex: 1,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  createButton: {
    alignItems: 'center',
    borderRadius: 34,
    height: 69,
    justifyContent: 'center',
    width: 69,
  },
  createButtonShell: {
    alignItems: 'center',
    borderRadius: 34,
    bottom: 32,
    height: 68,
    justifyContent: 'center',
    shadowColor: theme.tabBar.shellShadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    width: 68,
  },
  curvedBar: {
    backgroundColor: 'transparent',
  },
  curvedShadowDark: {
    shadowColor: theme.tabBar.curvedShadow.dark,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.24,
    shadowRadius: 16,
  },
  curvedShadowLight: {
    shadowColor: theme.tabBar.curvedShadow.light,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.12,
    shadowRadius: 14,
  },
  curvedTabItem: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    justifyContent: 'center',
    minHeight: 56,
    paddingTop: 6,
  },
  curvedTabLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  curvedTabScreen: {
    borderRadius: 12,
  },
});

export default App;
