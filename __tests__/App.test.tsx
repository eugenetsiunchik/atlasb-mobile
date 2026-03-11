/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-reanimated', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: {
      View: ReactLib.forwardRef((props: object, _ref: unknown) =>
        ReactLib.createElement(View, props),
      ),
    },
    Easing: {
      cubic: jest.fn(),
      inOut: jest.fn(() => 'inOut'),
      out: jest.fn(() => 'out'),
    },
    interpolate: (
      value: number,
      inputRange: [number, number],
      outputRange: [number, number],
    ) => {
      const [inputStart, inputEnd] = inputRange;
      const [outputStart, outputEnd] = outputRange;
      const progress =
        inputEnd === inputStart ? 0 : (value - inputStart) / (inputEnd - inputStart);

      return outputStart + progress * (outputEnd - outputStart);
    },
    useAnimatedStyle: (updater: () => object) => updater(),
    useSharedValue: (initialValue: number) => ({ value: initialValue }),
    withTiming: (toValue: number) => toValue,
  };
});

jest.mock('react-redux', () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const ReactLib = require('react');

  return {
    __esModule: true,
    Provider: ({ children }: { children: React.ReactNode }) => children,
  };
});

jest.mock('../src/store', () => {
  const mockState = {
    auth: {
      currentUser: null,
      error: null,
      initializing: false,
      modal: {
        actionType: null,
        source: null,
        view: null,
      },
      profile: null,
      status: 'guest',
      submitting: false,
    },
    map: {
      entities: {},
      error: null,
      filters: {
        query: '',
        regionIds: [],
      },
      ids: [],
      locationPermission: 'unknown',
      placesStatus: 'idle',
      selectedPlaceId: null,
      userLocation: null,
    },
    quests: {
      entities: {},
      ids: [],
      progressByQuestId: {},
      progressError: null,
      progressStatus: 'idle',
      questsError: null,
      questsStatus: 'ready',
    },
    userPlaceStates: {
      entities: {},
      error: null,
      ids: [],
      pendingByPlaceId: {},
      pendingRequests: {},
      status: 'idle',
    },
  };
  const dispatch = jest.fn();

  return {
    __esModule: true,
    authActions: {
      authBootstrapStarted: () => ({ type: 'auth/bootstrapStarted' }),
      authErrorSet: (payload: string | null) => ({
        payload,
        type: 'auth/errorSet',
      }),
      authSessionChanged: (payload: unknown) => ({
        payload,
        type: 'auth/sessionChanged',
      }),
      authSessionCleared: () => ({ type: 'auth/sessionCleared' }),
    },
    selectAuthError: (state: typeof mockState) => state.auth.error,
    selectAuthInitializing: (state: typeof mockState) =>
      state.auth.initializing,
    selectAuthModal: (state: typeof mockState) => state.auth.modal,
    selectAuthProfile: (state: typeof mockState) => state.auth.profile,
    selectAuthSubmitting: (state: typeof mockState) =>
      state.auth.submitting,
    selectCurrentUser: (state: typeof mockState) => state.auth.currentUser,
    selectIsAuthenticated: (state: typeof mockState) =>
      state.auth.status === 'authenticated',
    selectQuestCardById: () => null,
    signInWithEmailThunk: (payload: unknown) => ({
      payload,
      type: 'auth/signInWithEmail',
    }),
    signInWithGoogleThunk: () => ({ type: 'auth/signInWithGoogle' }),
    signOutThunk: () => ({ type: 'auth/signOut' }),
    signUpWithEmailThunk: (payload: unknown) => ({
      payload,
      type: 'auth/signUpWithEmail',
    }),
    startAppleSignInPlaceholderThunk: () => ({
      type: 'auth/startApplePlaceholder',
    }),
    store: {
      dispatch,
      getState: () => mockState,
      subscribe: jest.fn(() => jest.fn()),
    },
    useAppDispatch: () => dispatch,
    useAppSelector: (selector: (state: typeof mockState) => unknown) =>
      selector(mockState),
    useQuestProgressEvaluation: jest.fn(),
    useQuestsSync: jest.fn(),
  };
});

jest.mock('../src/services/auth', () => ({
  __esModule: true,
  ensureUserProfile: jest.fn(async () => null),
  requireAuthForAction: jest.fn(() => true),
  subscribeToAuthStateChanges: jest.fn(listener => {
    listener(null);
    return jest.fn();
  }),
}));

jest.mock('../src/firebase', () => ({
  __esModule: true,
  installGlobalFirebaseErrorLogging: jest.fn(),
  logFirebaseError: jest.fn(),
}));

