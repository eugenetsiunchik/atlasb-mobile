import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';

import { cn } from '../../lib/cn';

const textVariants = cva('', {
  defaultVariants: {
    tone: 'default',
    variant: 'body',
  },
  variants: {
    tone: {
      accent: 'text-accent-strong',
      default: 'text-foreground',
      inverse: 'text-foreground-inverse',
      muted: 'text-foreground-muted',
      subtle: 'text-foreground-subtle',
    },
    variant: {
      body: 'text-sm leading-5',
      caption: 'text-xs',
      display: 'text-[24px] font-bold',
      heading: 'text-lg font-semibold',
      label: 'text-sm font-semibold',
      sectionTitle: 'text-[22px] font-bold',
      stat: 'text-xl font-bold',
    },
  },
});

type AppTextProps = TextProps & VariantProps<typeof textVariants>;

export const AppText = React.forwardRef<React.ElementRef<typeof RNText>, AppTextProps>(
  ({ children, className, tone, variant, ...props }, ref) => {
    return (
      <RNText ref={ref} className={cn(textVariants({ tone, variant }), className)} {...props}>
        {children}
      </RNText>
    );
  },
);

AppText.displayName = 'AppText';
