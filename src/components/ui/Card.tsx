import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { View, type ViewProps } from 'react-native';

import { cn } from '../../lib/cn';

const cardVariants = cva('rounded-3xl border p-5', {
  defaultVariants: {
    variant: 'default',
  },
  variants: {
    variant: {
      default: 'border-border bg-card',
      dashed: 'border-border-strong border-dashed bg-background-subtle',
      info: 'border-sky-200 bg-sky-50',
      inverse: 'border-slate-900 bg-slate-900',
      muted: 'border-transparent bg-background-subtle',
      success: 'border-emerald-200 bg-emerald-50',
      warning: 'border-amber-200 bg-amber-50',
    },
  },
});

type CardProps = ViewProps &
  VariantProps<typeof cardVariants> & {
    contentClassName?: string;
  };

export const Card = React.forwardRef<React.ElementRef<typeof View>, CardProps>(
  ({ children, className, contentClassName, variant, ...props }, ref) => {
    return (
      <View ref={ref} className={cn(cardVariants({ variant }), className, contentClassName)} {...props}>
        {children}
      </View>
    );
  },
);

Card.displayName = 'Card';
