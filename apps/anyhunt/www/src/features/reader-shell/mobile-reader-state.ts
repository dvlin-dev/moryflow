/**
 * [PROVIDES]: 移动端 Reader 路由状态计算（Tab/Pane/显隐规则）
 * [DEPENDS]: none
 * [POS]: ReaderShell 移动端布局决策与路由判定
 * [UPDATE]: 2026-01-28 增加移动端详情返回目标
 */

export type MobileTabId = 'inbox' | 'explore' | 'subscriptions';

export type MobilePane = 'list' | 'detail';

export interface MobileBackTarget {
  label: string;
  to: string;
  params?: Record<string, string>;
}

export interface MobileTabItem {
  id: MobileTabId;
  label: string;
  to: string;
}

export const MOBILE_TAB_ITEMS: MobileTabItem[] = [
  { id: 'inbox', label: 'Inbox', to: '/inbox' },
  { id: 'explore', label: 'Explore', to: '/explore' },
  { id: 'subscriptions', label: 'Subscriptions', to: '/subscriptions' },
];

function normalizePathname(pathname: string) {
  if (!pathname) return '/';
  if (pathname === '/') return pathname;
  return pathname.replace(/\/+$/, '');
}

export function getActiveMobileTab(pathname: string): MobileTabId | null {
  const normalized = normalizePathname(pathname);

  if (normalized.startsWith('/inbox')) return 'inbox';
  if (normalized.startsWith('/explore')) return 'explore';
  if (normalized.startsWith('/subscriptions')) return 'subscriptions';
  return null;
}

export function shouldShowMobileTabs(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return normalized === '/inbox' || normalized === '/explore' || normalized === '/subscriptions';
}

export function getMobilePane(pathname: string): MobilePane {
  const normalized = normalizePathname(pathname);

  if (normalized.startsWith('/inbox/items/')) return 'detail';
  if (normalized === '/inbox') return 'list';

  if (normalized.startsWith('/topic/') && normalized.includes('/editions/')) return 'detail';
  if (normalized.startsWith('/topic/')) return 'list';

  return 'detail';
}

export function shouldRedirectWelcomeOnMobile(pathname: string): boolean {
  const normalized = normalizePathname(pathname);
  return normalized === '/welcome';
}

export function getMobileBackTarget(pathname: string): MobileBackTarget | null {
  const normalized = normalizePathname(pathname);
  const segments = normalized.split('/').filter(Boolean);

  if (segments[0] === 'inbox' && segments[1] === 'items' && segments[2]) {
    return { label: 'Inbox', to: '/inbox' };
  }

  if (segments[0] === 'topic' && segments[1] && segments[2] === 'editions' && segments[3]) {
    return {
      label: 'Topic',
      to: '/topic/$slug',
      params: { slug: segments[1] },
    };
  }

  if (segments[0] === 'topic' && segments[1]) {
    return { label: 'Explore', to: '/explore' };
  }

  return null;
}
