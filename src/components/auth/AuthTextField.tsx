import React from 'react';
import type { TextInputProps } from 'react-native';

import { Input } from '../ui';

type AuthTextFieldProps = TextInputProps & {
  label: string;
};

export function AuthTextField({ label, ...props }: AuthTextFieldProps) {
  return <Input label={label} {...props} />;
}
