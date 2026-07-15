import { useIsMutating } from '@tanstack/react-query';
import {
  Database,
  LayoutDashboard,
  Link2,
  Loader2,
  LogOut,
  RefreshCw,
  Settings,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { SYNC_MUTATION_KEY, useSyncMetrics } from '@/features/metrics/hooks/use-sync-metrics';
import { BrandLogo } from '@/shared/ui/brand-logo';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/shared/ui/breadcrumb';
import { Separator } from '@/shared/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/shared/ui/sidebar';

import { MobileBottomNav } from './MobileBottomNav';
import { useSyncScope } from './sync-scope';

export type AppPage = 'dashboard' | 'data' | 'connect' | 'settings';

interface AppShellProps {
  userEmail: string;
  currentPage: AppPage;
  children: ReactNode;
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'data', label: 'Data & Export', href: '/data', icon: Database },
  { id: 'connect', label: 'Garmin Link', href: '/connect', icon: Link2 },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
] as const;

const PAGE_TITLES: Record<AppPage, string> = {
  dashboard: 'Performance Dashboard',
  data: 'Data & Export',
  connect: 'Garmin Connect',
  settings: 'Settings',
};

const PAGE_TITLES_SHORT: Record<AppPage, string> = {
  dashboard: 'Dashboard',
  data: 'Data',
  connect: 'Garmin',
  settings: 'Settings',
};

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}

function SyncStatusBadge() {
  const syncing = useIsMutating({ mutationKey: SYNC_MUTATION_KEY }) > 0;

  if (!syncing) {
    return null;
  }

  return (
    <span className="ml-auto flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-xs text-success">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      <span className="hidden min-[400px]:inline">Syncing</span>
    </span>
  );
}

function SidebarSyncButton() {
  const syncMutation = useSyncMetrics();
  const scope = useSyncScope();
  const syncing = useIsMutating({ mutationKey: SYNC_MUTATION_KEY }) > 0;

  return (
    <SidebarMenuButton
      tooltip="Sync now"
      onClick={() => syncMutation.mutate(scope)}
      disabled={syncing}
    >
      {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      <span>{syncing ? 'Syncing…' : 'Sync now'}</span>
    </SidebarMenuButton>
  );
}

export function AppShell({ userEmail, currentPage, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<a href="/dashboard" />}>
                <BrandLogo size="sm" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {NAV_ITEMS.map(({ id, label, href, icon: Icon }) => (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      isActive={currentPage === id}
                      tooltip={label}
                      render={<a href={href} />}
                    >
                      <Icon />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <SidebarGroupLabel>Actions</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarSyncButton />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="pointer-events-none">
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {userEmail}
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Sign out" onClick={handleLogout}>
                <LogOut />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      {/*
        App shell layout: header + bottom nav are fixed chrome;
        only the middle section scrolls. This keeps navigation always reachable on mobile.
      */}
      <SidebarInset className="flex h-dvh max-h-dvh flex-col overflow-hidden">
        <header className="z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur supports-backdrop-filter:bg-background/80">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4!" />
          <Breadcrumb className="min-w-0 flex-1">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="truncate font-heading font-medium">
                  <span className="sm:hidden">{PAGE_TITLES_SHORT[currentPage]}</span>
                  <span className="hidden sm:inline">{PAGE_TITLES[currentPage]}</span>
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <SyncStatusBadge />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
          <div className="flex flex-col gap-6 p-4 md:p-6">{children}</div>
        </div>

        <MobileBottomNav currentPage={currentPage} className="sm:hidden" />
      </SidebarInset>
    </SidebarProvider>
  );
}
