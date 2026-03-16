/**
 * [PROPS]: none
 * [EMITS]: none
 * [POS]: Redemption Codes page - admin management
 */
import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { PageHeader, SimplePagination } from '@moryflow/ui';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@moryflow/ui';
import { ListEmptyState, ListLoadingRows } from '@/components/list-state';
import {
  useRedemptionCodes,
  useRedemptionCode,
  useCreateRedemptionCode,
  useUpdateRedemptionCode,
  useDeleteRedemptionCode,
  CODE_TYPE_OPTIONS,
  ACTIVE_STATUS_OPTIONS,
  RedemptionCodeTable,
  CreateRedemptionCodeDialog,
  EditRedemptionCodeDialog,
  RedemptionCodeDetailSheet,
} from '@/features/redemption-codes';
import type {
  RedemptionCode,
  RedemptionCodeQuery,
  CreateRedemptionCodeRequest,
  CreateRedemptionCodeFormValues,
  UpdateRedemptionCodeFormValues,
} from '@/features/redemption-codes';
import { usePagedSearchQuery } from '@/lib/usePagedSearchQuery';

export default function RedemptionCodesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<RedemptionCode | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const {
    query,
    searchInput,
    setSearchInput,
    handleSearch,
    handleSearchKeyDown,
    handlePageChange,
    setQueryFilter,
  } = usePagedSearchQuery<RedemptionCodeQuery>({
    initialQuery: { page: 1, limit: 20 },
  });

  const { data, isLoading } = useRedemptionCodes(query);
  const { data: detailData } = useRedemptionCode(detailId ?? '');
  const { mutate: createCode, isPending: isCreating } = useCreateRedemptionCode();
  const { mutate: updateCode, isPending: isUpdating } = useUpdateRedemptionCode();
  const { mutate: deleteCode } = useDeleteRedemptionCode();

  const handleFilterType = (type: string) => {
    setQueryFilter('type', type === 'all' ? undefined : (type as 'CREDITS' | 'MEMBERSHIP'));
  };

  const handleFilterActive = (isActive: string) => {
    setQueryFilter('isActive', isActive === 'all' ? undefined : isActive);
  };

  const handleView = (item: RedemptionCode) => {
    setDetailId(item.id);
  };

  const handleEdit = (item: RedemptionCode) => {
    setEditTarget(item);
  };

  const handleDelete = (id: string) => {
    deleteCode(id);
  };

  const handleCreate = (values: CreateRedemptionCodeFormValues) => {
    const payload: CreateRedemptionCodeRequest = {
      type: values.type,
      ...(values.creditsAmount != null && { creditsAmount: values.creditsAmount }),
      ...(values.membershipTier && { membershipTier: values.membershipTier }),
      ...(values.membershipDays != null && { membershipDays: values.membershipDays }),
      ...(values.maxRedemptions != null && { maxRedemptions: values.maxRedemptions }),
      ...(values.code && { code: values.code }),
      ...(values.expiresAt && { expiresAt: values.expiresAt }),
      ...(values.note && { note: values.note }),
    };

    createCode(payload, {
      onSuccess: () => setCreateOpen(false),
    });
  };

  const handleUpdate = (values: UpdateRedemptionCodeFormValues) => {
    if (!editTarget) return;
    const data = {
      ...values,
      expiresAt: values.expiresAt || null,
      note: values.note || undefined,
    };
    updateCode({ id: editTarget.id, data }, { onSuccess: () => setEditTarget(null) });
  };

  const renderContent = () => {
    if (isLoading) {
      return <ListLoadingRows />;
    }

    if (!data || data.items.length === 0) {
      return <ListEmptyState message="No redemption codes found" />;
    }

    return (
      <>
        <RedemptionCodeTable
          items={data.items}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        {data.pagination.totalPages > 1 && (
          <div className="mt-4 flex justify-center">
            <SimplePagination
              page={data.pagination.page}
              totalPages={data.pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Redemption Codes"
        description="Manage redemption codes for credits and memberships"
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Codes</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={query.type || 'all'} onValueChange={handleFilterType}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {CODE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={query.isActive || 'all'} onValueChange={handleFilterActive}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVE_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search codes..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-48"
              />
              <Button variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>{renderContent()}</CardContent>
      </Card>

      <CreateRedemptionCodeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isPending={isCreating}
        onSubmit={handleCreate}
      />

      <EditRedemptionCodeDialog
        open={editTarget !== null}
        code={editTarget}
        isPending={isUpdating}
        onOpenChange={(open) => {
          if (!open) setEditTarget(null);
        }}
        onSubmit={handleUpdate}
      />

      <RedemptionCodeDetailSheet
        open={detailId !== null}
        code={detailData ?? null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      />
    </div>
  );
}
