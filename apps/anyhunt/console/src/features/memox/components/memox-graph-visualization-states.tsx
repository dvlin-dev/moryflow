/**
 * [PROVIDES]: GraphVisualizationStatePanel
 * [DEPENDS]: react-force-graph-2d, graph view-model types
 * [POS]: Graph 可视化状态片段与渲染分发
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import type { RefObject } from 'react';
import ForceGraph2D, { type ForceGraphMethods, type NodeObject } from 'react-force-graph-2d';
import { Alert, AlertDescription } from '@moryflow/ui';
import type {
  ForceGraphData,
  ForceLink,
  GraphVisualizationState,
} from '../graph-visualization-view-model';
import type { MemoxGraphForceNode } from './use-memox-graph-canvas';

interface GraphVisualizationStatePanelProps {
  viewState: GraphVisualizationState;
  error: Error | null;
  forceGraphData: ForceGraphData | null;
  dimensions: { width: number; height: number };
  graphRef: RefObject<ForceGraphMethods<MemoxGraphForceNode, ForceLink> | null>;
  nodeCanvasObject: (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => void;
  onNodeHover: (node: NodeObject | null) => void;
  onNodeClick: (node: NodeObject) => void;
}

function LoadingState() {
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      Loading graph...
    </div>
  );
}

function ErrorState({ error }: { error: Error | null }) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertDescription>Failed to load graph: {error?.message ?? 'unknown error'}</AlertDescription>
    </Alert>
  );
}

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      <p>No graph data found for this entity.</p>
    </div>
  );
}

function IdleState() {
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground">
      <p>Enter an entity and click "Load Graph" to visualize.</p>
    </div>
  );
}

export function GraphVisualizationStatePanel({
  viewState,
  error,
  forceGraphData,
  dimensions,
  graphRef,
  nodeCanvasObject,
  onNodeHover,
  onNodeClick,
}: GraphVisualizationStatePanelProps) {
  switch (viewState) {
    case 'loading':
      return <LoadingState />;
    case 'error':
      return <ErrorState error={error} />;
    case 'empty':
      return <EmptyState />;
    case 'ready':
      if (!forceGraphData) {
        return null;
      }

      return (
        <ForceGraph2D
          ref={graphRef}
          graphData={forceGraphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={nodeCanvasObject}
          onNodeHover={onNodeHover}
          onNodeClick={onNodeClick}
          linkDirectionalArrowLength={5}
          linkDirectionalArrowRelPos={1}
          linkCurvature={0.1}
          onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
        />
      );
    case 'idle':
      return <IdleState />;
    default:
      return null;
  }
}
