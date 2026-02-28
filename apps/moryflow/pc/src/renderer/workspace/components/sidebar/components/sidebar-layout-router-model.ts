import type { Destination, SidebarMode } from '@/workspace/navigation/state';

export const resolveSidebarContentMode = (
  destination: Destination,
  mode: SidebarMode
): SidebarMode => (destination === 'agent' ? mode : 'home');
