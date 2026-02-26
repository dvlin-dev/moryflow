/**
 * [PROPS]: { node } - 文件节点数据
 * [EMITS]: 通过 context 触发选择、重命名、删除等操作
 * [POS]: 文件树中的文件节点组件，支持拖拽和右键菜单（Lucide 图标）
 * [UPDATE]: 2026-02-11 - 行内 padding 调整为 px-2.5，提升激活态背景内边距并与侧栏项基线一致
 * [UPDATE]: 2026-02-11 - 行内水平 padding 收敛为 0，和 Threads 列表共享同一文字起始线
 * [UPDATE]: 2026-02-11 - 行背景轻微外扩（-mx-1 + px-1 抵消），保持文字对齐不变并允许背景略超出
 * [UPDATE]: 2026-02-11 - 文件行内 padding 回调为 px-2.5（保留背景外扩），避免行内容过于贴边
 */

import type { DragEvent } from 'react';
import { File } from 'lucide-react';
import { ContextMenu, ContextMenuTrigger } from '@moryflow/ui/components/context-menu';
import { cn } from '@/lib/utils';
import type { VaultTreeNode } from '@shared/ipc';
import type { ContextMenuAction } from '../const';
import { useVaultFilesStore } from '../vault-files-store';
import { createDragData, FILE_MENU_ITEMS } from '../handle';
import { NodeContextMenu } from './node-context-menu';

type VaultFileProps = {
  node: VaultTreeNode;
};

export const VaultFile = ({ node }: VaultFileProps) => {
  const {
    selectedId,
    onSelectFile,
    onSelectNode,
    onRename,
    onDelete,
    onShowInFinder,
    onPublish,
    draggedNodeId,
    setDraggedNodeId,
  } = useVaultFilesStore((state) => ({
    selectedId: state.selectedId,
    onSelectFile: state.onSelectFile,
    onSelectNode: state.onSelectNode,
    onRename: state.onRename,
    onDelete: state.onDelete,
    onShowInFinder: state.onShowInFinder,
    onPublish: state.onPublish,
    draggedNodeId: state.draggedNodeId,
    setDraggedNodeId: state.setDraggedNodeId,
  }));

  const isSelected = selectedId === node.id;
  const isDragging = draggedNodeId === node.id;

  const handleClick = () => {
    onSelectNode?.(node);
    onSelectFile?.(node);
  };

  const handleMenuAction = (action: ContextMenuAction) => {
    const actions: Partial<Record<ContextMenuAction, () => void>> = {
      rename: () => onRename?.(node),
      delete: () => onDelete?.(node),
      showInFinder: () => onShowInFinder?.(node),
      publish: () => onPublish?.(node),
    };
    actions[action]?.();
  };

  const handleDragStart = (e: DragEvent) => {
    const dragData = createDragData(node);
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    setDraggedNodeId(node.id);
  };

  const handleDragEnd = () => {
    setDraggedNodeId(null);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className={cn(
            'group -mx-1 flex w-full min-w-0 items-center rounded-md text-sm transition-colors hover:bg-muted/40',
            isSelected && 'bg-accent/60 text-foreground',
            isDragging && 'opacity-50'
          )}
        >
          <button
            type="button"
            onClick={handleClick}
            className="flex w-full min-w-0 items-center gap-2 px-2.5 py-1.5 text-left outline-hidden"
          >
            <File className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
          </button>
        </div>
      </ContextMenuTrigger>
      <NodeContextMenu items={FILE_MENU_ITEMS} onAction={handleMenuAction} />
    </ContextMenu>
  );
};
