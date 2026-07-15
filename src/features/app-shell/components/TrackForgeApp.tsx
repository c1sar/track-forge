import { ConnectionsApp } from '@/features/connections/components/ConnectionsApp';
import { DashboardApp } from '@/features/metrics/components/DashboardApp';
import { DataApp } from '@/features/metrics/components/DataApp';
import { SettingsApp } from '@/features/settings/components/SettingsApp';

import type { AppPage } from './AppShell';
import { TrackForgeAppShell } from './TrackForgeAppShell';

interface TrackForgeAppProps {
  userEmail: string;
  currentPage: AppPage;
}

const PAGES: Record<AppPage, () => React.ReactNode> = {
  dashboard: () => <DashboardApp />,
  data: () => <DataApp />,
  connect: () => <ConnectionsApp />,
  settings: () => <SettingsApp />,
};

/**
 * Isla única para todas las páginas autenticadas. Con `transition:persist`
 * el island no se desmonta al navegar: el cache de TanStack Query y el estado
 * del sidebar sobreviven, y solo cambia el contenido según `currentPage`.
 */
export function TrackForgeApp({ userEmail, currentPage }: TrackForgeAppProps) {
  return (
    <TrackForgeAppShell userEmail={userEmail} currentPage={currentPage}>
      {PAGES[currentPage]()}
    </TrackForgeAppShell>
  );
}
