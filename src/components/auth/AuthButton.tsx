import React from 'react';
import { ActivityIndicator, Pressable, Text } from 'react-native';

type AuthButtonProps = {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  variant?: 'danger' | 'ghost' | 'primary' | 'secondary';
};

const containerClasses = {
  danger: 'border border-rose-700 bg-rose-700',
  ghost: 'border border-transparent bg-transparent',
  primary: 'border border-sky-600 bg-sky-600',
  secondary: 'border border-neutral-300 bg-white',
};

const textClasses = {
  danger: 'text-white',
  ghost: 'text-sky-700',
  primary: 'text-white',
  secondary: 'text-neutral-900',
};

export function AuthButton({
  disabled = false,
  label,
  loading = false,
  onPress,
  variant = 'primary',
}: AuthButtonProps) {
  const isDisabled = disabled || loading;
  const textClassName = textClasses[variant];

  return (
    <Pressable
      className={`min-h-12 items-center justify-center rounded-2xl px-4 ${
        containerClasses[variant]
      } ${isDisabled ? 'opacity-60' : ''}`}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#111827' : '#ffffff'} />
      ) : (
        <Text className={`text-sm font-semibold ${textClassName}`}>{label}</Text>
      )}
    </Pressable>
  );
}
