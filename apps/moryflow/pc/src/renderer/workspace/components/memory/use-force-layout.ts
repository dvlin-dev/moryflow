import { useMemo, useRef } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import type { Edge, Node } from '@xyflow/react';
import type { MemoryGraphEntity, MemoryGraphRelation } from '@shared/ipc';

type ForceNode = SimulationNodeDatum & { id: string };
type ForceLink = SimulationLinkDatum<ForceNode> & { id: string };

type UseForceLayoutOptions = {
  entities: MemoryGraphEntity[];
  relations: MemoryGraphRelation[];
  nodeLimit?: number;
  onEntityClick?: (entityId: string) => void;
};

const ENTITY_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const hashString = (s: string): number => {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

export const getEntityColor = (entityType: string): string =>
  ENTITY_COLORS[hashString(entityType) % ENTITY_COLORS.length]!;

const EDGE_STYLE = { stroke: '#555', strokeWidth: 1 } as const;

export const useForceLayout = ({
  entities,
  relations,
  nodeLimit,
  onEntityClick,
}: UseForceLayoutOptions): { nodes: Node[]; edges: Edge[] } => {
  const entityKey = entities.map((e) => `${e.id}:${e.canonicalName}:${e.entityType}`).join(',');
  const relationKey = relations.map((r) => `${r.id}:${r.from.id}:${r.to.id}`).join(',');

  const onEntityClickRef = useRef(onEntityClick);
  onEntityClickRef.current = onEntityClick;

  return useMemo(() => {
    const limited = nodeLimit ? entities.slice(0, nodeLimit) : entities;
    const limitedIds = new Set(limited.map((e) => e.id));

    const forceLinks: ForceLink[] = relations
      .filter((r) => limitedIds.has(r.from.id) && limitedIds.has(r.to.id))
      .map((r) => ({ id: r.id, source: r.from.id, target: r.to.id }));

    const forceNodes: ForceNode[] = limited.map((e) => ({ id: e.id }));
    const nodeCount = forceNodes.length;

    // Scale forces based on graph density
    const chargeStrength = Math.min(-300, -150 * Math.sqrt(nodeCount));
    const linkDistance = Math.max(200, 120 + nodeCount * 3);
    const collideRadius = 100;

    const sim = forceSimulation(forceNodes)
      .force(
        'link',
        forceLink<ForceNode, ForceLink>(forceLinks)
          .id((d) => d.id)
          .distance(linkDistance)
          .strength(0.3)
      )
      .force('charge', forceManyBody().strength(chargeStrength).distanceMax(800))
      .force('center', forceCenter(0, 0))
      .force('collide', forceCollide(collideRadius).strength(1).iterations(3))
      .force('x', forceX(0).strength(0.03))
      .force('y', forceY(0).strength(0.03))
      .stop();

    // More ticks for better convergence
    for (let i = 0; i < 300; i++) sim.tick();

    const nodes: Node[] = limited.map((entity, i) => ({
      id: entity.id,
      type: 'entityNode',
      position: { x: forceNodes[i]!.x ?? 0, y: forceNodes[i]!.y ?? 0 },
      data: {
        label: entity.canonicalName,
        entityType: entity.entityType,
        color: getEntityColor(entity.entityType),
        onEntityClick: (id: string) => onEntityClickRef.current?.(id),
      },
    }));

    const edges: Edge[] = forceLinks.map((link) => ({
      id: link.id,
      source: typeof link.source === 'string' ? link.source : (link.source as ForceNode).id,
      target: typeof link.target === 'string' ? link.target : (link.target as ForceNode).id,
      style: EDGE_STYLE,
    }));

    return { nodes, edges };
  }, [entityKey, relationKey, nodeLimit]);
};
