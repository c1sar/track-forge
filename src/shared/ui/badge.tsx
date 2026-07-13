import { cva, type VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/shared/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap w-fit [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        success:
          'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
        warning:
          'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
