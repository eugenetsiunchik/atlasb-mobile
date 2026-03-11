/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import './global.css';
import React from 'react';
import { StatusBar, useColorScheme } from 'react-native';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { Provider } from 'react-redux';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { AppTabBar, AuthPromptModal } from './src/components';
import { useUserPlaceStatesSync } from './src/features/userPlace';
import { installGlobalFirebaseErrorLogging, logFirebaseError } from './src/firebase';
import { ensureUserProfile, subscribeToAuthStateChanges } from './src/services/auth';
import {
  ActiveQuestsScreen,
  MapScreen,
  ProfileScreen,
  QuestDetailsScreen,
  SettingsScreen,
} from './src/screens';
import {
  authActions,
  selectQuestCardById,
  store,
  useAchievementEvaluation,
  useAppDispatch,
  useAppSelector,
  useQuestProgressEvaluation,
  useQuestsSync,
  useUserAchievementsSync,
} from './src/store';

installGlobalFirebaseErrorLogging();

type TilesHostOverrideContextValue = {
  tilesHostOverride: string;
  setTilesHostOverride: (value: string) => void;
};
const TilesHostOverrideContext =
  React.createContext<TilesHostOverrideContextValue | null>(null);

function useTilesHostOverride() {
  const context = React.useContext(TilesHostOverrideContext);

  if (!context) {
    throw new Error('TilesHostOverrideContext is not available.');
  }

  return context;
}

function MapTabScreen() {
  const { tilesHostOverride } = useTilesHostOverride();

  return <MapScreen hostOverride={tilesHostOverride} />;
}

function SettingsTabScreen() {
  const { tilesHostOverride, setTilesHostOverride } = useTilesHostOverride();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <SettingsScreen
        tilesHostOverride={tilesHostOverride}
        onTilesHostOverrideChange={setTilesHostOverride}
      />
    </SafeAreaView>
  );
}

function ProfileTabScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ProfileScreen />
    </SafeAreaView>
  );
}

function QuestsTabScreen() {
  const [selectedQuestId, setSelectedQuestId] = React.useState<string | null>(null);
  const selectedQuest = useAppSelector(state => selectQuestCardById(state, selectedQuestId));

  React.useEffect(() => {
    if (selectedQuestId && !selectedQuest) {
      setSelectedQuestId(null);
    }
  }, [selectedQuest, selectedQuestId]);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {selectedQuestId && selectedQuest ? (
        <QuestDetailsScreen
          onBack={() => {
            setSelectedQuestId(null);
          }}
          questId={selectedQuestId}
        />
      ) : (
        <ActiveQuestsScreen onOpenQuest={setSelectedQuestId} />
      )}
    </SafeAreaView>
  );
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

        logFirebaseError(
          'Auth bootstrap profile load failed',
          {
            authChangeVersion: currentVersion,
            email: user.email ?? null,
            uid: user.uid,
          },
          error,
        );

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
  const safeAreaInsets = useSafeAreaInsets();
  const [tilesHostOverride, setTilesHostOverride] = React.useState<string>('');
  const [createMenuVisible, setCreateMenuVisible] = React.useState(false);
  const navigationTheme = isDarkMode ? DarkTheme : DefaultTheme;
  const sceneBackgroundColor = navigationTheme.colors.background;
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

  useUserPlaceStatesSync();
  useUserAchievementsSync();
  useQuestsSync();
  useQuestProgressEvaluation();
  useAchievementEvaluation();

  return (
    <TilesHostOverrideContext.Provider value={tilesHostOverrideValue}>
      <AuthBootstrap />
      <NavigationContainer theme={navigationTheme}>
        <AppTabBar
          createMenuVisible={createMenuVisible}
          isDarkMode={isDarkMode}
          mapComponent={MapTabScreen}
          onCloseCreateMenu={handleCloseCreateMenu}
          onToggleCreateMenu={handleToggleCreateMenu}
          profileComponent={ProfileTabScreen}
          questsComponent={QuestsTabScreen}
          safeAreaBottom={safeAreaInsets.bottom}
          sceneBackgroundColor={sceneBackgroundColor}
          settingsComponent={SettingsTabScreen}
        />
      </NavigationContainer>
      <AuthPromptModal />
    </TilesHostOverrideContext.Provider>
  );
}

export default App;
