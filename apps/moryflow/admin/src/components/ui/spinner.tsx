/**
 * [PROPS]: SpinnerProps - 统一加载指示器配置
 * [EMITS]: none
 * [POS]: 管理后台通用 loading 图标
 */

import { Loading01Icon } from '@hugeicons/core-free-icons';

import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/icon';

type SpinnerProps = Omit<React.ComponentProps<typeof Icon>, 'icon'>;

function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <Icon
      icon={Loading01Icon}
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
