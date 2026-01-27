'use client';

import { Bookmark, type LucideIcon, type LucideProps } from 'lucide-react';
import { Button } from '../components/button';
import { Separator } from '../components/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/tooltip';
import { cn } from '../lib/utils';
import type { ComponentProps, HTMLAttributes } from 'react';

export type CheckpointProps = HTMLAttributes<HTMLDivElement>;

export const Checkpoint = ({ className, children, ...props }: CheckpointProps) => (
  <div
    className={cn('flex items-center gap-0.5 text-muted-foreground overflow-hidden', className)}
    {...props}
  >
    {children}
    <Separator />
  </div>
);

export type CheckpointIconProps = Omit<LucideProps, 'ref'> & {
  icon?: LucideIcon;
};

export const CheckpointIcon = ({ className, children, icon, ...props }: CheckpointIconProps) => {
  const IconComponent = icon ?? Bookmark;
  return children ?? <IconComponent className={cn('size-4 shrink-0', className)} {...props} />;
};

export type CheckpointTriggerProps = ComponentProps<typeof Button> & {
  tooltip?: string;
};

export const CheckpointTrigger = ({
  children,
  className,
  variant = 'ghost',
  size = 'sm',
  tooltip,
  ...props
}: CheckpointTriggerProps) =>
  tooltip ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button size={size} type="button" variant={variant} {...props}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent align="start" side="bottom">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  ) : (
    <Button size={size} type="button" variant={variant} {...props}>
      {children}
    </Button>
  );
