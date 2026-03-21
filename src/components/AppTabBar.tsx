import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CurvedBottomBar } from 'react-native-curved-bottom-bar';
import {
  FilePlus2,
  Map,
  MapPinned,
  PencilLine,
  ScrollText,
  Settings,
  Settings2,
  User,
} from 'lucide-react-native';

import { createActionOptions, runCreateAction, type CreateActionOption } from '../services/create';
import { theme, type ThemeMode } from '../theme';
import { CreateActionFanOut } from './CreateActionFanOut';

export type RootTabParamList = {
  Map: undefined;
  Quests: undefined;
  Profile: undefined;
  Dev: undefined;
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
  questsComponent: React.ComponentType;
  safeAreaBottom: number;
  sceneBackgroundColor: string;
  devSettingsComponent: React.ComponentType;
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
    case 'Quests':
      return ScrollText;
    case 'Dev':
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
  questsComponent,
  safeAreaBottom,
  sceneBackgroundColor,
  devSettingsComponent,
}: AppTabBarProps) {
  const themeMode: ThemeMode = isDarkMode ? 'dark' : 'light';
  const tabBarAccentColor = theme.tabBar.accent[themeMode];
  const tabBarBackgroundColor = theme.tabBar.background[themeMode];
  const tabBarInactiveTintColor = theme.tabBar.inactiveTint[themeMode];
  const createActionMenuBackgroundColor = theme.createActionMenu.menuBackground[themeMode];
  const createActionItems = React.useMemo(
    () =>
      createActionOptions.map(option => ({
        accessibilityLabel: option.description,
        icon: option.id === 'createPost' ? FilePlus2 : PencilLine,
        id: option.id,
      })),
    [],
  );

  const handleSelectCreateAction = React.useCallback(
    (option: CreateActionOption) => {
      onCloseCreateMenu();
      runCreateAction(option);
    },
    [onCloseCreateMenu],
  );

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
    return <View pointerEvents="none" style={styles.circlePlaceholder} />;
  }, []);

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
        <CurvedBottomBarScreen component={questsComponent} name="Quests" position="LEFT" />
        <CurvedBottomBarScreen component={profileComponent} name="Profile" position="RIGHT" />
        <CurvedBottomBarScreen component={devSettingsComponent} name="Dev" position="RIGHT" />
      </CurvedBottomBarNavigator>
      <CreateActionFanOut
        accentColor={tabBarAccentColor}
        bottomOffset={safeAreaBottom}
        iconColor={sceneBackgroundColor}
        items={createActionItems}
        menuBackgroundColor={createActionMenuBackgroundColor}
        onSelect={handleSelectCreateAction}
        onToggle={onToggleCreateMenu}
        shellBackgroundColor={tabBarBackgroundColor}
        visible={createMenuVisible}
      />
      {createMenuVisible ? (
        <Pressable
          accessibilityLabel="Close create menu"
          onPress={onCloseCreateMenu}
          style={[
            styles.dismissOverlay,
            {
              bottom: safeAreaBottom + 120,
            },
          ]}
        />
      ) : null}
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
  curvedBar: {
  },
  circlePlaceholder: {
    height: 68,
    width: 68,
  },
  dismissOverlay: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 2,
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
