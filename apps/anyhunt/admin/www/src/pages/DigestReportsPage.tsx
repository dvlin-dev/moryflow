/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Digest reports management container
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useState } from 'react';
import { PageHeader } from '@moryflow/ui';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui';
import {
  DIGEST_REPORT_PUBLIC_BASE_URL,
  REPORT_STATUS_OPTIONS,
  DigestReportsListContent,
  ResolveReportDialog,
  reportStatusConfig,
  resolveDigestReportsListState,
  useReports,
  useResolveReport,
  type Report,
  type ReportQuery,
  type ReportStatus,
  type ResolveReportInput,
} from '@/features/digest-reports';

export default function DigestReportsPage() {
  const [query, setQuery] = useState<ReportQuery>({ page: 1, limit: 20 });
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const reportsQuery = useReports(query);
  const resolveMutation = useResolveReport();

  const handleFilterStatus = (status: string) => {
    setQuery((previous) => ({
      ...previous,
      page: 1,
      status: status === 'all' ? undefined : (status as ReportStatus),
    }));
  };

  const handlePageChange = (page: number) => {
    setQuery((previous) => ({ ...previous, page }));
  };

  const handleRequestResolve = (report: Report) => {
    setSelectedReport(report);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedReport(null);
    }
  };

  const handleResolveSubmit = async (input: ResolveReportInput) => {
    if (!selectedReport) {
      return;
    }

    try {
      await resolveMutation.mutateAsync({
        id: selectedReport.id,
        input,
      });
      setSelectedReport(null);
    } catch {
      // error handled by mutation hook
    }
  };

  const handleViewTopic = (slug: string) => {
    window.open(`${DIGEST_REPORT_PUBLIC_BASE_URL}/topics/${slug}`, '_blank');
  };

  const reportsState = resolveDigestReportsListState({
    isLoading: reportsQuery.isLoading,
    hasError: reportsQuery.isError,
    itemCount: reportsQuery.data?.items.length ?? 0,
  });

  const pendingCount = reportsQuery.data?.pendingCount ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Digest Reports"
        description={
          pendingCount > 0
            ? `${pendingCount} pending report${pendingCount > 1 ? 's' : ''} need attention`
            : 'Manage topic reports'
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Report List</CardTitle>
            <Select value={query.status || 'all'} onValueChange={handleFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {REPORT_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {reportStatusConfig[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DigestReportsListContent
            state={reportsState}
            data={reportsQuery.data}
            error={reportsQuery.error}
            onResolve={handleRequestResolve}
            onPageChange={handlePageChange}
            onViewTopic={handleViewTopic}
          />
        </CardContent>
      </Card>

      <ResolveReportDialog
        open={Boolean(selectedReport)}
        report={selectedReport}
        isSubmitting={resolveMutation.isPending}
        onOpenChange={handleDialogOpenChange}
        onSubmit={handleResolveSubmit}
      />
    </div>
  );
}
