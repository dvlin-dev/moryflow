/**
 * [PROPS]: SpinnerProps - 统一加载指示器配置
 * [EMITS]: none
 * [POS]: 管理后台通用 loading 图标（Lucide icons direct render）
 */

import { Loader, type LucideProps } from 'lucide-react';

import { cn } from '@/lib/utils';

type SpinnerProps = LucideProps;

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <Loader
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
