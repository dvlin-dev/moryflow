/**
 * 站点管理页面
 */

import { useState } from 'react';
import { PageHeader, SimplePagination } from '@/components/shared';
import { usePagination } from '@/hooks';
import {
  useSites,
  useOfflineSite,
  useOnlineSite,
  useDeleteSite,
  SitesFilterBar,
  SitesTable,
  SiteActionConfirmDialog,
  resolveSitesListViewState,
  type SiteActionType,
  type SiteListItem,
} from '@/features/sites';

const PAGE_SIZE = 20;

export default function SitesPage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all');

  const [actionSite, setActionSite] = useState<SiteListItem | null>(null);
  const [actionType, setActionType] = useState<SiteActionType | null>(null);

  const { page, setPage, getTotalPages, resetPage } = usePagination({ pageSize: PAGE_SIZE });

  const { data, isLoading, error } = useSites({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    userTier: tierFilter !== 'all' ? tierFilter : undefined,
    expiryFilter: expiryFilter !== 'all' ? expiryFilter : undefined,
  });

  const offlineMutation = useOfflineSite();
  const onlineMutation = useOnlineSite();
  const deleteMutation = useDeleteSite();

  const sites = data?.sites || [];
  const totalPages = getTotalPages(data?.pagination.total || 0);
  const listViewState = resolveSitesListViewState({
    isLoading,
    error,
    count: sites.length,
  });

  const handleSearch = () => {
    setSearch(searchInput);
    resetPage();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleAction = (site: SiteListItem, action: SiteActionType) => {
    setActionSite(site);
    setActionType(action);
  };

  const handleConfirmAction = () => {
    if (!actionSite || !actionType) return;

    const id = actionSite.id;
    switch (actionType) {
      case 'offline':
        offlineMutation.mutate(id);
        break;
      case 'online':
        onlineMutation.mutate(id);
        break;
      case 'delete':
        deleteMutation.mutate(id);
        break;
    }

    setActionSite(null);
    setActionType(null);
  };

  const handleActionDialogOpenChange = (open: boolean) => {
    if (!open) {
      setActionSite(null);
      setActionType(null);
    }
  };

  const isActionLoading =
    offlineMutation.isPending || onlineMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title="站点管理" description="查看和管理用户发布的站点" />

      <SitesFilterBar
        searchInput={searchInput}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        tierFilter={tierFilter}
        expiryFilter={expiryFilter}
        onSearchInputChange={setSearchInput}
        onSearch={handleSearch}
        onSearchKeyDown={handleSearchKeyDown}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          resetPage();
        }}
        onTypeFilterChange={(value) => {
          setTypeFilter(value);
          resetPage();
        }}
        onTierFilterChange={(value) => {
          setTierFilter(value);
          resetPage();
        }}
        onExpiryFilterChange={(value) => {
          setExpiryFilter(value);
          resetPage();
        }}
      />

      <SitesTable sites={sites} viewState={listViewState} onAction={handleAction} />

      {listViewState === 'ready' && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <SiteActionConfirmDialog
        actionType={actionType}
        siteSubdomain={actionSite?.subdomain}
        isLoading={isActionLoading}
        open={!!actionType}
        onOpenChange={handleActionDialogOpenChange}
        onConfirm={handleConfirmAction}
      />
    </div>
  );
}