jest.mock('react-native-permissions', () => ({
  __esModule: true,
  check: jest.fn(async () => 'granted'),
  openSettings: jest.fn(async () => undefined),
  PERMISSIONS: {
    ANDROID: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
    },
    IOS: {
      LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
    },
  },
  request: jest.fn(async () => 'granted'),
  RESULTS: {
    BLOCKED: 'blocked',
    DENIED: 'denied',
    GRANTED: 'granted',
    LIMITED: 'limited',
    UNAVAILABLE: 'unavailable',
  },
}));

jest.mock('../src/features/map/config/tileServer', () => ({
  __esModule: true,
  loadResolvedMapStyle: jest.fn(async () => ({
    config: {
      attribution: 'AtlasB tile server',
      maxZoomLevel: 18,
      minZoomLevel: 5,
      rasterTilesPath: '/tiles/{z}/{x}/{y}.png',
      rasterTilesUrl: 'https://example.com/tiles/{z}/{x}/{y}.png',
      stylePath: '/styles/style-dark.json',
      styleUrl: 'https://example.com/styles/style-dark.json',
      tileSize: 256,
    },
    mapStyle: 'https://example.com/styles/style-dark.json',
    warning: null,
  })),
}));

jest.mock('../src/features/map/services/placesService', () => ({
  __esModule: true,
  subscribeToPlaces: jest.fn((_filters, { onSuccess }) => {
    onSuccess([]);
    return jest.fn();
  }),
}));

jest.mock('../src/features/userPlace', () => ({
  __esModule: true,
  useUserPlaceStatesSync: jest.fn(),
}));

jest.mock('../src/components/auth/AuthPromptModal', () => {
  const ReactLib = require('react');
  const { View, Text } = require('react-native');

  return {
    __esModule: true,
    AuthPromptModal: () =>
      ReactLib.createElement(
        View,
        null,
        ReactLib.createElement(Text, null, 'AuthPromptModal'),
      ),
  };
});

jest.mock('../src/screens', () => {
  const ReactLib = require('react');
  const { View, Text } = require('react-native');

  const createScreen = (label: string) => () =>
    ReactLib.createElement(
      View,
      null,
      ReactLib.createElement(Text, null, label),
    );

  return {
    __esModule: true,
    ActiveQuestsScreen: createScreen('ActiveQuestsScreen'),
    MapScreen: createScreen('MapScreen'),
    ProfileScreen: createScreen('ProfileScreen'),
    QuestDetailsScreen: createScreen('QuestDetailsScreen'),
    SettingsScreen: createScreen('SettingsScreen'),
    SignInScreen: createScreen('SignInScreen'),
    SignUpScreen: createScreen('SignUpScreen'),
  };
});

jest.mock('../src/screens/MapScreen', () => {
  const ReactLib = require('react');
  const { View, Text } = require('react-native');

  return {
    __esModule: true,
    MapScreen: () =>
      ReactLib.createElement(
        View,
        null,
        ReactLib.createElement(Text, null, 'MapScreen'),
      ),
  };
});

jest.mock('../src/screens/ActiveQuestsScreen', () => {
  const ReactLib = require('react');
  const { View, Text } = require('react-native');

  return {
    __esModule: true,
    ActiveQuestsScreen: () =>
      ReactLib.createElement(
        View,
        null,
        ReactLib.createElement(Text, null, 'ActiveQuestsScreen'),
      ),
  };
});

jest.mock('../src/screens/QuestDetailsScreen', () => {
  const ReactLib = require('react');
  const { View, Text } = require('react-native');

  return {
    __esModule: true,
    QuestDetailsScreen: () =>
      ReactLib.createElement(
        View,
        null,
        ReactLib.createElement(Text, null, 'QuestDetailsScreen'),
      ),
  };
});

jest.mock('@react-navigation/native', () => {
  return {
    __esModule: true,
    NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
    DarkTheme: {},
    DefaultTheme: {},
  };
});

