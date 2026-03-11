import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import {
  Text as RNText,
  TextInput,
  View,
  type TextInputProps,
  type ViewProps,
} from 'react-native';

import { cn } from '../../lib/cn';

const inputVariants = cva(
  'rounded-2xl border border-border bg-card px-4 py-3 text-base text-foreground',
  {
    defaultVariants: {
      size: 'md',
    },
    variants: {
      size: {
        md: 'min-h-12',
        sm: 'min-h-10 px-3 py-2 text-sm',
      },
    },
  },
);

type InputProps = TextInputProps &
  VariantProps<typeof inputVariants> & {
    containerClassName?: string;
    hint?: string;
    hintClassName?: string;
    inputClassName?: string;
    label?: string;
    labelClassName?: string;
    wrapperProps?: ViewProps;
  };

export const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
  (
    {
      autoCapitalize = 'none',
      autoCorrect = false,
      containerClassName,
      hint,
      hintClassName,
      inputClassName,
      label,
      labelClassName,
      size,
      wrapperProps,
      ...props
    },
    ref,
  ) => {
    return (
      <View className={cn('gap-2', containerClassName)} {...wrapperProps}>
        {label ? (
          <RNText className={cn('text-sm font-semibold text-foreground', labelClassName)}>
            {label}
          </RNText>
        ) : null}
        <TextInput
          ref={ref}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          className={cn(inputVariants({ size }), inputClassName)}
          placeholderTextColor="#64748b"
          {...props}
        />
        {hint ? <RNText className={cn('text-xs text-foreground-muted', hintClassName)}>{hint}</RNText> : null}
      </View>
    );
  },
);

Input.displayName = 'Input';
