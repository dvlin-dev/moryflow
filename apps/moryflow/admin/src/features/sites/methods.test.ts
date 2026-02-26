import { beforeEach, describe, expect, it } from 'vitest';
import { sitesListMethods, syncSitesListQueryState } from './methods';
import { useSitesListStore } from './store';
import type { SiteListItem } from './types';

const demoSite: SiteListItem = {
  id: 'site_1',
  subdomain: 'demo',
  type: 'MARKDOWN',
  status: 'ACTIVE',
  title: 'Demo',
  showWatermark: false,
  publishedAt: null,
  expiresAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  url: 'https://demo.moryflow.app',
  pageCount: 1,
  owner: {
    id: 'user_1',
    email: 'demo@example.com',
    name: null,
    subscriptionTier: 'free',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
};

describe('sitesListMethods', () => {
  beforeEach(() => {
    sitesListMethods.resetSitesListState();
  });

  it('applySitesSearch 会把输入值应用到 query 并重置分页', () => {
    const state = useSitesListStore.getState();
    state.setSearchInput('demo-site');
    state.setPage(3);

    sitesListMethods.applySitesSearch();

    const next = useSitesListStore.getState();
    expect(next.search).toBe('demo-site');
    expect(next.page).toBe(1);
  });

  it('筛选变更会重置分页', () => {
    const state = useSitesListStore.getState();
    state.setPage(4);

    sitesListMethods.setSitesStatusFilter('ACTIVE');

    const next = useSitesListStore.getState();
    expect(next.statusFilter).toBe('ACTIVE');
    expect(next.page).toBe(1);
  });

  it('syncSitesListQueryState 能同步 ready 列表状态和总页数', () => {
    syncSitesListQueryState({
      data: {
        sites: [
          {
            id: 'site_1',
            subdomain: 'demo',
            type: 'MARKDOWN',
            status: 'ACTIVE',
            title: 'Demo',
            showWatermark: false,
            publishedAt: null,
            expiresAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            url: 'https://demo.moryflow.app',
            pageCount: 1,
            owner: {
              id: 'user_1',
              email: 'demo@example.com',
              name: null,
              subscriptionTier: 'free',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          },
        ],
        pagination: {
          total: 45,
          limit: 20,
          offset: 0,
        },
      },
      isLoading: false,
      error: null,
    });

    const next = useSitesListStore.getState();
    expect(next.listViewState).toBe('ready');
    expect(next.sites).toHaveLength(1);
    expect(next.totalPages).toBe(3);
  });

  it('syncSitesListQueryState 在失败时进入 error 状态', () => {
    syncSitesListQueryState({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
    });

    expect(useSitesListStore.getState().listViewState).toBe('error');
  });

  it('confirmSiteAction 成功时关闭确认弹窗', async () => {
    sitesListMethods.openSiteActionDialog(demoSite, 'offline');

    const offline = async () => Promise.resolve();
    const online = async () => Promise.resolve();
    const remove = async () => Promise.resolve();

    await sitesListMethods.confirmSiteAction({ offline, online, remove });

    const next = useSitesListStore.getState();
    expect(next.actionType).toBeNull();
    expect(next.actionSite).toBeNull();
  });

  it('confirmSiteAction 失败时保持确认弹窗打开', async () => {
    sitesListMethods.openSiteActionDialog(demoSite, 'offline');

    await expect(
      sitesListMethods.confirmSiteAction({
        offline: async () => Promise.reject(new Error('offline failed')),
        online: async () => Promise.resolve(),
        remove: async () => Promise.resolve(),
      })
    ).rejects.toThrow('offline failed');

    const next = useSitesListStore.getState();
    expect(next.actionType).toBe('offline');
    expect(next.actionSite?.id).toBe('site_1');
  });
});
