import { Database, LayoutDashboard, Link2, Settings } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

import type { AppPage } from './AppShell';

const NAV_ITEMS = [
  { id: 'dashboard' as const, label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'data' as const, label: 'Data', href: '/data', icon: Database },
  { id: 'connect' as const, label: 'Links', href: '/connect', icon: Link2 },
  { id: 'settings' as const, label: 'Settings', href: '/settings', icon: Settings },
] as const;

interface MobileBottomNavProps {
  currentPage: AppPage;
  className?: string;
}

export function MobileBottomNav({ currentPage, className }: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        'shrink-0 border-t border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80',
        'pb-[max(0.5rem,env(safe-area-inset-bottom))]',
        className,
      )}
    >
      <div className="flex h-14 items-stretch">
        {NAV_ITEMS.map(({ id, label, href, icon: Icon }) => {
          const active = currentPage === id;
          return (
            <a
              key={id}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className={cn('size-5', active && 'stroke-[2.5px]')} />
              <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
