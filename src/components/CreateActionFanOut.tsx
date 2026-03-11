import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import type { CreateActionOption } from '../services/create';
import { theme } from '../theme';

type CreateActionFanOutItem = {
  accessibilityLabel: string;
  icon: React.ComponentType<{
    color?: string;
    size?: number;
    strokeWidth?: number;
  }>;
  id: CreateActionOption;
};

type CreateActionFanOutProps = {
  accentColor: string;
  bottomOffset: number;
  iconColor: string;
  items: readonly CreateActionFanOutItem[];
  menuBackgroundColor: string;
  onSelect: (option: CreateActionOption) => void;
  onToggle: () => void;
  shellBackgroundColor: string;
  visible: boolean;
};

const FAN_OUT_POSITIONS = [
  { x: -26, y: -90 },
  { x: 56, y: -90 },
] as const;

type FanOutActionButtonProps = {
  accentColor: string;
  icon: CreateActionFanOutItem['icon'];
  item: CreateActionFanOutItem;
  menuBackgroundColor: string;
  onPress: (option: CreateActionOption) => void;
  progress: SharedValue<number>;
  position: (typeof FAN_OUT_POSITIONS)[number];
  visible: boolean;
};

function FanOutActionButton({
  accentColor,
  icon: Icon,
  item,
  menuBackgroundColor,
  onPress,
  progress,
  position,
  visible,
}: FanOutActionButtonProps) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: progress.value,
      transform: [
        { translateX: interpolate(progress.value, [0, 1], [0, position.x]) },
        { translateY: interpolate(progress.value, [0, 1], [0, position.y]) },
        { scale: interpolate(progress.value, [0, 1], [0.7, 1]) },
      ],
    };
  }, [position.x, position.y]);

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.miniButtonWrapper, animatedStyle]}
    >
      <Pressable
        accessibilityLabel={item.accessibilityLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => onPress(item.id)}
        style={({ pressed }) => [
          styles.miniButton,
          {
            backgroundColor: menuBackgroundColor,
            borderColor: accentColor,
          },
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Icon color={accentColor} size={18} strokeWidth={2.2} />
      </Pressable>
    </Animated.View>
  );
}

export function CreateActionFanOut({
  accentColor,
  bottomOffset,
  iconColor,
  items,
  menuBackgroundColor,
  onSelect,
  onToggle,
  shellBackgroundColor,
  visible,
}: CreateActionFanOutProps) {
  const progress = useSharedValue(visible ? 1 : 0);

  React.useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 220 : 180,
      easing: visible ? Easing.out(Easing.cubic) : Easing.inOut(Easing.cubic),
    });
  }, [progress, visible]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg`,
      },
      {
        scale: interpolate(progress.value, [0, 1], [1, 0.96]),
      },
    ],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.root, { bottom: bottomOffset }]}>
      <View pointerEvents="box-none" style={styles.anchor}>
        {items.slice(0, FAN_OUT_POSITIONS.length).map((item, index) => {
          return (
            <FanOutActionButton
              accentColor={accentColor}
              icon={item.icon}
              key={item.id}
              item={item}
              menuBackgroundColor={menuBackgroundColor}
              onPress={onSelect}
              position={FAN_OUT_POSITIONS[index]}
              progress={progress}
              visible={visible}
            />
          );
        })}
        <View
          style={[
            styles.mainButtonShell,
            {
              backgroundColor: shellBackgroundColor,
            },
          ]}
        >
          <Pressable
            accessibilityLabel={visible ? 'Close create menu' : 'Open create menu'}
            accessibilityRole="button"
            hitSlop={6}
            onPress={onToggle}
            style={({ pressed }) => [
              styles.mainButton,
              {
                backgroundColor: accentColor,
              },
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Animated.View style={iconStyle}>
              <Plus color={iconColor} size={28} strokeWidth={2.6} />
            </Animated.View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: {
    height: 136,
    position: 'relative',
    width: 160,
  },
  buttonPressed: {
    opacity: 0.82,
  },
  mainButton: {
    alignItems: 'center',
    borderRadius: 34,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  mainButtonShell: {
    alignItems: 'center',
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    left: 46,
    position: 'absolute',
    shadowColor: theme.tabBar.shellShadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    top: 36,
    width: 68,
    zIndex: 2,
  },
  miniButton: {
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1.5,
    height: 44,
    justifyContent: 'center',
    shadowColor: theme.createActionMenu.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    width: 44,
  },
  miniButtonWrapper: {
    bottom: 24,
    left: 58,
    position: 'absolute',
    zIndex: 1,
  },
  root: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    justifyContent: 'flex-end',
    zIndex: 3,
  },
});
