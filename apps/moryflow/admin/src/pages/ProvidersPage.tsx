/**
 * 提供商管理页面
 */
import { useState } from 'react';
import { PageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  useProviders,
  usePresetProviders,
  useDeleteProvider,
  useUpdateProvider,
  resolveProvidersViewState,
} from '@/features/providers';
import { ProviderFormDialog } from '@/features/providers/components';
import type { AiProvider } from '@/types/api';
import { Plus, Server, Delete, Pencil } from 'lucide-react';

export default function ProvidersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AiProvider | undefined>();
  const [deleteProvider, setDeleteProvider] = useState<AiProvider | null>(null);

  const { data: presetsData } = usePresetProviders();
  const { data, isLoading, error, refetch } = useProviders();
  const deleteMutation = useDeleteProvider();
  const updateMutation = useUpdateProvider();

  const presets = presetsData?.providers || [];
  const providers = data?.providers ?? [];
  const viewState = resolveProvidersViewState({
    isLoading,
    error,
    count: providers.length,
  });

  const handleAdd = () => {
    setEditingProvider(undefined);
    setIsDialogOpen(true);
  };

  const handleEdit = (provider: AiProvider) => {
    setEditingProvider(provider);
    setIsDialogOpen(true);
  };

  const handleToggleEnabled = (provider: AiProvider) => {
    updateMutation.mutate({
      id: provider.id,
      data: { enabled: !provider.enabled },
    });
  };

  const handleConfirmDelete = () => {
    if (deleteProvider) {
      deleteMutation.mutate(deleteProvider.id, {
        onSuccess: () => setDeleteProvider(null),
      });
    }
  };

  const getPresetName = (providerType: string) => {
    return presets.find((p) => p.id === providerType)?.name || providerType;
  };

  const renderProvidersContentByState = () => {
    switch (viewState) {
      case 'loading':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        );
      case 'error':
        return (
          <div className="text-center py-12">
            <Server className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive mb-4">Provider 数据加载失败，请稍后重试</p>
            <Button variant="outline" onClick={() => void refetch()}>
              重试
            </Button>
          </div>
        );
      case 'empty':
        return (
          <div className="text-center py-12">
            <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">暂无 Provider 配置，请点击上方按钮添加</p>
            <Button onClick={handleAdd}>
              <Plus className="h-4 w-4 mr-2" />
              添加 Provider
            </Button>
          </div>
        );
      case 'ready':
        return (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <Card key={provider.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">{provider.name}</CardTitle>
                    </div>
                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={() => handleToggleEnabled(provider)}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{getPresetName(provider.providerType)}</Badge>
                    <span className="text-xs text-muted-foreground">排序: {provider.sortOrder}</span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">API Key</p>
                    <p className="font-mono text-xs truncate">{provider.apiKey}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Base URL</p>
                    <p className="text-xs truncate">
                      {provider.baseUrl || <span className="italic text-muted-foreground">默认</span>}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(provider)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteProvider(provider)}
                    >
                      <Delete className="h-4 w-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Provider 管理"
        description="管理 AI 服务提供商配置（API Key、Base URL 等）"
        action={
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            添加 Provider
          </Button>
        }
      />

      {renderProvidersContentByState()}

      {/* 表单对话框 */}
      <ProviderFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        provider={editingProvider}
        presets={presets}
      />

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deleteProvider}
        onOpenChange={(open) => !open && setDeleteProvider(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除 Provider「{deleteProvider?.name}」吗？
              <br />
              <span className="text-destructive">⚠️ 这将同时删除所有关联的模型配置！</span>
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
