import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@anyhunt/ui/components/dialog';
import { Input } from '@anyhunt/ui/components/input';
import { Button } from '@anyhunt/ui/components/button';
import { Badge } from '@anyhunt/ui/components/badge';
import { Progress } from '@anyhunt/ui/components/progress';
import { ScrollArea } from '@anyhunt/ui/components/scroll-area';
import { Download, SquareArrowUpRight, Loader, RefreshCw, Search } from 'lucide-react';
import type { OllamaPullProgressEvent, OllamaLibraryModel } from '@shared/ipc';

type ModelLibraryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseUrl?: string;
  onModelPulled?: () => void;
};

/**
 * 模型库搜索对话框
 * 从 API 实时获取模型列表
 */
export const ModelLibraryDialog = ({
  open,
  onOpenChange,
  baseUrl,
  onModelPulled,
}: ModelLibraryDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [pullingModel, setPullingModel] = useState<string | null>(null);
  const [pullProgress, setPullProgress] = useState<OllamaPullProgressEvent | null>(null);
  const [libraryModels, setLibraryModels] = useState<OllamaLibraryModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /** 获取模型库列表 */
  const fetchLibraryModels = useCallback(async (search?: string) => {
    setIsLoading(true);
    try {
      const models = await window.desktopAPI?.ollama.getLibraryModels({
        search,
        sortBy: 'pulls',
        order: 'desc',
        limit: 20,
      });
      setLibraryModels(models ?? []);
    } catch (error) {
      console.error('Failed to fetch library models:', error);
      setLibraryModels([]);
    }
    setIsLoading(false);
  }, []);

  // 对话框打开时获取模型列表
  useEffect(() => {
    if (open) {
      fetchLibraryModels();
    }
  }, [open, fetchLibraryModels]);

  // 搜索防抖
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      fetchLibraryModels(searchQuery.trim() || undefined);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, open, fetchLibraryModels]);

  // 监听下载进度
  useEffect(() => {
    if (!open) return;

    const unsubscribe = window.desktopAPI?.ollama.onPullProgress((event) => {
      if (event.modelName === pullingModel) {
        setPullProgress(event);
        // 下载完成
        if (event.status === 'success') {
          setTimeout(() => {
            setPullingModel(null);
            setPullProgress(null);
            onModelPulled?.();
          }, 1000);
        }
      }
    });

    return () => unsubscribe?.();
  }, [open, pullingModel, onModelPulled]);

  /** 下载模型 */
  const handlePullModel = useCallback(
    async (modelName: string) => {
      setPullingModel(modelName);
      setPullProgress({ modelName, status: 'starting' });

      try {
        const result = await window.desktopAPI?.ollama.pullModel(modelName, baseUrl);
        if (!result?.success) {
          setPullProgress({ modelName, status: `Error: ${result?.error || 'Unknown error'}` });
          setTimeout(() => {
            setPullingModel(null);
            setPullProgress(null);
          }, 3000);
        }
      } catch (error) {
        setPullProgress({
          modelName,
          status: `Error: ${error instanceof Error ? error.message : String(error)}`,
        });
        setTimeout(() => {
          setPullingModel(null);
          setPullProgress(null);
        }, 3000);
      }
    },
    [baseUrl]
  );

  /** 手动下载 */
  const handleManualPull = useCallback(() => {
    if (!manualInput.trim()) return;
    handlePullModel(manualInput.trim());
    setManualInput('');
  }, [manualInput, handlePullModel]);

  /** 计算下载进度百分比 */
  const progressPercent = useMemo(() => {
    if (!pullProgress?.total || !pullProgress.completed) return 0;
    return Math.round((pullProgress.completed / pullProgress.total) * 100);
  }, [pullProgress]);

  /** 格式化下载次数 */
  const formatPulls = (pulls: number): string => {
    if (pulls >= 1_000_000) return `${(pulls / 1_000_000).toFixed(1)}M`;
    if (pulls >= 1_000) return `${(pulls / 1_000).toFixed(1)}K`;
    return String(pulls);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Model Library
            <a
              href="https://ollama.com/library"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-normal text-primary hover:underline flex items-center gap-1"
            >
              Browse all <SquareArrowUpRight className="h-3 w-3" />
            </a>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 搜索 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fetchLibraryModels(searchQuery.trim() || undefined)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* 下载进度 */}
          {pullingModel && pullProgress && (
            <div className="p-3 rounded-md border bg-muted/30 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{pullingModel}</span>
                <span className="text-muted-foreground">{pullProgress.status}</span>
              </div>
              {pullProgress.total && pullProgress.completed && (
                <Progress value={progressPercent} className="h-2" />
              )}
            </div>
          )}

          {/* 模型列表 */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-2 pr-4">
              {isLoading && libraryModels.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {libraryModels.map((model) => (
                    <div key={model.model_identifier} className="p-3 rounded-md border space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{model.name}</span>
                            <span className="text-xs text-muted-foreground">
                              Downloads: {formatPulls(model.pulls)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {model.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {model.sizes.map((size) => {
                          const fullName = `${model.name}:${size}`;
                          const isPulling = pullingModel === fullName;

                          return (
                            <Badge
                              key={size}
                              variant="outline"
                              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                              onClick={() => !pullingModel && handlePullModel(fullName)}
                            >
                              {isPulling ? (
                                <Loader className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Download className="h-3 w-3 mr-1" />
                              )}
                              {size}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  {libraryModels.length === 0 && !isLoading && (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      No matching models found
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>

          {/* 手动输入 */}
          <div className="pt-4 border-t space-y-2">
            <div className="text-sm text-muted-foreground">Or enter a model name:</div>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., qwen2.5:7b"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualPull()}
              />
              <Button
                type="button"
                onClick={handleManualPull}
                disabled={!manualInput.trim() || !!pullingModel}
              >
                {pullingModel ? <Loader className="h-4 w-4 animate-spin" /> : 'Download'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
