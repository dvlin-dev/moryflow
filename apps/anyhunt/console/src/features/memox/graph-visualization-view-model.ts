/**
 * [PROVIDES]: force graph view-model 转换与状态判定
 * [DEPENDS]: memox GraphData
 * [POS]: Graph 可视化组件的数据转换层
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import type { GraphData } from './types';

export interface ForceNode {
  id: string;
  name?: string;
  type?: string;
  x?: number;
  y?: number;
}

export interface ForceLink {
  source: string;
  target: string;
  type?: string;
  [key: string]: unknown;
}

export interface ForceGraphData {
  nodes: ForceNode[];
  links: ForceLink[];
}

export type GraphVisualizationState = 'idle' | 'loading' | 'error' | 'empty' | 'ready';

export function transformGraphData(data: GraphData): ForceGraphData {
  return {
    nodes: data.nodes.map((node) => ({
      id: node.id,
      name: node.name ?? node.id,
      type: node.type,
    })),
    links: data.edges.map((edge) => ({
      source: edge.sourceId,
      target: edge.targetId,
      type: edge.type,
    })),
  };
}

export function resolveGraphVisualizationState(params: {
  graphData: ForceGraphData | null;
  isLoading: boolean;
  error: Error | null;
}): GraphVisualizationState {
  if (params.isLoading) {
    return 'loading';
  }

  if (params.error) {
    return 'error';
  }

  if (!params.graphData) {
    return 'idle';
  }

  if (params.graphData.nodes.length === 0) {
    return 'empty';
  }

  return 'ready';
}

export function buildGraphVisualizationDescription(graphData: ForceGraphData | null): string {
  if (!graphData) {
    return 'Enter an entity and click "Load Graph" to visualize';
  }

  return `${graphData.nodes.length} nodes, ${graphData.links.length} edges`;
}
