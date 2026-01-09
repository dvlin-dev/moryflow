'use client';

import {
  Add01Icon,
  ArrowTurnDownIcon,
  Cancel01Icon,
  Loading01Icon,
  StopIcon,
} from '@hugeicons/core-free-icons';
import type { ChatStatus } from 'ai';
import { type ComponentProps, Children } from 'react';

import { InputGroupButton } from '../../components/input-group';
import { Icon } from '../../components/icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/dropdown-menu';
import { cn } from '../../lib/utils';

export type PromptInputButtonProps = ComponentProps<typeof InputGroupButton>;

export const PromptInputButton = ({
  variant = 'ghost',
  className,
  size,
  children,
  ...props
}: PromptInputButtonProps) => {
  const newSize = size ?? (Children.count(children) > 1 ? 'sm' : 'icon-sm');

  return (
    <InputGroupButton
      className={cn(className)}
      size={newSize}
      type="button"
      variant={variant}
      {...props}
    >
      {children}
    </InputGroupButton>
  );
};

export type PromptInputActionMenuProps = ComponentProps<typeof DropdownMenu>;

export const PromptInputActionMenu = (props: PromptInputActionMenuProps) => (
  <DropdownMenu {...props} />
);

export type PromptInputActionMenuTriggerProps = PromptInputButtonProps;

export const PromptInputActionMenuTrigger = ({
  className,
  children,
  ...props
}: PromptInputActionMenuTriggerProps) => (
  <DropdownMenuTrigger asChild>
    <PromptInputButton className={className} {...props}>
      {children ?? <Icon icon={Add01Icon} className="size-4" />}
    </PromptInputButton>
  </DropdownMenuTrigger>
);

export type PromptInputActionMenuContentProps = ComponentProps<typeof DropdownMenuContent>;

export const PromptInputActionMenuContent = ({
  className,
  ...props
}: PromptInputActionMenuContentProps) => (
  <DropdownMenuContent align="start" className={cn(className)} {...props} />
);

export type PromptInputActionMenuItemProps = ComponentProps<typeof DropdownMenuItem>;

export const PromptInputActionMenuItem = ({
  className,
  ...props
}: PromptInputActionMenuItemProps) => <DropdownMenuItem className={cn(className)} {...props} />;

export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
  status?: ChatStatus;
};

export const PromptInputSubmit = ({
  className,
  variant = 'default',
  size = 'icon-sm',
  status,
  children,
  ...props
}: PromptInputSubmitProps) => {
  let iconNode = <Icon icon={ArrowTurnDownIcon} className="size-4" />;

  if (status === 'submitted') {
    iconNode = <Icon icon={Loading01Icon} className="size-4 animate-spin" />;
  } else if (status === 'streaming') {
    iconNode = <Icon icon={StopIcon} className="size-4" />;
  } else if (status === 'error') {
    iconNode = <Icon icon={Cancel01Icon} className="size-4" />;
  }

  return (
    <InputGroupButton
      aria-label="Submit"
      className={cn(className)}
      size={size}
      type="submit"
      variant={variant}
      {...props}
    >
      {children ?? iconNode}
    </InputGroupButton>
  );
};
