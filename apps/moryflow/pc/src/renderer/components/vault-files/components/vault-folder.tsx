/**
 * [PROPS]: { node } - 文件夹节点数据
 * [EMITS]: 通过 context 触发选择、重命名、删除、移动等操作
 * [POS]: 文件树中的文件夹节点组件，支持拖拽和右键菜单（Lucide 图标）
 * [UPDATE]: 2026-02-11 - 行内 padding 调整为 px-2.5，提升激活态背景内边距并与侧栏项基线一致
 * [UPDATE]: 2026-02-11 - 行内水平 padding 收敛为 0，和 Threads 列表共享同一文字起始线
 * [UPDATE]: 2026-02-11 - 行背景轻微外扩（-mx-1 + px-1 抵消），保持文字对齐不变并允许背景略超出
 * [UPDATE]: 2026-02-11 - 文件夹行内 padding 回调为 px-2.5（保留背景外扩），与文件/线程列表间距保持一致
 */

import { useMemo, type DragEvent } from 'react';
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
import { useVaultFiles } from '../context';
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

export const VaultFolder = ({ node }: VaultFolderProps) => {
  const { t } = useTranslation('workspace');
  const {
    selectedId,
    onSelectNode,
    onRename,
    onDelete,
    onCreateFile,
    onShowInFinder,
    onPublish,
    onMove,
    draggedNodeId,
    setDraggedNodeId,
    dropTargetId,
    setDropTargetId,
  } = useVaultFiles();

  const isSelected = selectedId === node.id;
  const isDragging = draggedNodeId === node.id;
  const isDropTarget = dropTargetId === node.id;
  const hasChildren = node.hasChildren ?? Boolean(node.children?.length);

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
    setDraggedNodeId(null);
    setDropTargetId(null);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 在 dragOver 中使用 isValidDrag 检查（因为 getData 在 dragOver 中返回空）
    if (!isValidDrag(e.dataTransfer)) return;
    e.dataTransfer.dropEffect = 'move';
    // 持续更新 dropTargetId
    if (dropTargetId !== node.id) {
      setDropTargetId(node.id);
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
              onDrop={handleDrop}
              className={cn('w-full min-w-0 select-none', isDragging && 'opacity-50')}
            >
              <FolderTriggerPrimitive
                className={cn(
                  'group -mx-1 flex w-full min-w-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm outline-hidden',
                  'transition-colors hover:bg-muted/40',
                  isDropTarget
                    ? 'bg-foreground/10 border border-primary/50'
                    : isSelected
                      ? 'bg-accent/60 text-foreground'
                      : 'text-foreground'
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
