import { useState } from 'react';
import { Plus, Eye, Pencil, Trash2, Search, Copy, CircleCheck } from 'lucide-react';
import { PageHeader, TableSkeleton, SimplePagination } from '@/components/shared';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePagination } from '@/hooks';
import { formatDate } from '@/lib/format';
import {
  useRedemptionCodes,
  useRedemptionCode,
  useCreateRedemptionCode,
  useUpdateRedemptionCode,
  useDeleteRedemptionCode,
  resolveRedemptionCodesViewState,
  CODE_TYPE_OPTIONS,
  ACTIVE_STATUS_OPTIONS,
  CODE_TYPE_LABEL,
  CreateCodeDialog,
  EditCodeDialog,
  CodeDetailDialog,
} from '@/features/redemption-codes';
import type {
  RedemptionCode,
  CreateRedemptionCodeRequest,
  UpdateRedemptionCodeRequest,
} from '@/features/redemption-codes';

const PAGE_SIZE = 20;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
      {copied ? <CircleCheck className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function codeDetailText(item: RedemptionCode) {
  if (item.type === 'CREDITS') return `${item.creditsAmount ?? '-'} 积分`;
  if (item.type === 'MEMBERSHIP') {
    const tier = item.membershipTier
      ? item.membershipTier.charAt(0).toUpperCase() + item.membershipTier.slice(1)
      : '-';
    return `${tier} / ${item.membershipDays ?? '-'}天`;
  }
  return '-';
}

export default function RedemptionCodesPage() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RedemptionCode | null>(null);
  const [detailId, setDetailId] = useState('');

  const { page, setPage, resetPage } = usePagination({ pageSize: PAGE_SIZE });

  const { data, isLoading, error } = useRedemptionCodes({
    page,
    pageSize: PAGE_SIZE,
    type: typeFilter,
    isActive: activeFilter,
    search,
  });

  const { data: detailData } = useRedemptionCode(detailId);
  const createMutation = useCreateRedemptionCode();
  const updateMutation = useUpdateRedemptionCode();
  const deleteMutation = useDeleteRedemptionCode();

  const items = data?.items ?? [];
  const totalPages = data?.pagination.totalPages ?? 0;
  const viewState = resolveRedemptionCodesViewState({
    isLoading,
    error,
    count: items.length,
  });

  const handleSearch = () => {
    setSearch(searchInput);
    resetPage();
  };

  const handleCreate = (values: CreateRedemptionCodeRequest) => {
    return createMutation.mutateAsync(values);
  };

  const handleUpdate = (values: UpdateRedemptionCodeRequest) => {
    if (!editTarget) return;
    updateMutation.mutate(
      { id: editTarget.id, data: values },
      { onSuccess: () => setEditTarget(null) }
    );
  };

  const renderRows = () => {
    switch (viewState) {
      case 'loading':
        return (
          <TableSkeleton
            columns={[
              { width: 'w-28' },
              { width: 'w-16' },
              { width: 'w-24' },
              { width: 'w-16' },
              { width: 'w-16' },
              { width: 'w-24' },
              { width: 'w-24' },
              { width: 'w-20' },
            ]}
          />
        );
      case 'error':
        return (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-12 text-destructive">
              数据加载失败
            </TableCell>
          </TableRow>
        );
      case 'empty':
        return (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
              暂无兑换码
            </TableCell>
          </TableRow>
        );
      case 'ready':
        return items.map((item) => (
          <TableRow key={item.id} className={item.isActive ? '' : 'opacity-50'}>
            <TableCell>
              <div className="flex items-center gap-1">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
                  {item.code}
                </code>
                <CopyButton text={item.code} />
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{CODE_TYPE_LABEL[item.type] ?? item.type}</Badge>
            </TableCell>
            <TableCell className="text-sm">{codeDetailText(item)}</TableCell>
            <TableCell className="text-sm">
              {item.currentRedemptions}/{item.maxRedemptions}
            </TableCell>
            <TableCell>
              <Badge variant={item.isActive ? 'default' : 'secondary'}>
                {item.isActive ? '活跃' : '已停用'}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {item.expiresAt ? formatDate(item.expiresAt) : '-'}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(item.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => setDetailId(item.id)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditTarget(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认停用</AlertDialogTitle>
                      <AlertDialogDescription>
                        确定要停用兑换码 <code className="font-mono">{item.code}</code>{' '}
                        吗？此操作不可撤销。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(item.id)}>
                        停用
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="兑换码管理" description="创建和管理积分、会员兑换码" />

      <div className="flex items-center gap-2">
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v);
            resetPage();
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CODE_TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={activeFilter}
          onValueChange={(v) => {
            setActiveFilter(v);
            resetPage();
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVE_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="搜索兑换码..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="w-48"
        />
        <Button variant="outline" size="icon" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>

        <div className="flex-1" />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          创建
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>兑换码</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>详情</TableHead>
              <TableHead>使用情况</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>过期时间</TableHead>
              <TableHead>创建时间</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{renderRows()}</TableBody>
        </Table>
      </div>

      {viewState === 'ready' && totalPages > 1 && (
        <SimplePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <CreateCodeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isPending={createMutation.isPending}
        onSubmit={handleCreate}
      />

      <EditCodeDialog
        open={editTarget !== null}
        code={editTarget}
        isPending={updateMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSubmit={handleUpdate}
      />

      <CodeDetailDialog
        code={detailData ?? null}
        open={!!detailId}
        onOpenChange={(open) => {
          if (!open) setDetailId('');
        }}
      />
    </div>
  );
}
