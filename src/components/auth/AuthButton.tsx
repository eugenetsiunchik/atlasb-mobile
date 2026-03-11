import React from 'react';
import { Button } from '../ui';

type AuthButtonProps = {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  variant?: 'danger' | 'ghost' | 'primary' | 'secondary';
};

export function AuthButton({
  disabled = false,
  label,
  loading = false,
  onPress,
  variant = 'primary',
}: AuthButtonProps) {
  return (
    <Button
      disabled={disabled}
      label={label}
      loading={loading}
      onPress={onPress}
      variant={variant === 'danger' ? 'destructive' : variant}
    />
  );
}
