import { useMemo, useRef } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
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

export const useForceLayout = ({
  entities,
  relations,
  nodeLimit,
  onEntityClick,
}: UseForceLayoutOptions): { nodes: Node[]; edges: Edge[] } => {
  const entityKey = entities.map((e) => `${e.id}:${e.canonicalName}:${e.entityType}`).join(',');
  const relationKey = relations.map((r) => `${r.id}:${r.from.id}:${r.to.id}`).join(',');

  // Store callback in a ref so the expensive simulation doesn't re-run
  // when callers pass unstable inline arrow functions.
  const onEntityClickRef = useRef(onEntityClick);
  onEntityClickRef.current = onEntityClick;

  return useMemo(() => {
    const limited = nodeLimit ? entities.slice(0, nodeLimit) : entities;
    const limitedIds = new Set(limited.map((e) => e.id));

    const forceNodes: ForceNode[] = limited.map((e) => ({ id: e.id }));
    const forceLinks: ForceLink[] = relations
      .filter((r) => limitedIds.has(r.from.id) && limitedIds.has(r.to.id))
      .map((r) => ({ id: r.id, source: r.from.id, target: r.to.id }));

    const sim = forceSimulation(forceNodes)
      .force(
        'link',
        forceLink<ForceNode, ForceLink>(forceLinks).id((d) => d.id)
      )
      .force('charge', forceManyBody().strength(-200))
      .force('center', forceCenter(0, 0))
      .force('collide', forceCollide(60))
      .stop();

    sim.tick(100);

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
      style: { stroke: 'var(--border)' },
      markerEnd: { type: 'arrowclosed' as const, color: 'var(--border)' },
    }));

    return { nodes, edges };
  }, [entityKey, relationKey, nodeLimit]);
};
