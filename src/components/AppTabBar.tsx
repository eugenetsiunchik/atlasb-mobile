import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CurvedBottomBar } from 'react-native-curved-bottom-bar';
import { Map, MapPinned, Plus, Settings, Settings2, User } from 'lucide-react-native';

import { theme, type ThemeMode } from '../theme';

export type RootTabParamList = {
  Map: undefined;
  Profile: undefined;
  Settings: undefined;
};

type TabBarIconProps = {
  color: string;
  focused: boolean;
  routeName: keyof RootTabParamList;
  size: number;
};

type AppTabBarProps = {
  createMenuVisible: boolean;
  isDarkMode: boolean;
  mapComponent: React.ComponentType;
  onCloseCreateMenu: () => void;
  onToggleCreateMenu: () => void;
  profileComponent: React.ComponentType;
  safeAreaBottom: number;
  sceneBackgroundColor: string;
  settingsComponent: React.ComponentType;
};

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

function TabBarIcon({
  color,
  focused,
  routeName,
  size,
}: TabBarIconProps) {
  const Icon = getTabIcon(routeName, focused);

  return (
    <Icon color={color} size={Math.max(size, 20)} strokeWidth={focused ? 2.25 : 2} />
  );
}

export function AppTabBar({
  createMenuVisible,
  isDarkMode,
  mapComponent,
  onCloseCreateMenu,
  onToggleCreateMenu,
  profileComponent,
  safeAreaBottom,
  sceneBackgroundColor,
  settingsComponent,
}: AppTabBarProps) {
  const themeMode: ThemeMode = isDarkMode ? 'dark' : 'light';
  const tabBarAccentColor = theme.tabBar.accent[themeMode];
  const tabBarBackgroundColor = theme.tabBar.background[themeMode];
  const tabBarInactiveTintColor = theme.tabBar.inactiveTint[themeMode];

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
      const color = focused ? tabBarAccentColor : tabBarInactiveTintColor;

      return (
        <Pressable
          onPress={() => {
            onCloseCreateMenu();
            navigate(routeName);
          }}
          style={styles.curvedTabItem}
        >
          <TabBarIcon color={color} focused={focused} routeName={typedRouteName} size={22} />
          <Text style={[styles.curvedTabLabel, { color }]}>{routeName}</Text>
        </Pressable>
      );
    },
    [onCloseCreateMenu, tabBarAccentColor, tabBarInactiveTintColor],
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
          onPress={onToggleCreateMenu}
          style={[
            styles.createButton,
            {
              backgroundColor: tabBarAccentColor,
            },
          ]}
        >
          <Plus color={sceneBackgroundColor} size={28} strokeWidth={2.6} />
        </Pressable>
      </View>
    );
  }, [
    createMenuVisible,
    onToggleCreateMenu,
    sceneBackgroundColor,
    tabBarAccentColor,
    tabBarBackgroundColor,
  ]);

  return (
    <View style={styles.container}>
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
            paddingBottom: safeAreaBottom,
          },
        ]}
        tabBar={renderCurvedTabItem}
        type="DOWN"
      >
        <CurvedBottomBarScreen component={mapComponent} name="Map" position="LEFT" />
        <CurvedBottomBarScreen component={profileComponent} name="Profile" position="RIGHT" />
        <CurvedBottomBarScreen component={settingsComponent} name="Settings" position="RIGHT" />
      </CurvedBottomBarNavigator>
      {safeAreaBottom > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.safeAreaFill,
            {
              backgroundColor: tabBarBackgroundColor,
              height: safeAreaBottom,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
    height: 56,
    justifyContent: 'center',
    width: 56,
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
  },
  safeAreaFill: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    zIndex: 1,
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
