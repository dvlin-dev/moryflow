import type { NavMenuItem } from '@/lib/navigation';

export type HeaderAuthViewState = 'loading' | 'authenticated' | 'guest';

export interface HeaderMenuItemProps {
  item: NavMenuItem;
  onSelect: () => void;
}
