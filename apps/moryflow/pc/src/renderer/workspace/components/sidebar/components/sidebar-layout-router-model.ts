import type { Destination, SidebarMode } from '@/workspace/navigation/state';
import { resolveWorkspaceLayout } from '@/workspace/navigation/layout-resolver';

export const resolveSidebarContentMode = (
  destination: Destination,
  mode: SidebarMode
): SidebarMode => resolveWorkspaceLayout({ destination, sidebarMode: mode }).sidebarContentMode;