jest.mock('react-native-curved-bottom-bar', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');

  const Navigator = ({
    children,
    renderCircle,
    tabBar,
  }: {
    children: React.ReactNode;
    renderCircle?: (props: {
      navigate: jest.Mock;
      routeName: string;
      selectedTab: string;
    }) => React.ReactNode;
    tabBar?: (props: {
      navigate: jest.Mock;
      routeName: string;
      selectedTab: string;
    }) => React.ReactNode;
  }) => {
    const screens = ReactLib.Children.toArray(children) as Array<{
      props: { name: string };
    }>;
    const navigate = jest.fn();
    const selectedTab = screens[0]?.props.name ?? 'Map';

    return ReactLib.createElement(
      View,
      null,
      screens.map(screen =>
        ReactLib.createElement(
          View,
          { key: `tab-${screen.props.name}` },
          tabBar
            ? tabBar({
                navigate,
                routeName: screen.props.name,
                selectedTab,
              })
            : null,
        ),
      ),
      renderCircle
        ? renderCircle({
            navigate,
            routeName: 'Create',
            selectedTab,
          })
        : null,
      children,
    );
  };
  const Screen = ({
    component: Component,
    name,
  }: {
    component?: React.ComponentType<any>;
    name: string;
  }) =>
    ReactLib.createElement(
      View,
      null,
      Component ? ReactLib.createElement(Component) : null,
      name,
    );

  return {
    __esModule: true,
    CurvedBottomBar: {
      Navigator,
      Screen,
    },
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const ReactLib = require('react');
  const { View, Text } = require('react-native');

  const Navigator = ({
    children,
    screenOptions,
    tabBar,
  }: {
    children: React.ReactNode;
    screenOptions?: ((args: { route: { key: string; name: string } }) => object) | object;
    tabBar?: (props: {
      descriptors: Record<string, { options: Record<string, unknown> }>;
      insets: { bottom: number; left: number; right: number; top: number };
      navigation: {
        emit: jest.Mock;
        navigate: jest.Mock;
      };
      state: {
        index: number;
        key: string;
        routeNames: string[];
        routes: Array<{ key: string; name: string; params: undefined }>;
        type: string;
      };
    }) => React.ReactNode;
  }) => {
    const screens = ReactLib.Children.toArray(children) as Array<{
      props: { name: string };
    }>;
    const routes = screens.map((screen, index) => ({
      key: `${screen.props.name}-${index}`,
      name: screen.props.name,
      params: undefined,
    }));
    const descriptors = Object.fromEntries(
      routes.map(route => [
        route.key,
        {
          options:
            typeof screenOptions === 'function'
              ? screenOptions({ route })
              : (screenOptions ?? {}),
        },
      ]),
    );
    const navigation = {
      emit: jest.fn(() => ({ defaultPrevented: false })),
      navigate: jest.fn(),
    };
    const state = {
      index: 0,
      key: 'tab-state',
      routeNames: routes.map(route => route.name),
      routes,
      type: 'tab',
    };

    return ReactLib.createElement(
      View,
      null,
      tabBar
        ? tabBar({
            descriptors,
            insets: { bottom: 0, left: 0, right: 0, top: 0 },
            navigation,
            state,
          })
        : null,
      children,
    );
  };
  const Screen = ({
    component: Component,
    name,
  }: {
    component?: React.ComponentType<any>;
    name: string;
  }) =>
    ReactLib.createElement(
      View,
      null,
      ReactLib.createElement(Text, null, name),
      Component ? ReactLib.createElement(Component) : null,
    );

  return {
    __esModule: true,
    createBottomTabNavigator: () => ({
      Navigator,
      Screen,
    }),
  };
});

jest.mock('lucide-react-native', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');

  const createIcon = (name: string) =>
    ({ color, size }: { color?: string; size?: number }) =>
      ReactLib.createElement(Text, null, `${name}:${color ?? ''}:${size ?? ''}`);

  return {
    __esModule: true,
    Map: createIcon('Map'),
    MapPinned: createIcon('MapPinned'),
    FilePlus2: createIcon('FilePlus2'),
    PencilLine: createIcon('PencilLine'),
    Plus: createIcon('Plus'),
    ScrollText: createIcon('ScrollText'),
    Settings: createIcon('Settings'),
    Settings2: createIcon('Settings2'),
    User: createIcon('User'),
  };
});

jest.mock('react-native-svg', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');

  const Svg = ({ children, ...props }: { children?: React.ReactNode }) =>
    ReactLib.createElement(View, props, children);
  const Path = (props: object) => ReactLib.createElement(View, props);

  return {
    __esModule: true,
    default: Svg,
    Path,
  };
});

jest.mock('@maplibre/maplibre-react-native', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: {
      MapView: ({ children, ...props }: { children?: React.ReactNode }) =>
        ReactLib.createElement(View, props, children),
      Camera: (props: object) => ReactLib.createElement(View, props),
      CircleLayer: (props: object) => ReactLib.createElement(View, props),
      ShapeSource: ({ children, ...props }: { children?: React.ReactNode }) =>
        ReactLib.createElement(View, props, children),
      SymbolLayer: (props: object) => ReactLib.createElement(View, props),
      UserLocation: (props: object) => ReactLib.createElement(View, props),
    },
  };
});

jest.mock('react-native-maps', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactLib.createElement(View, props, children),
    UrlTile: (props: object) => ReactLib.createElement(View, props),
  };
});

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
