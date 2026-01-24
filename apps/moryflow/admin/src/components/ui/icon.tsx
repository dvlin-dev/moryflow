/**
 * [PROPS]: HugeiconsIconProps - 图标渲染参数
 * [EMITS]: none
 * [POS]: 管理后台统一图标渲染入口
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { HugeiconsIconProps, IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';

export type HugeIcon = IconSvgElement;

export function Icon({ size = 18, strokeWidth = 1.5, ...props }: HugeiconsIconProps) {
  return <HugeiconsIcon size={size} strokeWidth={strokeWidth} {...props} />;
}
