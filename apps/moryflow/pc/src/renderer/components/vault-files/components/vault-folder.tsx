/**
 * [PROPS]: { node } - 文件夹节点数据
 * [EMITS]: 通过 vault-files store 触发选择、重命名、删除、移动等操作
 * [POS]: 文件树中的文件夹节点组件，支持拖拽和右键菜单（Lucide 图标）
 */

import { useEffect, useMemo, useRef, type DragEvent } from 'react';
import { Folder, FolderOpen } from 'lucide-react';
import { ContextMenu, ContextMenuTrigger } from '@moryflow/ui/components/context-menu';
import {
  FolderItem as FolderItemPrimitive,
  FolderHeader as FolderHeaderPrimitive,
  FolderTrigger as FolderTriggerPrimitive,
  FolderIcon as FolderIconPrimitive,
  FolderPanel as FolderPanelPrimitive,
} from '@moryflow/ui/animate/primitives/base/files';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { VaultTreeNode } from '@shared/ipc';
import type { ContextMenuAction } from '../const';
import { useVaultFilesStore } from '../vault-files-store';
import {
  createDragData,
  FOLDER_MENU_ITEMS,
  isValidDrag,
  parseDragData,
  sortNodes,
  validateDrop,
} from '../handle';
import { NodeContextMenu } from './node-context-menu';
import { VaultFile } from './vault-file';

type VaultFolderProps = {
  node: VaultTreeNode;
};

const getFolderRowStateClass = (input: { isDropTarget: boolean; isSelected: boolean }): string => {
  if (input.isDropTarget) {
    return 'bg-accent ring-1 ring-inset ring-primary/30';
  }
  if (input.isSelected) {
    return 'bg-accent/60 text-foreground';
  }
  return 'text-foreground';
};

export const VaultFolder = ({ node }: VaultFolderProps) => {
  const { t } = useTranslation('workspace');
  const selectedId = useVaultFilesStore((state) => state.selectedId);
  const onSelectNode = useVaultFilesStore((state) => state.onSelectNode);
  const onRename = useVaultFilesStore((state) => state.onRename);
  const onDelete = useVaultFilesStore((state) => state.onDelete);
  const onCreateFile = useVaultFilesStore((state) => state.onCreateFile);
  const onShowInFinder = useVaultFilesStore((state) => state.onShowInFinder);
  const onPublish = useVaultFilesStore((state) => state.onPublish);
  const onMove = useVaultFilesStore((state) => state.onMove);
  const draggedNodeId = useVaultFilesStore((state) => state.draggedNodeId);
  const setDraggedNodeId = useVaultFilesStore((state) => state.setDraggedNodeId);
  const dropTargetId = useVaultFilesStore((state) => state.dropTargetId);
  const setDropTargetId = useVaultFilesStore((state) => state.setDropTargetId);

  const expandPath = useVaultFilesStore((state) => state.expandPath);
  const dragExpandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (dragExpandTimerRef.current !== null) {
        clearTimeout(dragExpandTimerRef.current);
      }
    };
  }, []);

  const isSelected = selectedId === node.id;
  const isDragging = draggedNodeId === node.id;
  const isDropTarget = dropTargetId === node.id;
  const hasChildren = node.hasChildren ?? Boolean(node.children?.length);

  const clearDragExpandTimer = () => {
    if (dragExpandTimerRef.current !== null) {
      clearTimeout(dragExpandTimerRef.current);
      dragExpandTimerRef.current = null;
    }
  };

  // memo 避免每次渲染都重新排序
  const sortedChildren = useMemo(
    () => (node.children ? sortNodes(node.children) : []),
    [node.children]
  );

  const handleClick = () => {
    onSelectNode?.(node);
  };

  const handleMenuAction = (action: ContextMenuAction) => {
    const actions: Partial<Record<ContextMenuAction, () => void>> = {
      rename: () => onRename?.(node),
      delete: () => onDelete?.(node),
      createFile: () => onCreateFile?.(node),
      showInFinder: () => onShowInFinder?.(node),
      publish: () => onPublish?.(node),
    };
    actions[action]?.();
  };

  const handleDragStart = (e: DragEvent) => {
    e.stopPropagation();
    const dragData = createDragData(node);
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNodeId(node.id);
  };

  const handleDragEnd = () => {
    clearDragExpandTimer();
    setDraggedNodeId(null);
    setDropTargetId(null);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isValidDrag(e.dataTransfer)) return;
    e.dataTransfer.dropEffect = 'move';
    if (dropTargetId !== node.id) {
      setDropTargetId(node.id);
    }
    // 悬停 700ms 后自动展开折叠的目录
    if (dragExpandTimerRef.current === null) {
      dragExpandTimerRef.current = setTimeout(() => {
        dragExpandTimerRef.current = null;
        expandPath(node.path);
      }, 700);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    // 只在真正离开当前节点时清理（排除子元素冒泡）
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    clearDragExpandTimer();
    if (dropTargetId === node.id) {
      setDropTargetId(null);
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearDragExpandTimer();
    const dragData = parseDragData(e.dataTransfer);
    if (!dragData) return;

    const validation = validateDrop(dragData, node);
    if (!validation.canDrop) {
      const errorKey = (validation.reasonKey ?? 'cannotMoveHere') as Parameters<typeof t>[0];
      window.alert(t(errorKey));
      setDraggedNodeId(null);
      setDropTargetId(null);
      return;
    }

    try {
      await onMove?.(dragData.nodePath, node.path);
      // 移动完成后展开目标目录，让用户看到文件落在哪里
      expandPath(node.path);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('moveFailed'));
    } finally {
      setDraggedNodeId(null);
      setDropTargetId(null);
    }
  };

  return (
    <FolderItemPrimitive value={node.path} className="w-full min-w-0">
      <FolderHeaderPrimitive className="w-full min-w-0">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              draggable
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn('w-full min-w-0 select-none', isDragging && 'opacity-50')}
            >
              <FolderTriggerPrimitive
                className={cn(
                  'group flex w-full min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm outline-hidden',
                  'transition-colors hover:bg-muted/40',
                  getFolderRowStateClass({ isDropTarget, isSelected })
                )}
                onClick={handleClick}
              >
                <FolderIconPrimitive
                  className="shrink-0"
                  closeIcon={<Folder className="size-4 text-muted-foreground" />}
                  openIcon={<FolderOpen className="size-4 text-muted-foreground" />}
                />
                <span className="min-w-0 flex-1 truncate font-medium">{node.name}</span>
              </FolderTriggerPrimitive>
            </div>
          </ContextMenuTrigger>
          <NodeContextMenu items={FOLDER_MENU_ITEMS} onAction={handleMenuAction} />
        </ContextMenu>
      </FolderHeaderPrimitive>

      {hasChildren && (
        <FolderPanelPrimitive className="w-full min-w-0 overflow-hidden">
          <div className="relative ml-4 min-w-0 overflow-hidden pl-2 before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-border">
            {sortedChildren.map((child) =>
              child.type === 'folder' ? (
                <VaultFolder key={child.id} node={child} />
              ) : (
                <VaultFile key={child.id} node={child} />
              )
            )}
          </div>
        </FolderPanelPrimitive>
      )}
    </FolderItemPrimitive>
  );
};
