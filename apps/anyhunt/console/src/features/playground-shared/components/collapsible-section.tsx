/**
 * 可折叠区域组件
 */
import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { Collapsible, CollapsibleContent, CollapsibleTrigger, Icon } from '@anyhunt/ui';

interface CollapsibleSectionProps {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function CollapsibleSection({
  title,
  open,
  onOpenChange,
  children,
}: CollapsibleSectionProps) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/50 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
        <span>{title}</span>
        <Icon
          icon={ArrowRight01Icon}
          className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
