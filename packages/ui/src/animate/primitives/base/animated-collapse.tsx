/**
 * [PROPS]: AnimatedCollapseProps - open/children/className/duration
 * [POS]: 共享折叠/展开高度动画组件，复用 accordion.tsx 的 Motion height 模式
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

type AnimatedCollapseProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
  duration?: number;
};

export const AnimatedCollapse = ({
  open,
  children,
  className,
  duration = 0.3,
}: AnimatedCollapseProps) => {
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : { duration, ease: 'easeInOut' as const };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="animated-collapse"
          className={className}
          initial={{ height: 0, opacity: 0, '--mask-stop': '0%' }}
          animate={{ height: 'auto', opacity: 1, '--mask-stop': '100%' }}
          exit={{ height: 0, opacity: 0, '--mask-stop': '0%' }}
          transition={transition}
          style={{
            maskImage: 'linear-gradient(black var(--mask-stop), transparent var(--mask-stop))',
            WebkitMaskImage:
              'linear-gradient(black var(--mask-stop), transparent var(--mask-stop))',
            overflow: 'hidden',
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
