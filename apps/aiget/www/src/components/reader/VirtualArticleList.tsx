/**
 * [PROPS]: items, selectedId, onSelect, estimateSize
 * [POS]: 虚拟化文章列表，优化长列表性能
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@aiget/ui';
import { ArticleCard } from './ArticleCard';
import type { InboxItem } from '@/features/digest/types';

interface VirtualArticleListProps {
  /** 文章列表 */
  items: InboxItem[];
  /** 当前选中的文章 ID */
  selectedId: string | null;
  /** 选择文章的回调 */
  onSelect: (item: InboxItem) => void;
  /** 估计每项高度（默认 100px） */
  estimateSize?: number;
  /** 容器类名 */
  className?: string;
}

/**
 * 虚拟化文章列表
 *
 * 使用 @tanstack/react-virtual 实现虚拟滚动
 * 仅渲染可视区域内的文章卡片，优化长列表性能
 */
export function VirtualArticleList({
  items,
  selectedId,
  onSelect,
  estimateSize = 100,
  className,
}: VirtualArticleListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5, // 预渲染可视区域外的 5 个项目
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className={cn('h-full overflow-auto', className)}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="popLayout">
          {virtualItems.map((virtualItem) => {
            const item = items[virtualItem.index];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="px-2 py-0.5"
              >
                <ArticleCard
                  item={item}
                  isSelected={selectedId === item.id}
                  onClick={() => onSelect(item)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
