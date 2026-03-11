/**
 * [PROPS]: -
 * [EMITS]: refresh()
 * [POS]: Memory 模块主区占位页（展示 overview 与 binding 状态）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { RefreshCw, DatabaseZap, HardDrive, Link2, Network } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import { Badge } from '@moryflow/ui/components/badge';
import { cn } from '@/lib/utils';
import { MEMORY_PAGE_SUBTITLE, MEMORY_PAGE_TITLE, extractMemoryErrorMessage } from './const';
import { useMemoryPageState } from './use-memory';

type OverviewStatCardProps = {
  icon: typeof HardDrive;
  label: string;
  value: string;
  detail: string;
};

const OverviewStatCard = ({ icon: Icon, label, value, detail }: OverviewStatCardProps) => {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        </div>
        <div className="rounded-lg bg-muted/70 p-2 text-muted-foreground">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
};

export const MemoryPage = () => {
  const { overview, loading, error, refresh } = useMemoryPageState();

  const disabledReason = overview?.binding.disabledReason ?? null;
  const bindingLabel = overview?.binding.bound ? 'Bound' : 'Not bound';
  const syncLabel = overview ? overview.sync.engineStatus.replaceAll('_', ' ') : 'unknown';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/60 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-foreground">{MEMORY_PAGE_TITLE}</h1>
              <Badge variant="secondary">PR 3 placeholder</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{MEMORY_PAGE_SUBTITLE}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void refresh();
            }}
            disabled={loading}
          >
            <RefreshCw className={cn('mr-1 size-4', loading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 pb-10">
          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">Memory overview unavailable</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {extractMemoryErrorMessage(error)}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link2 className="size-4" />
                Workspace binding
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Workspace
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {overview?.scope.workspaceName ?? 'Current workspace'}
                  </p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">
                    {overview?.scope.localPath ?? 'No local workspace selected'}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    Remote binding
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge variant={overview?.binding.bound ? 'default' : 'outline'}>
                      {bindingLabel}
                    </Badge>
                    <Badge variant="outline">{syncLabel}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {disabledReason ? `Disabled reason: ${disabledReason}` : 'Gateway path active'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Network className="size-4" />
                Delivery status
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Scope</dt>
                  <dd className="font-medium text-foreground">
                    {overview?.scope.projectId ?? 'Unavailable'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Indexed sources</dt>
                  <dd className="font-medium text-foreground">
                    {overview
                      ? `${overview.indexing.indexedSourceCount}/${overview.indexing.sourceCount}`
                      : '0/0'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Projection</dt>
                  <dd className="font-medium capitalize text-foreground">
                    {overview?.graph.projectionStatus ?? 'idle'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <OverviewStatCard
              icon={HardDrive}
              label="Indexing"
              value={String(overview?.indexing.sourceCount ?? 0)}
              detail={
                overview
                  ? `${overview.indexing.pendingSourceCount} pending, ${overview.indexing.failedSourceCount} failed`
                  : 'Waiting for overview'
              }
            />
            <OverviewStatCard
              icon={DatabaseZap}
              label="Facts"
              value={String(
                (overview?.facts.manualCount ?? 0) + (overview?.facts.derivedCount ?? 0)
              )}
              detail={
                overview
                  ? `${overview.facts.manualCount} manual, ${overview.facts.derivedCount} source-derived`
                  : 'Manual and source-derived facts will appear here'
              }
            />
            <OverviewStatCard
              icon={Network}
              label="Graph"
              value={String(
                (overview?.graph.entityCount ?? 0) + (overview?.graph.relationCount ?? 0)
              )}
              detail={
                overview
                  ? `${overview.graph.entityCount} entities, ${overview.graph.relationCount} relations`
                  : 'Graph read API is connected but not yet rendered as a workbench'
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};
