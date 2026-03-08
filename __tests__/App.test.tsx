/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-redux', () => {
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

jest.mock('@react-navigation/native', () => {
  return {
    __esModule: true,
    NavigationContainer: ({ children }: { children: React.ReactNode }) => children,
    DarkTheme: {},
    DefaultTheme: {},
  };
});

jest.mock('@react-navigation/bottom-tabs', () => {
  const ReactLib = require('react');
  const { View, Text } = require('react-native');

  const Navigator = ({ children }: { children: React.ReactNode }) =>
    ReactLib.createElement(View, null, children);
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
    Settings: createIcon('Settings'),
    Settings2: createIcon('Settings2'),
    User: createIcon('User'),
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
