/**
 * [PROVIDES]: 键盘快捷键 hook
 * [POS]: Reader 布局的键盘导航支持
 */

import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  /** 文章列表 */
  items: { id: string }[];
  /** 当前选中的文章 ID */
  selectedId: string | null;
  /** 选择文章的回调 */
  onSelect: (id: string) => void;
  /** 保存文章的回调 */
  onSave?: () => void;
  /** 标记不感兴趣的回调 */
  onNotInterested?: () => void;
  /** 打开原文的回调 */
  onOpenOriginal?: () => void;
  /** 刷新列表的回调 */
  onRefresh?: () => void;
  /** 标记全部已读的回调 */
  onMarkAllRead?: () => void;
  /** 是否启用快捷键 */
  enabled?: boolean;
}

/**
 * 键盘快捷键 hook
 *
 * 快捷键列表：
 * - j / ArrowDown: 下一篇文章
 * - k / ArrowUp: 上一篇文章
 * - s: 保存/取消保存
 * - x: 标记不感兴趣
 * - o / Enter: 打开原文
 * - r: 刷新列表
 * - Shift+A: 标记全部已读
 * - Escape: 取消选择
 */
export function useKeyboardShortcuts({
  items,
  selectedId,
  onSelect,
  onSave,
  onNotInterested,
  onOpenOriginal,
  onRefresh,
  onMarkAllRead,
  enabled = true,
}: KeyboardShortcutsOptions) {
  const selectNext = useCallback(() => {
    if (items.length === 0) return;
    const currentIndex = selectedId ? items.findIndex((item) => item.id === selectedId) : -1;
    const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
    onSelect(items[nextIndex].id);
  }, [items, selectedId, onSelect]);

  const selectPrev = useCallback(() => {
    if (items.length === 0) return;
    const currentIndex = selectedId ? items.findIndex((item) => item.id === selectedId) : -1;
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
    onSelect(items[prevIndex].id);
  }, [items, selectedId, onSelect]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果在输入框中，不处理快捷键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'j':
        case 'arrowdown':
          e.preventDefault();
          selectNext();
          break;

        case 'k':
        case 'arrowup':
          e.preventDefault();
          selectPrev();
          break;

        case 's':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onSave?.();
          }
          break;

        case 'x':
          e.preventDefault();
          onNotInterested?.();
          break;

        case 'o':
        case 'enter':
          if (selectedId) {
            e.preventDefault();
            onOpenOriginal?.();
          }
          break;

        case 'r':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onRefresh?.();
          }
          break;

        case 'a':
          if (e.shiftKey) {
            e.preventDefault();
            onMarkAllRead?.();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    selectedId,
    selectNext,
    selectPrev,
    onSave,
    onNotInterested,
    onOpenOriginal,
    onRefresh,
    onMarkAllRead,
  ]);

  return {
    selectNext,
    selectPrev,
  };
}
