import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { Text as RNText, View, type TextProps, type ViewProps } from 'react-native';

import { cn } from '../../lib/cn';

const badgeVariants = cva('self-start rounded-full px-3 py-1', {
  defaultVariants: {
    variant: 'default',
  },
  variants: {
    variant: {
      active: 'bg-amber-100',
      completed: 'bg-emerald-100',
      default: 'bg-background-subtle',
      info: 'bg-sky-100',
      muted: 'bg-slate-200',
    },
  },
});

const badgeTextVariants = cva('text-xs font-semibold uppercase tracking-wide', {
  defaultVariants: {
    variant: 'default',
  },
  variants: {
    variant: {
      active: 'text-amber-800',
      completed: 'text-emerald-800',
      default: 'text-foreground-muted',
      info: 'text-sky-800',
      muted: 'text-slate-700',
    },
  },
});

type BadgeProps = ViewProps &
  VariantProps<typeof badgeVariants> & {
    label: string;
    textClassName?: TextProps['className'];
  };

export function Badge({ className, label, textClassName, variant, ...props }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)} {...props}>
      <RNText className={cn(badgeTextVariants({ variant }), textClassName)}>{label}</RNText>
    </View>
  );
}
