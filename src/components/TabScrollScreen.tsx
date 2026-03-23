import React from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBottomTabContentPadding } from '../utils';

type TabScrollScreenProps = ScrollViewProps;

export function TabScrollScreen({
  children,
  className,
  contentContainerClassName,
  contentContainerStyle,
  ...props
}: TabScrollScreenProps) {
  const { bottom } = useSafeAreaInsets();

  return (
    <ScrollView
      className={className ?? 'flex-1'}
      contentContainerClassName={contentContainerClassName}
      contentContainerStyle={[
        {
          paddingBottom: getBottomTabContentPadding(bottom),
        },
        contentContainerStyle,
      ]}
      {...props}
    >
      {children}
    </ScrollView>
  );
}
