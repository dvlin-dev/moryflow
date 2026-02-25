/**
 * [PROPS]: graphData, isLoading, error
 * [EMITS]: none
 * [POS]: Memox Graph 可视化区域（容器装配层）
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@moryflow/ui';
import type { GraphData } from '../types';
import {
  buildGraphVisualizationDescription,
  resolveGraphVisualizationState,
  transformGraphData,
} from '../graph-visualization-view-model';
import { useGraphContainerDimensions } from './use-graph-container-dimensions';
import { useMemoxGraphCanvas } from './use-memox-graph-canvas';
import { GraphVisualizationStatePanel } from './memox-graph-visualization-states';

interface MemoxGraphVisualizationCardProps {
  graphData: GraphData | null;
  isLoading: boolean;
  error: Error | null;
}

export function MemoxGraphVisualizationCard({
  graphData,
  isLoading,
  error,
}: MemoxGraphVisualizationCardProps) {
  const forceGraphData = useMemo(() => {
    if (!graphData) {
      return null;
    }

    return transformGraphData(graphData);
  }, [graphData]);

  const viewState = resolveGraphVisualizationState({
    graphData: forceGraphData,
    isLoading,
    error,
  });

  const description = buildGraphVisualizationDescription(forceGraphData);

  const { containerRef, dimensions } = useGraphContainerDimensions();
  const { graphRef, nodeCanvasObject, handleNodeHover, handleNodeClick } = useMemoxGraphCanvas();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Graph Visualization</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent ref={containerRef} className="h-[500px]">
        <GraphVisualizationStatePanel
          viewState={viewState}
          error={error}
          forceGraphData={forceGraphData}
          dimensions={dimensions}
          graphRef={graphRef}
          nodeCanvasObject={nodeCanvasObject}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
        />
      </CardContent>
    </Card>
  );
}
