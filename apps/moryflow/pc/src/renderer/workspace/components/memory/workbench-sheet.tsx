import {
  AlertCircle,
  DatabaseZap,
  Download,
  HardDrive,
  Link2,
  LoaderCircle,
  Network,
  RefreshCw,
} from 'lucide-react';
import { Badge } from '@moryflow/ui/components/badge';
import { Button } from '@moryflow/ui/components/button';
import { Input } from '@moryflow/ui/components/input';
import { ScrollArea } from '@moryflow/ui/components/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@moryflow/ui/components/tabs';
import { Textarea } from '@moryflow/ui/components/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@moryflow/ui/components/sheet';
import { cn } from '@/lib/utils';
import { useWorkspaceTree } from '../../context';
import {
  extractMemoryErrorMessage,
  MEMORY_GRAPH_QUERY_DEBOUNCE_MS,
  MEMORY_SEARCH_MIN_QUERY_LENGTH,
  MEMORY_TABS,
} from './const';
import { isMemorySearchFileOpenable, toMemorySearchFileNode } from './helpers';
import type { useMemoryPageState } from './use-memory';

type WorkbenchSheetProps = {
  open: boolean;
  onClose: () => void;
  memoryState: ReturnType<typeof useMemoryPageState>;
};

type OverviewStatCardProps = {
  icon: typeof HardDrive;
  label: string;
  value: string;
  detail: string;
};

const OverviewStatCard = ({ icon: Icon, label, value, detail }: OverviewStatCardProps) => (
  <div className="rounded-xl border border-border/60 bg-card/60 p-4">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      </div>
      <div className="rounded-lg bg-muted/70 p-2.5 text-muted-foreground">
        <Icon className="size-5" />
      </div>
    </div>
    <p className="mt-3 text-sm text-muted-foreground">{detail}</p>
  </div>
);

