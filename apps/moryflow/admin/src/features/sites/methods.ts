/**
 * [PROVIDES]: sitesListMethods（筛选/分页/操作编排）
 * [DEPENDS]: sites store/hooks/view-state
 * [POS]: Sites 列表业务编排层
 */

import type { SiteListResponse, SiteActionType, SiteListItem } from './types';
import { resolveSitesListViewState } from './view-state';
import { SITES_PAGE_SIZE, useSitesListStore } from './store';

interface SyncSitesListQueryStateParams {
  data: SiteListResponse | undefined;
  isLoading: boolean;
  error: unknown;
}

interface ConfirmSiteActionMutations {
  offline: (id: string) => Promise<unknown>;
  online: (id: string) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
}

function resolveTotalPages(totalCount: number): number {
  return Math.ceil(totalCount / SITES_PAGE_SIZE);
}

export function applySitesSearch(): void {
  const state = useSitesListStore.getState();
  state.setSearch(state.searchInput);
  state.setPage(1);
}

export function setSitesStatusFilter(value: string): void {
  const state = useSitesListStore.getState();
  state.setStatusFilter(value);
  state.setPage(1);
}

export function setSitesTypeFilter(value: string): void {
  const state = useSitesListStore.getState();
  state.setTypeFilter(value);
  state.setPage(1);
}

export function setSitesTierFilter(value: string): void {
  const state = useSitesListStore.getState();
  state.setTierFilter(value);
  state.setPage(1);
}

export function setSitesExpiryFilter(value: string): void {
  const state = useSitesListStore.getState();
  state.setExpiryFilter(value);
  state.setPage(1);
}

export function syncSitesListQueryState({
  data,
  isLoading,
  error,
}: SyncSitesListQueryStateParams): void {
  const sites = data?.sites ?? [];
  const listViewState = resolveSitesListViewState({
    isLoading,
    error: error instanceof Error ? error : error ? new Error('Request failed') : null,
    count: sites.length,
  });

  const totalPages = resolveTotalPages(data?.pagination.total ?? 0);
  const state = useSitesListStore.getState();
  state.setSites(sites);
  state.setTotalPages(totalPages);
  state.setListViewState(listViewState);
}

export function openSiteActionDialog(site: SiteListItem, action: SiteActionType): void {
  useSitesListStore.getState().setAction(site, action);
}

export function closeSiteActionDialog(): void {
  useSitesListStore.getState().clearAction();
}

export async function confirmSiteAction(
  mutations: ConfirmSiteActionMutations
): Promise<void> {
  const { actionSite, actionType } = useSitesListStore.getState();
  if (!actionSite || !actionType) return;

  const id = actionSite.id;

  switch (actionType) {
    case 'offline':
      await mutations.offline(id);
      break;
    case 'online':
      await mutations.online(id);
      break;
    case 'delete':
      await mutations.remove(id);
      break;
  }

  closeSiteActionDialog();
}

export function resetSitesListState(): void {
  useSitesListStore.getState().reset();
}

export const sitesListMethods = {
  applySitesSearch,
  setSitesStatusFilter,
  setSitesTypeFilter,
  setSitesTierFilter,
  setSitesExpiryFilter,
  syncSitesListQueryState,
  openSiteActionDialog,
  closeSiteActionDialog,
  confirmSiteAction,
  resetSitesListState,
};
