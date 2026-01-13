/**
 * Digest Reports 页面
 * 举报管理
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v3';
import { CheckmarkSquare01Icon, Cancel01Icon, ViewIcon } from '@hugeicons/core-free-icons';
import { PageHeader } from '@aiget/ui';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Skeleton,
  Icon,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Textarea,
  Checkbox,
} from '@aiget/ui';
import { formatRelativeTime } from '@aiget/ui/lib';
import { useReports, useResolveReport } from '@/features/digest-reports';
import type { Report, ReportStatus, ReportReason, ReportQuery } from '@/features/digest-reports';

const STATUS_OPTIONS: ReportStatus[] = [
  'PENDING',
  'RESOLVED_VALID',
  'RESOLVED_INVALID',
  'DISMISSED',
];

const reasonLabels: Record<ReportReason, string> = {
  SPAM: 'Spam',
  COPYRIGHT: 'Copyright',
  INAPPROPRIATE: 'Inappropriate',
  MISLEADING: 'Misleading',
  OTHER: 'Other',
};

const statusConfig: Record<
  ReportStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  PENDING: { label: 'Pending', variant: 'destructive' },
  RESOLVED_VALID: { label: 'Valid', variant: 'default' },
  RESOLVED_INVALID: { label: 'Invalid', variant: 'secondary' },
  DISMISSED: { label: 'Dismissed', variant: 'outline' },
};

const resolveFormSchema = z.object({
  status: z.enum(['RESOLVED_VALID', 'RESOLVED_INVALID', 'DISMISSED'] as const),
  resolveNote: z.string().max(500).optional(),
  pauseTopic: z.boolean(),
});

type ResolveFormValues = z.infer<typeof resolveFormSchema>;

export default function DigestReportsPage() {
  const [query, setQuery] = useState<ReportQuery>({ limit: 20 });
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const { data, isLoading } = useReports(query);
  const resolveMutation = useResolveReport();

  const form = useForm<ResolveFormValues>({
    resolver: zodResolver(resolveFormSchema),
    defaultValues: {
      status: 'RESOLVED_VALID',
      resolveNote: '',
      pauseTopic: false,
    },
  });

  const handleFilterStatus = (status: string) => {
    setQuery((prev) => ({
      ...prev,
      status: status === 'all' ? undefined : (status as ReportStatus),
    }));
  };

  const handleResolve = (report: Report) => {
    setSelectedReport(report);
    form.reset({
      status: 'RESOLVED_VALID',
      resolveNote: '',
      pauseTopic: false,
    });
    setResolveDialogOpen(true);
  };

  const onSubmit = async (values: ResolveFormValues) => {
    if (!selectedReport) return;

    try {
      await resolveMutation.mutateAsync({
        id: selectedReport.id,
        input: {
          status: values.status,
          resolveNote: values.resolveNote || undefined,
          pauseTopic: values.pauseTopic,
        },
      });
      setResolveDialogOpen(false);
      setSelectedReport(null);
    } catch {
      // Error handled by mutation
    }
  };

  const pendingCount = data?.pendingCount ?? 0;

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
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusConfig[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.items.length ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No reports found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((report) => {
                  const config = statusConfig[report.status];
                  return (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{report.topic?.title || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">/{report.topic?.slug}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{reasonLabels[report.reason]}</Badge>
                        {report.description && (
                          <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
                            {report.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelativeTime(report.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {report.topic?.slug && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`/digest/${report.topic?.slug}`, '_blank')}
                              title="View Topic"
                            >
                              <Icon icon={ViewIcon} className="h-4 w-4" />
                            </Button>
                          )}
                          {report.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResolve(report)}
                              title="Resolve"
                            >
                              <Icon icon={CheckmarkSquare01Icon} className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Review and resolve the report for &quot;{selectedReport?.topic?.title}&quot;
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm font-medium">
                  Reason: {selectedReport && reasonLabels[selectedReport.reason]}
                </p>
                {selectedReport?.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{selectedReport.description}</p>
                )}
              </div>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolution</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="RESOLVED_VALID">Valid - Report is legitimate</SelectItem>
                        <SelectItem value="RESOLVED_INVALID">
                          Invalid - Report is not legitimate
                        </SelectItem>
                        <SelectItem value="DISMISSED">Dismissed - No action needed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch('status') === 'RESOLVED_VALID' && (
                <FormField
                  control={form.control}
                  name="pauseTopic"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0 rounded-md border p-3">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div>
                        <FormLabel className="cursor-pointer">Pause Topic</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Temporarily hide this topic from public view
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="resolveNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add a note about this resolution..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResolveDialogOpen(false)}
                  disabled={resolveMutation.isPending}
                >
                  <Icon icon={Cancel01Icon} className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={resolveMutation.isPending}>
                  <Icon icon={CheckmarkSquare01Icon} className="mr-2 h-4 w-4" />
                  {resolveMutation.isPending ? 'Resolving...' : 'Resolve'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
