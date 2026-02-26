/**
 * [PROVIDES]: ADMIN_PROTECTED_ROUTES, ADMIN_NAV_GROUPS, isPathActive
 * [DEPENDS]: React lazy, lucide-react
 * [POS]: Admin 路由与侧栏导航单一来源
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import {
  TriangleAlert,
  Globe,
  Brain,
  CreditCard,
  LayoutDashboard,
  Layers,
  ListTodo,
  Receipt,
  Users,
  Flag,
  Newspaper,
  Pencil,
  type LucideIcon,
} from 'lucide-react';

export type AdminNavGroupId =
  | 'overview'
  | 'users-billing'
  | 'operations'
  | 'logs'
  | 'ai'
  | 'digest';

type RouteComponent = LazyExoticComponent<ComponentType>;

export interface AdminNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export interface AdminNavGroup {
  id: AdminNavGroupId;
  label: string;
  icon: LucideIcon;
  items: AdminNavItem[];
}

interface AdminNavGroupMeta {
  id: AdminNavGroupId;
  label: string;
  icon: LucideIcon;
}

interface AdminRouteNavMeta {
  groupId: AdminNavGroupId;
  path: string;
  label: string;
  icon: LucideIcon;
}

export interface AdminProtectedRoute {
  id: string;
  component: RouteComponent;
  index?: true;
  path?: string;
  nav?: AdminRouteNavMeta;
}

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));
const OrdersPage = lazy(() => import('@/pages/OrdersPage'));
const SubscriptionsPage = lazy(() => import('@/pages/SubscriptionsPage'));
const JobsPage = lazy(() => import('@/pages/JobsPage'));
const JobDetailPage = lazy(() => import('@/pages/JobDetailPage'));
const QueuesPage = lazy(() => import('@/pages/QueuesPage'));
const ErrorsPage = lazy(() => import('@/pages/ErrorsPage'));
const LogsRequestsPage = lazy(() => import('@/pages/logs/LogsRequestsPage'));
const LogsUsersPage = lazy(() => import('@/pages/logs/LogsUsersPage'));
const LogsIpPage = lazy(() => import('@/pages/logs/LogsIpPage'));
const BrowserPage = lazy(() => import('@/pages/BrowserPage'));
const LlmPage = lazy(() => import('@/pages/LlmPage'));
const DigestTopicsPage = lazy(() => import('@/pages/DigestTopicsPage'));
const DigestReportsPage = lazy(() => import('@/pages/DigestReportsPage'));
const DigestWelcomePage = lazy(() => import('@/pages/DigestWelcomePage'));

const ADMIN_NAV_GROUP_META: AdminNavGroupMeta[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
  },
  {
    id: 'users-billing',
    label: 'Users & Billing',
    icon: Users,
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: Layers,
  },
  {
    id: 'logs',
    label: 'Logs',
    icon: TriangleAlert,
  },
  {
    id: 'ai',
    label: 'AI',
    icon: Brain,
  },
  {
    id: 'digest',
    label: 'Digest',
    icon: Newspaper,
  },
];

export const ADMIN_PROTECTED_ROUTES: AdminProtectedRoute[] = [
  {
    id: 'dashboard',
    index: true,
    component: DashboardPage,
    nav: {
      groupId: 'overview',
      path: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
  },
  {
    id: 'users',
    path: 'users',
    component: UsersPage,
    nav: {
      groupId: 'users-billing',
      path: '/users',
      label: 'Users',
      icon: Users,
    },
  },
  {
    id: 'orders',
    path: 'orders',
    component: OrdersPage,
    nav: {
      groupId: 'users-billing',
      path: '/orders',
      label: 'Orders',
      icon: Receipt,
    },
  },
  {
    id: 'subscriptions',
    path: 'subscriptions',
    component: SubscriptionsPage,
    nav: {
      groupId: 'users-billing',
      path: '/subscriptions',
      label: 'Subscriptions',
      icon: CreditCard,
    },
  },
  {
    id: 'jobs',
    path: 'jobs',
    component: JobsPage,
    nav: {
      groupId: 'operations',
      path: '/jobs',
      label: 'Jobs',
      icon: ListTodo,
    },
  },
  {
    id: 'job-detail',
    path: 'jobs/:id',
    component: JobDetailPage,
  },
  {
    id: 'queues',
    path: 'queues',
    component: QueuesPage,
    nav: {
      groupId: 'operations',
      path: '/queues',
      label: 'Queues',
      icon: Layers,
    },
  },
  {
    id: 'browser',
    path: 'browser',
    component: BrowserPage,
    nav: {
      groupId: 'operations',
      path: '/browser',
      label: 'Browser Pool',
      icon: Globe,
    },
  },
  {
    id: 'errors',
    path: 'errors',
    component: ErrorsPage,
    nav: {
      groupId: 'operations',
      path: '/errors',
      label: 'Errors',
      icon: TriangleAlert,
    },
  },
  {
    id: 'logs-requests',
    path: 'logs/requests',
    component: LogsRequestsPage,
    nav: {
      groupId: 'logs',
      path: '/logs/requests',
      label: 'Requests',
      icon: ListTodo,
    },
  },
  {
    id: 'logs-users',
    path: 'logs/users',
    component: LogsUsersPage,
    nav: {
      groupId: 'logs',
      path: '/logs/users',
      label: 'Users',
      icon: Users,
    },
  },
  {
    id: 'logs-ip',
    path: 'logs/ip',
    component: LogsIpPage,
    nav: {
      groupId: 'logs',
      path: '/logs/ip',
      label: 'IP Monitor',
      icon: Globe,
    },
  },
  {
    id: 'llm',
    path: 'llm',
    component: LlmPage,
    nav: {
      groupId: 'ai',
      path: '/llm',
      label: 'LLM',
      icon: Brain,
    },
  },
  {
    id: 'digest-topics',
    path: 'digest/topics',
    component: DigestTopicsPage,
    nav: {
      groupId: 'digest',
      path: '/digest/topics',
      label: 'Topics',
      icon: Newspaper,
    },
  },
  {
    id: 'digest-reports',
    path: 'digest/reports',
    component: DigestReportsPage,
    nav: {
      groupId: 'digest',
      path: '/digest/reports',
      label: 'Reports',
      icon: Flag,
    },
  },
  {
    id: 'digest-welcome',
    path: 'digest/welcome',
    component: DigestWelcomePage,
    nav: {
      groupId: 'digest',
      path: '/digest/welcome',
      label: 'Welcome',
      icon: Pencil,
    },
  },
];

const navItemsByGroup = ADMIN_PROTECTED_ROUTES.reduce<Record<AdminNavGroupId, AdminNavItem[]>>(
  (acc, route) => {
    if (!route.nav) return acc;
    acc[route.nav.groupId].push({
      path: route.nav.path,
      label: route.nav.label,
      icon: route.nav.icon,
    });
    return acc;
  },
  {
    overview: [],
    'users-billing': [],
    operations: [],
    logs: [],
    ai: [],
    digest: [],
  }
);

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = ADMIN_NAV_GROUP_META.reduce<AdminNavGroup[]>(
  (acc, group) => {
    const items = navItemsByGroup[group.id];
    if (items.length === 0) return acc;
    acc.push({
      ...group,
      items,
    });
    return acc;
  },
  []
);

export function isPathActive(pathname: string, itemPath: string): boolean {
  if (itemPath === '/') return pathname === '/';
  if (pathname === itemPath) return true;
  return pathname.startsWith(`${itemPath}/`);
}
