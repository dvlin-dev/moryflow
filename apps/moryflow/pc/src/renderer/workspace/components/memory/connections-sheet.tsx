import { useMemo } from 'react';
import { LoaderCircle } from 'lucide-react';
import { ReactFlow, ReactFlowProvider, type NodeTypes } from '@xyflow/react';
import { Badge } from '@moryflow/ui/components/badge';
import { Input } from '@moryflow/ui/components/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@moryflow/ui/components/sheet';
import { AnimatedCollapse } from '@moryflow/ui/animate/primitives/base/animated-collapse';
import type { useMemoryPageState } from './use-memory';
import { useForceLayout } from './use-force-layout';
import { EntityNode } from './graph-entity-node';

import '@xyflow/react/dist/style.css';

type ConnectionsSheetProps = {
  open: boolean;
  onClose: () => void;
  graphQuery: string;
  setGraphQuery: (value: string) => void;
  graphState: ReturnType<typeof useMemoryPageState>['graphState'];
  selectedEntityDetail: ReturnType<typeof useMemoryPageState>['selectedEntityDetail'];
  entityDetailLoading: boolean;
  onEntityClick: (entityId: string) => void;
};

const NODE_TYPES: NodeTypes = { entityNode: EntityNode };

const FullGraphInner = ({
  graphState,
  onEntityClick,
}: Pick<ConnectionsSheetProps, 'graphState' | 'onEntityClick'>) => {
  const entities = graphState.data?.entities ?? [];
  const relations = graphState.data?.relations ?? [];
  const { nodes, edges } = useForceLayout({
    entities,
    relations,
    onEntityClick,
  });

  const defaultEdgeOptions = useMemo(() => ({ animated: false }), []);

  return (
    <div className="min-h-0 flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        panOnDrag
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
      />
    </div>
  );
};

export const ConnectionsSheet = ({
  open,
  onClose,
  graphQuery,
  setGraphQuery,
  graphState,
  selectedEntityDetail,
  entityDetailLoading,
  onEntityClick,
}: ConnectionsSheetProps) => (
  <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
    <SheetContent side="right" className="sm:max-w-3xl flex flex-col">
      <SheetHeader>
        <SheetTitle>Connections</SheetTitle>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-4 pb-4 min-h-0 flex-1">
        <div className="flex items-center gap-2">
          <Input
            value={graphQuery}
            onChange={(e) => setGraphQuery(e.target.value)}
            placeholder="Search graph entities..."
            className="flex-1"
          />
          {graphState.loading ? (
            <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        {graphState.error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {graphState.error}
          </div>
        ) : null}

        <ReactFlowProvider>
          <FullGraphInner graphState={graphState} onEntityClick={onEntityClick} />
        </ReactFlowProvider>

        <AnimatedCollapse open={selectedEntityDetail !== null}>
          {selectedEntityDetail ? (
            <div className="rounded-xl border border-border/60 bg-background/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedEntityDetail.entity.canonicalName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedEntityDetail.entity.entityType}
                  </p>
                </div>
                {entityDetailLoading ? (
                  <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
                ) : null}
              </div>

              {[
                ...selectedEntityDetail.entity.outgoingRelations,
                ...selectedEntityDetail.entity.incomingRelations,
              ].length > 0 ? (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">Relations</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ...selectedEntityDetail.entity.outgoingRelations,
                      ...selectedEntityDetail.entity.incomingRelations,
                    ].map((relation) => (
                      <Badge key={relation.id} variant="outline">
                        {relation.relationType}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {selectedEntityDetail.recentObservations.length > 0 ? (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2">
                    Recent observations
                  </h4>
                  <div className="space-y-1.5">
                    {selectedEntityDetail.recentObservations.map((obs) => (
                      <div key={obs.id} className="rounded-lg border border-border/50 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {obs.observationType}
                        </p>
                        <p className="mt-0.5 text-sm text-foreground">
                          {obs.evidenceMemoryId ?? obs.evidenceSourceId ?? 'No evidence ref'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </AnimatedCollapse>
      </div>
    </SheetContent>
  </Sheet>
);
