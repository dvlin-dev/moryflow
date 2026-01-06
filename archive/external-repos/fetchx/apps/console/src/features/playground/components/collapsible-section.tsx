/**
 * 可折叠区块组件
 */
import {
  Card,
  CardContent,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@aiget/ui/primitives'
import { ChevronDown } from 'lucide-react'
import { cn } from '@aiget/ui/lib'

interface CollapsibleSectionProps {
  title: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  open,
  onOpenChange,
  children,
}: CollapsibleSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <Card>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
          >
            <span className="font-medium">{title}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                open && 'rotate-180'
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
