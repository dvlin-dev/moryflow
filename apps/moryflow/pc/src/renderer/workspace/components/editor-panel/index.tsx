import { Suspense, lazy, memo, useState, useEffect, useRef, useCallback } from 'react';
import { Share, PanelRight } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@anyhunt/ui/components/alert';
import { Button } from '@anyhunt/ui/components/button';
import { ScrollArea } from '@anyhunt/ui/components/scroll-area';
import { Skeleton } from '@anyhunt/ui/components/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@anyhunt/ui/components/tooltip';
import { SharePopover } from '@/components/share';
import { useTranslation } from '@/lib/i18n';
import {
  useWorkspaceDoc,
  useWorkspaceNav,
  useWorkspaceShell,
  useWorkspaceTree,
} from '../../context';

const LazyNotionEditor = lazy(() =>
  import('@/components/editor').then((mod) => ({
    default: mod.NotionEditor,
  }))
);

/** 从文件名中提取标题（去除 .md 扩展名） */
const extractTitle = (name: string): string => name.replace(/\.md$/, '');

/** 防抖延迟（毫秒） */
const RENAME_DEBOUNCE_MS = 300;

export const EditorPanel = memo(function EditorPanel() {
  const { t } = useTranslation('workspace');
  const { go } = useWorkspaceNav();
  const { tree } = useWorkspaceTree();
  const { chatCollapsed, toggleChatPanel } = useWorkspaceShell();
  const { activeDoc, selectedFile, docState, docError, editorChange, retryLoad, renameByTitle } =
    useWorkspaceDoc();

  const hasFiles = tree.length > 0;
  const onNavigateToSites = useCallback(() => {
    go('sites');
  }, [go]);

  // 标题编辑状态
  const [editingTitle, setEditingTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const renameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 记录当前正在编辑的文件路径，用于检测文件切换
  const currentPathRef = useRef<string | null>(null);

  // 同步标题状态（文件切换或外部更新时）
  useEffect(() => {
    if (activeDoc) {
      // 文件切换时，取消之前的防抖定时器
      if (currentPathRef.current !== activeDoc.path) {
        if (renameTimeoutRef.current) {
          clearTimeout(renameTimeoutRef.current);
          renameTimeoutRef.current = null;
        }
        currentPathRef.current = activeDoc.path;
      }
      setEditingTitle(extractTitle(activeDoc.name));
    }
  }, [activeDoc?.path, activeDoc?.name]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (renameTimeoutRef.current) {
        clearTimeout(renameTimeoutRef.current);
      }
    };
  }, []);

  // 执行重命名
  const doRename = useCallback(
    async (newTitle: string) => {
      if (!activeDoc || isRenaming) return;

      const trimmedTitle = newTitle.trim();
      const currentTitle = extractTitle(activeDoc.name);

      // 标题未变化或为空，不执行重命名
      if (!trimmedTitle || trimmedTitle === currentTitle) {
        return;
      }

      setIsRenaming(true);
      try {
        await renameByTitle(activeDoc.path, trimmedTitle);
        toast.success(t('renameSuccess'));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('renameFailed'));
        // 恢复原标题
        setEditingTitle(currentTitle);
      } finally {
        setIsRenaming(false);
      }
    },
    [activeDoc, isRenaming, renameByTitle, t]
  );

  // 标题变化处理（带防抖）
  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setEditingTitle(newTitle);

      // 清除之前的定时器
      if (renameTimeoutRef.current) {
        clearTimeout(renameTimeoutRef.current);
      }

      // 设置新的防抖定时器
      renameTimeoutRef.current = setTimeout(() => {
        doRename(newTitle);
      }, RENAME_DEBOUNCE_MS);
    },
    [doRename]
  );

  // 回车确认重命名（立即执行，不等防抖）
  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        // 取消防抖定时器
        if (renameTimeoutRef.current) {
          clearTimeout(renameTimeoutRef.current);
          renameTimeoutRef.current = null;
        }
        doRename(editingTitle);
        // 失焦
        e.currentTarget.blur();
      }
    },
    [doRename, editingTitle]
  );

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
      {/* 工具栏 - 始终显示 Share 按钮，Chat 收起时显示展开按钮 */}
      {selectedFile && docState === 'idle' && (
        <div className="flex h-10 shrink-0 items-center justify-end gap-1 px-3">
          {/* Share 按钮 */}
          <SharePopover
            filePath={selectedFile.path}
            fileTitle={editingTitle}
            onNavigateToSites={onNavigateToSites}
          >
            <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2.5 text-xs font-medium">
              <Share className="size-3.5" />
              Share
            </Button>
          </SharePopover>

          {/* Chat 展开按钮 */}
          {chatCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={toggleChatPanel}
                >
                  <PanelRight className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">{t('expand')}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        {!selectedFile && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-base text-foreground">{t('readyToRecord')}</p>
            {!hasFiles && <p className="text-sm text-muted-foreground">{t('createFirstNote')}</p>}
          </div>
        )}
        {selectedFile && docState === 'loading' && (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">{t('loadingNote')}</p>
          </div>
        )}
        {selectedFile && docState === 'error' && (
          <div className="p-6">
            <Alert variant="destructive">
              <AlertDescription className="flex items-center justify-between gap-3">
                <span>{docError}</span>
                <Button variant="link" className="px-0 text-destructive" onClick={retryLoad}>
                  {t('retry')}
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}
        {activeDoc && docState === 'idle' && (
          <ScrollArea className="h-full">
            <div className="h-full">
              {/* 标题输入框 - 和正文 h1 样式对齐 */}
              <div className="px-4 pt-4">
                <input
                  type="text"
                  value={editingTitle}
                  onChange={handleTitleChange}
                  onKeyDown={handleTitleKeyDown}
                  disabled={isRenaming}
                  placeholder={t('untitled')}
                  className="w-full bg-transparent text-[1.5em] font-bold outline-hidden placeholder:text-muted-foreground/50"
                />
              </div>
              <Suspense
                fallback={
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-5 w-28" />
                    <Skeleton className="h-[320px] w-full" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                }
              >
                <LazyNotionEditor
                  key={activeDoc.path}
                  value={activeDoc.content}
                  onChange={editorChange}
                  placeholder={t('startThinking')}
                />
              </Suspense>
            </div>
          </ScrollArea>
        )}
      </div>
    </section>
  );
});

EditorPanel.displayName = 'EditorPanel';
