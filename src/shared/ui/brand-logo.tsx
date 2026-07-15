import { Flame } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

interface BrandLogoProps {
  className?: string;
  iconClassName?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { icon: 'size-4', text: 'text-xs', tagline: 'text-[10px]' },
  md: { icon: 'size-5', text: 'text-sm', tagline: 'text-xs' },
  lg: { icon: 'size-6', text: 'text-lg', tagline: 'text-sm' },
} as const;

export function BrandLogo({
  className,
  iconClassName,
  showTagline = false,
  size = 'md',
}: BrandLogoProps) {
  const s = SIZES[size];

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      <div className="flex items-center gap-2">
        <Flame className={cn(s.icon, 'text-primary', iconClassName)} />
        <span
          className={cn(s.text, 'font-heading font-bold tracking-widest text-foreground uppercase')}
        >
          TrackForge
        </span>
      </div>
      {showTagline ? (
        <p className={cn(s.tagline, 'pl-7 text-muted-foreground tracking-wide')}>
          Raw effort. Precision data.
        </p>
      ) : null}
    </div>
  );
}