export const WorkbenchSheet = ({ open, onClose, memoryState }: WorkbenchSheetProps) => {
  const { openFileFromTree } = useWorkspaceTree();
  const {
    activeTab,
    setActiveTab,
    overview,
    loading,
    error,
    actionError,
    refresh,
    searchQuery,
    setSearchQuery,
    searchState,
    factsState,
    factDraft,
    setFactDraft,
    createFact,
    selectedFact,
    selectedFactDraft,
    setSelectedFactDraft,
    factHistory,
    factDetailLoading,
    openFact,
    markFactUseful,
    saveSelectedFact,
    deleteSelectedFact,
    selectedFactIds,
    toggleFactSelection,
    deleteSelectedFacts,
    graphQuery,
    setGraphQuery,
    graphState,
    selectedEntityDetail,
    entityDetailLoading,
    openEntity,
    exportState,
    createExport,
  } = memoryState;

  const disabledReason = overview?.binding.disabledReason ?? null;
  const memoryStatusLabel = overview?.binding.bound ? 'Ready' : 'Unavailable';
  const syncEngineLabel = overview ? overview.sync.engineStatus.replaceAll('_', ' ') : 'unknown';
  const syncAccessLabel = overview?.scope.vaultId ? 'Enabled' : 'Optional';
  const memoryStatusDetail = disabledReason
    ? disabledReason === 'login_required'
      ? 'Log in to enable Memory for this workspace.'
      : disabledReason === 'profile_unavailable'
        ? 'The current workspace profile is still being prepared for Memory.'
        : 'Open a workspace to start using Memory.'
    : 'Memory is available for the current workspace profile.';
  const syncStatusDetail = overview?.scope.vaultId
    ? 'Cloud Sync is enabled for this workspace profile.'
    : 'Cloud Sync is optional and not enabled for this workspace profile.';
  const searchResult = searchState.data;
  const graphResult = graphState.data;
  const exportResult = exportState.data;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="sm:max-w-4xl flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Advanced Workbench</SheetTitle>
            <Button variant="ghost" size="sm" onClick={() => void refresh()} disabled={loading}>
              <RefreshCw className={cn('mr-1 size-4', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
          <div className="flex flex-col gap-4">
            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <p className="text-sm font-medium text-destructive">
                    Memory overview unavailable
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {extractMemoryErrorMessage(error)}
                </p>
              </div>
            ) : null}

            {actionError ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <p className="text-sm font-medium text-destructive">Memory action failed</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {extractMemoryErrorMessage(actionError)}
                </p>
              </div>
            ) : null}

            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as typeof activeTab)}
            >
              <TabsList className="h-auto gap-1 border-b border-border/50 bg-transparent p-0">
                {MEMORY_TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    onClick={() => setActiveTab(tab.value)}
                    className="rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Link2 className="size-4" />
                      Workspace profile
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                          Memory status
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant={overview?.binding.bound ? 'default' : 'outline'}>
                            {memoryStatusLabel}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{memoryStatusDetail}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          Sync status
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant={overview?.scope.vaultId ? 'secondary' : 'outline'}>
                            {syncAccessLabel}
                          </Badge>
                          <Badge variant="outline">{syncEngineLabel}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{syncStatusDetail}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Network className="size-4" />
                      Memory delivery
                    </div>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-muted-foreground">Memory project</dt>
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
                    value={String(overview?.graph.entityCount ?? 0)}
                    detail={
                      overview
                        ? `${overview.graph.entityCount} entities, ${overview.graph.relationCount} relations`
                        : 'Graph read API is connected but waiting for data'
                    }
                  />
                </div>
              </TabsContent>

              <TabsContent value="search" className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
                  <div className="flex flex-col gap-3">
                    <Input
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search memory files or facts..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Search always goes through retrieval/search and keeps Files and Facts as
                      separate groups.
                    </p>
                  </div>
                </div>

                {searchState.loading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                    Searching memory...
                  </div>
                ) : null}

                {searchState.error ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    {searchState.error}
                  </div>
                ) : null}

                {searchQuery.trim().length > 0 &&
                searchQuery.trim().length < MEMORY_SEARCH_MIN_QUERY_LENGTH ? (
                  <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm text-muted-foreground">
                    Type at least {MEMORY_SEARCH_MIN_QUERY_LENGTH} characters to search memory.
                  </div>
                ) : null}

                {searchResult ? (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-foreground">Memory Files</h2>
                        <Badge variant="outline">{searchResult.groups.files.returnedCount}</Badge>
                      </div>
                      <div className="space-y-2">
                        {searchResult.groups.files.items.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No matching memory files.</p>
                        ) : null}
                        {searchResult.groups.files.items.map((item) => {
                          const openable = isMemorySearchFileOpenable(item);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={!openable}
                              className={cn(
                                'flex w-full flex-col rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-left',
                                openable
                                  ? 'hover:border-foreground/20'
                                  : 'cursor-not-allowed opacity-60'
                              )}
                              onClick={() => {
                                if (!openable) return;
                                const node = toMemorySearchFileNode(item);
                                if (node) openFileFromTree(node);
                              }}
                            >
                              <span className="text-sm font-medium text-foreground">
                                {item.title}
                              </span>
                              <span className="mt-1 text-xs text-muted-foreground">
                                {openable
                                  ? item.snippet || item.path || 'Memory file result'
                                  : 'Not available locally'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-foreground">Facts</h2>
                        <Badge variant="outline">{searchResult.groups.facts.returnedCount}</Badge>
                      </div>
                      <div className="space-y-2">
                        {searchResult.groups.facts.items.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No matching facts.</p>
                        ) : null}
                        {searchResult.groups.facts.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-label={item.text}
                            className="flex w-full flex-col rounded-xl border border-border/60 bg-background/70 px-4 py-3 text-left hover:border-foreground/20"
                            onClick={() => void openFact(item.id)}
                          >
                            <span className="text-sm font-medium text-foreground">{item.text}</span>
                            <span className="mt-1 text-xs text-muted-foreground">
                              {item.kind} · score {item.score.toFixed(2)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </TabsContent>

              <TabsContent value="facts" className="space-y-4">
                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-5">
                    <div className="space-y-3">
                      <Textarea
                        rows={3}
                        value={factDraft}
                        onChange={(event) => setFactDraft(event.target.value)}
                        placeholder="Write a manual fact..."
                      />
                      <Button
                        onClick={() => void createFact()}
                        disabled={factDraft.trim().length === 0}
                      >
                        Add fact
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void deleteSelectedFacts()}
                        disabled={selectedFactIds.length === 0}
                      >
                        Delete selected
                      </Button>
                    </div>

                    {factsState.loading ? (
                      <div className="text-sm text-muted-foreground">Loading facts...</div>
                    ) : null}
                    {factsState.error ? (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                        {factsState.error}
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      {factsState.data.map((fact) => (
                        <div
                          key={fact.id}
                          className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/70 px-4 py-3"
                        >
                          <input
                            aria-label={`Select ${fact.text}`}
                            type="checkbox"
                            checked={selectedFactIds.includes(fact.id)}
                            onChange={() => toggleFactSelection(fact.id)}
                            disabled={fact.readOnly}
                            className="mt-1"
                          />
                          <button
                            type="button"
                            aria-label={fact.text}
                            className="flex flex-1 items-start justify-between gap-3 text-left"
                            onClick={() => void openFact(fact.id)}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{fact.text}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {fact.kind} {fact.readOnly ? '· read only' : ''}
                              </p>
                            </div>
                            <Badge variant="outline">{fact.categories[0] ?? fact.kind}</Badge>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold text-foreground">Fact detail</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Manual and source-derived facts share one read surface.
                        </p>
                      </div>
                      {factDetailLoading ? (
                        <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>

                    {selectedFact ? (
                      <>
                        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                          <div className="flex items-center gap-2">
                            <Badge variant={selectedFact.readOnly ? 'outline' : 'default'}>
                              {selectedFact.kind}
                            </Badge>
                            {selectedFact.readOnly ? (
                              <Badge variant="outline">Read only</Badge>
                            ) : null}
                          </div>
                          {selectedFact.readOnly ? (
                            <p className="mt-3 text-sm text-foreground">{selectedFact.text}</p>
                          ) : (
                            <Textarea
                              rows={4}
                              value={selectedFactDraft}
                              onChange={(event) => setSelectedFactDraft(event.target.value)}
                            />
                          )}
                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => void markFactUseful()}
                            >
                              Mark useful
                            </Button>
                            {!selectedFact.readOnly ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void saveSelectedFact()}
                                >
                                  Save changes
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => void deleteSelectedFact()}
                                >
                                  Delete fact
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                          <h3 className="text-sm font-semibold text-foreground">History</h3>
                          <div className="mt-3 space-y-3">
                            {factHistory?.items.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-lg border border-border/50 px-3 py-2"
                              >
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  {item.event}
                                </p>
                                <p className="mt-1 text-sm text-foreground">
                                  {item.newText ?? item.oldText ?? 'No text snapshot'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/60 bg-background/50 p-6 text-sm text-muted-foreground">
                        Pick a fact to inspect detail, history, and feedback state.
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="graph" className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <Input
                      value={graphQuery}
                      onChange={(event) => setGraphQuery(event.target.value)}
                      placeholder="Search graph entities..."
                    />
                    <Button variant="secondary" onClick={() => void refresh()}>
                      Refresh overview
                    </Button>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Graph queries use a {MEMORY_GRAPH_QUERY_DEBOUNCE_MS}ms debounce to avoid stale
                    results.
                  </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-foreground">Entities</h2>
                      {graphState.loading ? (
                        <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>
                    {graphState.error ? (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                        {graphState.error}
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      {graphResult?.entities.map((entity) => (
                        <Button
                          key={entity.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => void openEntity(entity.id)}
                        >
                          {entity.canonicalName}
                        </Button>
                      ))}
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                      {graphResult
                        ? `${graphResult.evidenceSummary.observationCount} observations · ${graphResult.evidenceSummary.sourceCount} sources`
                        : 'Graph results will appear here.'}
                    </div>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-foreground">Entity detail</h2>
                      {entityDetailLoading ? (
                        <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                      ) : null}
                    </div>
                    {selectedEntityDetail ? (
                      <>
                        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                          <p className="text-sm font-semibold text-foreground">
                            {selectedEntityDetail.entity.canonicalName}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedEntityDetail.entity.entityType}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                          <h3 className="text-sm font-semibold text-foreground">Relations</h3>
                          <div className="mt-3 space-y-2">
                            {[
                              ...selectedEntityDetail.entity.outgoingRelations,
                              ...selectedEntityDetail.entity.incomingRelations,
                            ].map((relation) => (
                              <div
                                key={relation.id}
                                className="rounded-lg border border-border/50 px-3 py-2"
                              >
                                <p className="text-sm text-foreground">{relation.relationType}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                          <h3 className="text-sm font-semibold text-foreground">
                            Recent observations
                          </h3>
                          <div className="mt-3 space-y-2">
                            {selectedEntityDetail.recentObservations.length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                No recent observations.
                              </p>
                            ) : null}
                            {selectedEntityDetail.recentObservations.map((observation) => (
                              <div
                                key={observation.id}
                                className="rounded-lg border border-border/50 px-3 py-2"
                              >
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                  {observation.observationType}
                                </p>
                                <p className="mt-1 text-sm text-foreground">
                                  {observation.evidenceMemoryId ??
                                    observation.evidenceSourceId ??
                                    'No evidence ref'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/60 bg-background/50 p-6 text-sm text-muted-foreground">
                        Select an entity to inspect graph relations and evidence.
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="exports" className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Facts export</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Current release exports facts only.
                      </p>
                    </div>
                    <Button onClick={() => void createExport()} disabled={exportState.loading}>
                      <Download className="mr-2 size-4" />
                      Create facts export
                    </Button>
                  </div>
                </div>

                {exportState.loading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                    Building export...
                  </div>
                ) : null}
                {exportState.error ? (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    {exportState.error}
                  </div>
                ) : null}
                {exportResult ? (
                  <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
                    <div className="flex items-center gap-2">
                      <Badge>Export ready</Badge>
                      <span className="text-sm text-muted-foreground">
                        {exportResult.items.length} facts included
                      </span>
                    </div>
                    <div className="mt-4 space-y-2">
                      {exportResult.items.map((fact) => (
                        <div
                          key={fact.id}
                          className="rounded-lg border border-border/50 px-3 py-2 text-sm"
                        >
                          {fact.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
