import { MoreHorizontal, RefreshCw, Search, Wrench, Download } from 'lucide-react';
import { Badge } from '@moryflow/ui/components/badge';
import { Button } from '@moryflow/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@moryflow/ui/components/dropdown-menu';
import type { MemoryOverview } from '@shared/ipc';
import { cn } from '@/lib/utils';
import { MEMORY_PAGE_TITLE } from './const';

type MemoryDashboardHeaderProps = {
  overview: MemoryOverview | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenSearch: () => void;
  onOpenWorkbench: () => void;
  onExport: () => void;
};

export const MemoryDashboardHeader = ({
  overview,
  loading,
  onRefresh,
  onOpenSearch,
  onOpenWorkbench,
  onExport,
}: MemoryDashboardHeaderProps) => {
  const factCount = overview ? overview.facts.manualCount + overview.facts.derivedCount : 0;
  const entityCount = overview?.graph.entityCount ?? 0;
  const isReady = overview?.binding.bound === true;

  return (
    <div className="shrink-0 border-b border-border/60 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-foreground">{MEMORY_PAGE_TITLE}</h1>
          {overview ? (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'size-2 rounded-full',
                  isReady ? 'bg-green-500' : 'bg-muted-foreground/40'
                )}
              />
              <Badge variant="secondary">{factCount} facts</Badge>
              <Badge variant="outline">{entityCount} entities</Badge>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onOpenSearch}>
            <Search className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRefresh} disabled={loading}>
                <RefreshCw className={cn('mr-2 size-4', loading && 'animate-spin')} />
                Refresh
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 size-4" />
                Export facts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenWorkbench}>
                <Wrench className="mr-2 size-4" />
                Advanced mode
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
