import { useMemo } from 'react';
import { Network } from 'lucide-react';
import { ReactFlow, ReactFlowProvider, type NodeTypes } from '@xyflow/react';
import { Badge } from '@moryflow/ui/components/badge';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@moryflow/ui/components/empty';
import { Skeleton } from '@moryflow/ui/components/skeleton';
import type { MemoryOverview } from '@shared/ipc';
import type { useMemoryPageState } from './use-memory';
import { useForceLayout } from './use-force-layout';
import { EntityNode } from './graph-entity-node';

import '@xyflow/react/dist/style.css';

type ConnectionsPanelProps = {
  overview: MemoryOverview | null;
  graphState: ReturnType<typeof useMemoryPageState>['graphState'];
  onEntityClick: (entityId: string) => void;
  onExplore: () => void;
};

const NODE_TYPES: NodeTypes = { entityNode: EntityNode };
const PREVIEW_NODE_LIMIT = 20;

const ConnectionsGraphInner = ({
  graphState,
  onEntityClick,
}: Pick<ConnectionsPanelProps, 'graphState' | 'onEntityClick'>) => {
  const entities = graphState.data?.entities ?? [];
  const relations = graphState.data?.relations ?? [];
  const { nodes, edges } = useForceLayout({
    entities,
    relations,
    nodeLimit: PREVIEW_NODE_LIMIT,
    onEntityClick,
  });

  const defaultEdgeOptions = useMemo(() => ({ animated: false }), []);

  if (graphState.error) {
    return (
      <div className="flex-1 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {graphState.error}
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <Empty className="flex-1 py-8">
        <EmptyMedia variant="icon">
          <Network />
        </EmptyMedia>
        <EmptyTitle>No connections yet</EmptyTitle>
        <EmptyDescription>
          Connections will appear as your AI learns about entities in your notes.
        </EmptyDescription>
      </Empty>
    );
  }

  return (
    <div className="min-h-0 flex-1">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        panOnDrag
        zoomOnScroll={false}
        preventScrolling={false}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
      />
    </div>
  );
};

export const ConnectionsPanel = ({
  overview,
  graphState,
  onEntityClick,
  onExplore,
}: ConnectionsPanelProps) => {
  const entityCount = overview?.graph.entityCount ?? 0;
  const relationCount = overview?.graph.relationCount ?? 0;

  return (
    <div className="flex w-1/2 min-h-0 flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Connections</h2>
          <Badge variant="outline">
            {entityCount} entities · {relationCount} relations
          </Badge>
        </div>
      </div>

      {graphState.loading && !graphState.data ? (
        <Skeleton className="min-h-0 flex-1 rounded-xl" />
      ) : (
        <ReactFlowProvider>
          <ConnectionsGraphInner graphState={graphState} onEntityClick={onEntityClick} />
        </ReactFlowProvider>
      )}

      {entityCount > 0 ? (
        <button
          type="button"
          onClick={onExplore}
          className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Explore connections →
        </button>
      ) : null}
    </div>
  );
};
