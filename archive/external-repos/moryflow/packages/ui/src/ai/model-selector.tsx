import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '../components/command'
import { Popover, PopoverContent, PopoverTrigger } from '../components/popover'
import { cn } from '../lib/utils'
import type { ReactNode, ComponentProps } from 'react'

export type ModelSelectorProps = ComponentProps<typeof Popover>

export const ModelSelector = (props: ModelSelectorProps) => <Popover {...props} />

export type ModelSelectorTriggerProps = ComponentProps<typeof PopoverTrigger>

export const ModelSelectorTrigger = (props: ModelSelectorTriggerProps) => (
  <PopoverTrigger {...props} />
)

export type ModelSelectorContentProps = ComponentProps<typeof PopoverContent> & {
  title?: ReactNode
}

export const ModelSelectorContent = ({
  className,
  children,
  title,
  align = 'center',
  side = 'top',
  sideOffset = 8,
  collisionPadding = 16,
  ...props
}: ModelSelectorContentProps) => (
  <PopoverContent
    className={cn('w-52 p-0', className)}
    align={align}
    side={side}
    sideOffset={sideOffset}
    collisionPadding={collisionPadding}
    {...props}
  >
    {title && <div className="sr-only">{title}</div>}
    <Command className="data-[slot=command-input-wrapper]:**:h-auto">{children}</Command>
  </PopoverContent>
)

export type ModelSelectorInputProps = ComponentProps<typeof CommandInput>

export const ModelSelectorInput = ({ className, ...props }: ModelSelectorInputProps) => (
  <CommandInput className={cn('h-auto py-2.5', className)} {...props} />
)

export type ModelSelectorListProps = ComponentProps<typeof CommandList>

export const ModelSelectorList = ({ className, ...props }: ModelSelectorListProps) => (
  <CommandList className={cn('max-h-60', className)} {...props} />
)

export type ModelSelectorEmptyProps = ComponentProps<typeof CommandEmpty>

export const ModelSelectorEmpty = (props: ModelSelectorEmptyProps) => <CommandEmpty {...props} />

export type ModelSelectorGroupProps = ComponentProps<typeof CommandGroup>

export const ModelSelectorGroup = (props: ModelSelectorGroupProps) => <CommandGroup {...props} />

export type ModelSelectorItemProps = ComponentProps<typeof CommandItem>

export const ModelSelectorItem = ({ className, ...props }: ModelSelectorItemProps) => (
  <CommandItem className={cn('gap-2 text-sm', className)} {...props} />
)

export type ModelSelectorShortcutProps = ComponentProps<typeof CommandShortcut>

export const ModelSelectorShortcut = (props: ModelSelectorShortcutProps) => (
  <CommandShortcut {...props} />
)

export type ModelSelectorSeparatorProps = ComponentProps<typeof CommandSeparator>

export const ModelSelectorSeparator = (props: ModelSelectorSeparatorProps) => (
  <CommandSeparator {...props} />
)

export type ModelSelectorNameProps = ComponentProps<'span'>

export const ModelSelectorName = ({ className, ...props }: ModelSelectorNameProps) => (
  <span className={cn('flex-1 truncate text-left', className)} {...props} />
)

export type ModelSelectorFooterProps = ComponentProps<'div'>

export const ModelSelectorFooter = ({ className, ...props }: ModelSelectorFooterProps) => (
  <div className={cn('border-t border-border-muted p-1', className)} {...props} />
)
