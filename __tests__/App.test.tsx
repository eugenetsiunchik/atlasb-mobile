/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

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
    name,
    children,
  }: {
    name: string;
    children: () => React.ReactNode;
  }) =>
    ReactLib.createElement(
      View,
      null,
      ReactLib.createElement(Text, null, name),
      children(),
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

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
