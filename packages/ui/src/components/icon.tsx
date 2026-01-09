import type { HugeiconsIconProps, IconSvgElement } from '@hugeicons/react';
import { HugeiconsIcon } from '@hugeicons/react';

export type HugeIcon = IconSvgElement;

export function Icon({ size = 18, strokeWidth = 1.5, ...props }: HugeiconsIconProps) {
  return <HugeiconsIcon size={size} strokeWidth={strokeWidth} {...props} />;
}
