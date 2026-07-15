import type { ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

/** Fade-in suave del contenido de página al montar (tw-animate-css). */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('animate-in fade-in slide-in-from-bottom-1 duration-300', className)}>
      {children}
    </div>
  );
}
