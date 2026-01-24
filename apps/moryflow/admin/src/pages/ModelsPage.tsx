/**
 * 模型管理页面
 */
import { useState } from 'react';
import { PageHeader, TierBadge } from '@/components/shared';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useModels,
  useDeleteModel,
  useUpdateModel,
  parseCapabilities,
  ModelFormDialog,
} from '@/features/models';
import { useProviders } from '@/features/providers';
import type { AiModel } from '@/types/api';
import {
  Add01Icon,
  CodeIcon,
  Delete01Icon,
  PencilEdit01Icon,
  Robot01Icon,
  ViewIcon,
  Wrench01Icon,
} from '@hugeicons/core-free-icons';
import { Icon } from '@/components/ui/icon';

export default function ModelsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<AiModel | undefined>();
  const [deleteModel, setDeleteModel] = useState<AiModel | null>(null);
  const [filterProviderId, setFilterProviderId] = useState<string>('all');

  const { data: providersData } = useProviders();
  const { data, isLoading } = useModels(filterProviderId);
  const deleteMutation = useDeleteModel();
  const updateMutation = useUpdateModel();

  const providers = providersData?.providers || [];
  const providerMap = new Map(providers.map((p) => [p.id, p.name]));

  const handleAdd = () => {
    setEditingModel(undefined);
    setIsDialogOpen(true);
  };

  const handleEdit = (model: AiModel) => {
    setEditingModel(model);
    setIsDialogOpen(true);
  };

  const handleToggleEnabled = (model: AiModel) => {
    updateMutation.mutate({
      id: model.id,
      data: { enabled: !model.enabled },
    });
  };

  const handleConfirmDelete = () => {
    if (deleteModel) {
      deleteMutation.mutate(deleteModel.id, {
        onSuccess: () => setDeleteModel(null),
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Model 管理"
        description="管理 AI 模型配置（定价、权限、能力等）"
        action={
          <Button onClick={handleAdd} disabled={providers.length === 0}>
            <Icon icon={Add01Icon} className="h-4 w-4 mr-2" />
            添加 Model
          </Button>
        }
      />

      {/* 筛选器 */}
      <div className="flex gap-2">
        <Select value={filterProviderId} onValueChange={setFilterProviderId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="选择 Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部 Provider</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 模型列表 */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Model ID</TableHead>
              <TableHead>显示名称</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>最低等级</TableHead>
              <TableHead>价格（$/1M）</TableHead>
              <TableHead>能力</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-10" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-20 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : data && data.models.length > 0 ? (
              data.models.map((model) => {
                const caps = parseCapabilities(model.capabilitiesJson);
                return (
                  <TableRow key={model.id}>
                    <TableCell className="font-mono text-xs">{model.modelId}</TableCell>
                    <TableCell className="font-medium">{model.displayName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {providerMap.get(model.providerId) || model.providerId}
                    </TableCell>
                    <TableCell>
                      <TierBadge tier={model.minTier} short />
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="text-green-600">↓${model.inputTokenPrice}</span>
                      {' / '}
                      <span className="text-orange-600">↑${model.outputTokenPrice}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {caps.vision && (
                          <Badge variant="secondary" className="px-1.5">
                            <Icon icon={ViewIcon} className="h-3 w-3" />
                          </Badge>
                        )}
                        {caps.tools && (
                          <Badge variant="secondary" className="px-1.5">
                            <Icon icon={Wrench01Icon} className="h-3 w-3" />
                          </Badge>
                        )}
                        {caps.json && (
                          <Badge variant="secondary" className="px-1.5">
                            <Icon icon={CodeIcon} className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={model.enabled}
                        onCheckedChange={() => handleToggleEnabled(model)}
                        disabled={updateMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(model)}>
                          <Icon icon={PencilEdit01Icon} className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteModel(model)}
                        >
                          <Icon icon={Delete01Icon} className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Icon
                    icon={Robot01Icon}
                    className="h-12 w-12 mx-auto text-muted-foreground mb-4"
                  />
                  <p className="text-muted-foreground">
                    暂无 Model 配置
                    {providers.length === 0 && '，请先添加 Provider'}
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 表单对话框 */}
      <ModelFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        model={editingModel}
        providers={providers}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteModel} onOpenChange={(open) => !open && setDeleteModel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除 Model「{deleteModel?.displayName}」吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
