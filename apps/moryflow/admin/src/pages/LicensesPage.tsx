/**
 * License 管理页面
 */
import { useState } from 'react';
import {
  PageHeader,
  TableSkeleton,
  SimplePagination,
  StatusBadge,
  LICENSE_STATUS_CONFIG,
} from '@/components/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePagination } from '@/hooks';
import { formatDate } from '@/lib/format';
import {
  useLicenses,
  useRevokeLicense,
  LICENSE_STATUS_OPTIONS,
  LICENSE_TIER_LABEL,
  LICENSE_TABLE_COLUMNS,
  RevokeLicenseDialog,
} from '@/features/payment';
import type { License } from '@/types/payment';
import { Ban } from 'lucide-react';

const PAGE_SIZE = 20;

export default function LicensesPage() {
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);

  const { page, setPage, getTotalPages, resetPage } = usePagination({ pageSize: PAGE_SIZE });

  const { data, isLoading } = useLicenses({
    page,
    pageSize: PAGE_SIZE,
    status: selectedStatus,
  });

  const revokeMutation = useRevokeLicense();

  const licenses = data?.licenses || [];
  const totalPages = getTotalPages(data?.pagination.count || 0);

  const handleRevoke = (license: License) => {
    setSelectedLicense(license);
    setRevokeOpen(true);
  };

  const confirmRevoke = () => {
    if (selectedLicense) {
      revokeMutation.mutate(selectedLicense.id, {
        onSuccess: () => {
          setRevokeOpen(false);
          setSelectedLicense(null);
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="License 管理" description="查看和管理永久授权" />

      {/* 筛选器 */}
      <div className="flex gap-2">
        <Select
          value={selectedStatus}
          onValueChange={(v) => {
            setSelectedStatus(v);
            resetPage();
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="选择状态" />
          </SelectTrigger>
          <SelectContent>
            {LICENSE_STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* License 列表 */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>License Key</TableHead>
              <TableHead>用户 ID</TableHead>
              <TableHead>层级</TableHead>
              <TableHead>激活数</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton columns={LICENSE_TABLE_COLUMNS} />
            ) : licenses.length > 0 ? (
              licenses.map((license) => (
                <TableRow key={license.id}>
                  <TableCell className="font-mono text-xs">{license.licenseKey}</TableCell>
                  <TableCell className="font-mono text-xs">{license.userId}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {LICENSE_TIER_LABEL[license.tier] || license.tier}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {license.activationCount} / {license.activationLimit}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={license.status} configMap={LICENSE_STATUS_CONFIG} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(license.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {license.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(license)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        撤销
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  暂无 License 数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      {licenses.length > 0 && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* 撤销确认弹窗 */}
      <RevokeLicenseDialog
        license={selectedLicense}
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        onConfirm={confirmRevoke}
        isLoading={revokeMutation.isPending}
      />
    </div>
  );
}
