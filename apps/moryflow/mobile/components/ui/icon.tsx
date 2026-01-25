/**
 * [PROPS]: as, className, size, color, strokeWidth
 * [EMITS]: none
 * [POS]: Hugeicons 统一封装，提供 className 支持
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { cn } from '@/lib/utils';
import type { HugeiconsProps } from '@hugeicons/react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import type { AppIcon } from '@/components/ui/icons';
import { withUniwind } from 'uniwind';

type IconProps = Omit<HugeiconsProps, 'icon'> & {
  as: AppIcon;
};

function IconImpl({ as: IconComponent, ...props }: IconProps) {
  return <HugeiconsIcon icon={IconComponent} {...props} />;
}

// uniwind: withUniwind() 自动为组件添加 className 支持
const StyledIconImpl = withUniwind(IconImpl);

/**
 * 支持 className 的 Hugeicons 图标包装组件
 *
 * @component
 * @example
 * ```tsx
 * import { ArrowRight } from '@/components/ui/icons';
 * import { Icon } from '@/components/ui/icon';
 *
 * <Icon as={ArrowRight} className="text-red-500" size={16} />
 * ```
 *
 * @param {AppIcon} as - 要渲染的 Hugeicons 图标
 * @param {string} className - Tailwind 样式类
 * @param {number} size - 图标尺寸（默认 14）
 */
function Icon({ as: IconComponent, className, size = 14, ...props }: IconProps) {
  return (
    <StyledIconImpl
      as={IconComponent}
      className={cn('text-foreground', className)}
      size={size}
      {...props}
    />
  );
}

export { Icon };
