/**
 * [PROVIDES]: sites list Zustand store（筛选/分页/列表/操作状态）
 * [DEPENDS]: zustand, sites types/view-state
 * [POS]: Sites 列表状态层（不包含网络请求）
 */

import { create } from 'zustand';
import type { SiteActionType, SiteListItem } from './types';
import type { SitesListViewState } from './view-state';

export const SITES_PAGE_SIZE = 20;

interface SitesListState {
  page: number;
  search: string;
  searchInput: string;
  statusFilter: string;
  typeFilter: string;
  tierFilter: string;
  expiryFilter: string;
  sites: SiteListItem[];
  totalPages: number;
  listViewState: SitesListViewState;
  actionSite: SiteListItem | null;
  actionType: SiteActionType | null;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setSearchInput: (searchInput: string) => void;
  setStatusFilter: (statusFilter: string) => void;
  setTypeFilter: (typeFilter: string) => void;
  setTierFilter: (tierFilter: string) => void;
  setExpiryFilter: (expiryFilter: string) => void;
  setSites: (sites: SiteListItem[]) => void;
  setTotalPages: (totalPages: number) => void;
  setListViewState: (state: SitesListViewState) => void;
  setAction: (site: SiteListItem, action: SiteActionType) => void;
  clearAction: () => void;
  reset: () => void;
}

const createInitialState = () => ({
  page: 1,
  search: '',
  searchInput: '',
  statusFilter: 'all',
  typeFilter: 'all',
  tierFilter: 'all',
  expiryFilter: 'all',
  sites: [] as SiteListItem[],
  totalPages: 0,
  listViewState: 'loading' as SitesListViewState,
  actionSite: null as SiteListItem | null,
  actionType: null as SiteActionType | null,
});

export const useSitesListStore = create<SitesListState>((set) => ({
  ...createInitialState(),
  setPage: (page) => set({ page: Math.max(1, page) }),
  setSearch: (search) => set({ search }),
  setSearchInput: (searchInput) => set({ searchInput }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setTierFilter: (tierFilter) => set({ tierFilter }),
  setExpiryFilter: (expiryFilter) => set({ expiryFilter }),
  setSites: (sites) => set({ sites }),
  setTotalPages: (totalPages) => set({ totalPages }),
  setListViewState: (listViewState) => set({ listViewState }),
  setAction: (site, action) => set({ actionSite: site, actionType: action }),
  clearAction: () => set({ actionSite: null, actionType: null }),
  reset: () => set(createInitialState()),
}));
