import React from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

type AuthTextFieldProps = TextInputProps & {
  label: string;
};

export function AuthTextField({ label, ...props }: AuthTextFieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-neutral-800">{label}</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        className="rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900"
        placeholderTextColor="#9ca3af"
        {...props}
      />
    </View>
  );
}
