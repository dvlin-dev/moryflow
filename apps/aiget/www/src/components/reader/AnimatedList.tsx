/**
 * [PROPS]: children, className
 * [POS]: 带入场动画的列表容器
 */

import { type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@aiget/ui';

interface AnimatedListProps {
  children: ReactNode;
  className?: string;
}

/**
 * 带入场动画的列表容器
 * 子元素会依次淡入并向上滑动
 */
export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.div
      className={cn('space-y-1', className)}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

interface AnimatedListItemProps {
  children: ReactNode;
  className?: string;
  /** 唯一标识，用于 AnimatePresence */
  layoutId?: string;
}

/**
 * 带入场动画的列表项
 */
export function AnimatedListItem({ children, className, layoutId }: AnimatedListItemProps) {
  return (
    <motion.div
      className={className}
      layoutId={layoutId}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/**
 * 简单淡入动画包装器
 */
export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, delay }}
    >
      {children}
    </motion.div>
  );
}

interface SlideInProps {
  children: ReactNode;
  className?: string;
  direction?: 'left' | 'right' | 'up' | 'down';
  delay?: number;
}

/**
 * 滑入动画包装器
 */
export function SlideIn({ children, className, direction = 'up', delay = 0 }: SlideInProps) {
  const directionOffset = {
    left: { x: -20, y: 0 },
    right: { x: 20, y: 0 },
    up: { x: 0, y: 20 },
    down: { x: 0, y: -20 },
  };

  const offset = directionOffset[direction];

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...offset }}
      transition={{ duration: 0.2, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 用于包裹需要进出动画的内容
 */
export { AnimatePresence };
