import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text as RNText,
  type PressableProps,
} from 'react-native';

import { cn } from '../../lib/cn';

const buttonVariants = cva(
  'min-h-12 flex-row items-center justify-center rounded-2xl border px-4',
  {
    defaultVariants: {
      size: 'md',
      variant: 'primary',
    },
    variants: {
      size: {
        lg: 'min-h-14 px-5',
        md: 'min-h-12 px-4',
        sm: 'min-h-10 px-3',
      },
      variant: {
        destructive: 'border-rose-700 bg-rose-700',
        ghost: 'border-transparent bg-transparent',
        primary: 'border-accent bg-accent',
        secondary: 'border-border bg-card',
      },
    },
  },
);

const buttonTextVariants = cva('text-center font-semibold', {
  defaultVariants: {
    size: 'md',
    variant: 'primary',
  },
  variants: {
    size: {
      lg: 'text-base',
      md: 'text-sm',
      sm: 'text-sm',
    },
    variant: {
      destructive: 'text-white',
      ghost: 'text-accent-strong',
      primary: 'text-foreground',
      secondary: 'text-foreground',
    },
  },
});

type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    label?: string;
    loading?: boolean;
    textClassName?: string;
  };

function getSpinnerColor(variant: ButtonProps['variant']) {
  switch (variant) {
    case 'destructive':
      return '#ffffff';
    case 'ghost':
      return '#e3a35d';
    case 'secondary':
      return '#0f172a';
    case 'primary':
    default:
      return '#0f172a';
  }
}

export const Button = React.forwardRef<React.ElementRef<typeof Pressable>, ButtonProps>(
  (
    {
      children,
      className,
      disabled,
      label,
      loading = false,
      size,
      textClassName,
      variant,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <Pressable
        ref={ref}
        className={cn(buttonVariants({ size, variant }), isDisabled && 'opacity-60', className)}
        disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <ActivityIndicator color={getSpinnerColor(variant)} />
        ) : children ? (
          children
        ) : (
          <RNText className={cn(buttonTextVariants({ size, variant }), textClassName)}>
            {label}
          </RNText>
        )}
      </Pressable>
    );
  },
);

Button.displayName = 'Button';
