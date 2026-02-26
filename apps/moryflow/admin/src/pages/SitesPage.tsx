/**
 * 站点管理页面
 */

import { useEffect } from 'react';
import { PageHeader, SimplePagination } from '@/components/shared';
import {
  SiteActionConfirmDialog,
  SitesFilterBar,
  SitesTable,
  useSites,
  useSitesListStore,
  sitesListMethods,
  SITES_PAGE_SIZE,
} from '@/features/sites';

export default function SitesPage() {
  const page = useSitesListStore((state) => state.page);
  const search = useSitesListStore((state) => state.search);
  const statusFilter = useSitesListStore((state) => state.statusFilter);
  const typeFilter = useSitesListStore((state) => state.typeFilter);
  const tierFilter = useSitesListStore((state) => state.tierFilter);
  const expiryFilter = useSitesListStore((state) => state.expiryFilter);
  const listViewState = useSitesListStore((state) => state.listViewState);
  const totalPages = useSitesListStore((state) => state.totalPages);
  const setPage = useSitesListStore((state) => state.setPage);

  const { data, isLoading, error } = useSites({
    page,
    pageSize: SITES_PAGE_SIZE,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    type: typeFilter !== 'all' ? typeFilter : undefined,
    userTier: tierFilter !== 'all' ? tierFilter : undefined,
    expiryFilter: expiryFilter !== 'all' ? expiryFilter : undefined,
  });

  useEffect(() => {
    sitesListMethods.resetSitesListState();
  }, []);

  useEffect(() => {
    sitesListMethods.syncSitesListQueryState({
      data,
      isLoading,
      error,
    });
  }, [data, isLoading, error]);

  return (
    <div className="space-y-6">
      <PageHeader title="站点管理" description="查看和管理用户发布的站点" />

      <SitesFilterBar />

      <SitesTable />

      {listViewState === 'ready' && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <SiteActionConfirmDialog />
    </div>
  );
}
