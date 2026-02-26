/**
 * [PROVIDES]: useMemoxGraphCanvas
 * [DEPENDS]: react-force-graph-2d, React hooks
 * [POS]: Graph 可视化 canvas 渲染与交互 hook
 *
 * [PROTOCOL]: 本文件变更时，必须更新所属目录 CLAUDE.md
 */

import { useCallback, useRef, useState } from 'react';
import type { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
import type { ForceLink, ForceNode } from '../graph-visualization-view-model';

const NODE_COLORS: Record<string, string> = {
  user: '#4f46e5',
  agent: '#059669',
  app: '#d97706',
  run: '#dc2626',
  default: '#6b7280',
};

type CanvasForceNode = NodeObject & ForceNode;
export type MemoxGraphForceNode = CanvasForceNode;

export function useMemoxGraphCanvas() {
  const graphRef = useRef<ForceGraphMethods<CanvasForceNode, ForceLink>>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const nodeCanvasObject = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const data = node as CanvasForceNode;
      const label = data.name ?? data.id;
      const fontSize = 12 / globalScale;
      const nodeRadius = 6;
      const color = data.type ? NODE_COLORS[data.type] ?? NODE_COLORS.default : NODE_COLORS.default;
      const isHovered = hoveredNodeId === String(data.id);

      ctx.beginPath();
      ctx.arc(data.x ?? 0, data.y ?? 0, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered ? '#f59e0b' : color;
      ctx.fill();

      ctx.font = `${fontSize}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#374151';
      ctx.fillText(label, data.x ?? 0, (data.y ?? 0) + nodeRadius + 2);
    },
    [hoveredNodeId]
  );

  const handleNodeHover = useCallback((node: NodeObject | null) => {
    if (!node || node.id === undefined || node.id === null) {
      setHoveredNodeId(null);
      return;
    }

    setHoveredNodeId(String(node.id));
  }, []);

  const handleNodeClick = useCallback((node: NodeObject) => {
    if (!graphRef.current) {
      return;
    }

    const x = typeof node.x === 'number' ? node.x : 0;
    const y = typeof node.y === 'number' ? node.y : 0;

    graphRef.current.centerAt(x, y, 500);
    graphRef.current.zoom(2, 500);
  }, []);

  return {
    graphRef,
    nodeCanvasObject,
    handleNodeHover,
    handleNodeClick,
  };
}
