/**
 * [INPUT]: apiKeyId, entityId, TraversalOptions
 * [OUTPUT]: GraphData { nodes: GraphNode[], edges: GraphEdge[] }
 * [POS]: Graph traversal service - navigates and queries the knowledge graph structure
 *
 * [PROTOCOL]: When modifying this file, you MUST update this header and apps/server/src/graph/CLAUDE.md
 */

import { Injectable, Logger } from '@nestjs/common';
import { EntityRepository, Entity } from '../entity/entity.repository';
import { RelationRepository, RelationWithEntities } from '../relation/relation.repository';

export interface GraphNode {
  id: string;
  type: string;
  name: string;
  properties?: Record<string, any> | null;
}

export interface GraphEdge {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties?: Record<string, any> | null;
  confidence?: number | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface TraversalOptions {
  maxDepth?: number;
  relationTypes?: string[];
  entityTypes?: string[];
  limit?: number;
}

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

  constructor(
    private readonly entityRepository: EntityRepository,
    private readonly relationRepository: RelationRepository,
  ) {}

  /**
   * 获取用户的完整知识图谱
   */
  async getFullGraph(
    apiKeyId: string,
    userId: string,
    options: { limit?: number } = {},
  ): Promise<GraphData> {
    const limit = options.limit ?? 1000;

    // 获取所有实体
    const entities = await this.entityRepository.findMany(apiKeyId, {
      where: { userId },
      take: limit,
    });

    // 获取所有关系
    const relations = await this.relationRepository.getPrisma().relation.findMany({
      where: { apiKeyId, userId },
      take: limit,
    });

    const nodes: GraphNode[] = entities.map((e) => ({
      id: e.id,
      type: e.type,
      name: e.name,
      properties: e.properties,
    }));

    const edges: GraphEdge[] = relations.map((r) => ({
      id: r.id,
      type: r.type,
      sourceId: r.sourceId,
      targetId: r.targetId,
      properties: r.properties as Record<string, any> | null,
      confidence: r.confidence,
    }));

    return { nodes, edges };
  }

  /**
   * 从指定实体开始遍历图谱
   */
  async traverse(
    apiKeyId: string,
    entityId: string,
    options: TraversalOptions = {},
  ): Promise<GraphData> {
    const maxDepth = options.maxDepth ?? 2;
    const limit = options.limit ?? 100;

    const visitedNodes = new Map<string, GraphNode>();
    const edges: GraphEdge[] = [];
    const queue: { entityId: string; depth: number }[] = [{ entityId, depth: 0 }];

    while (queue.length > 0 && visitedNodes.size < limit) {
      const current = queue.shift()!;

      if (visitedNodes.has(current.entityId) || current.depth > maxDepth) {
        continue;
      }

      // 获取当前实体
      const entity = await this.entityRepository.findById(apiKeyId, current.entityId);
      if (!entity) continue;

      // 检查实体类型过滤
      if (options.entityTypes && !options.entityTypes.includes(entity.type)) {
        continue;
      }

      visitedNodes.set(entity.id, {
        id: entity.id,
        type: entity.type,
        name: entity.name,
        properties: entity.properties,
      });

      // 如果还没到最大深度，获取关联关系
      if (current.depth < maxDepth) {
        const relations = await this.relationRepository.findByEntity(apiKeyId, entity.id);

        for (const rel of relations) {
          // 检查关系类型过滤
          if (options.relationTypes && !options.relationTypes.includes(rel.type)) {
            continue;
          }

          edges.push({
            id: rel.id,
            type: rel.type,
            sourceId: rel.sourceId,
            targetId: rel.targetId,
            properties: rel.properties,
            confidence: rel.confidence,
          });

          // 添加邻居到队列
          const neighborId = rel.sourceId === entity.id ? rel.targetId : rel.sourceId;
          if (!visitedNodes.has(neighborId)) {
            queue.push({ entityId: neighborId, depth: current.depth + 1 });
          }
        }
      }
    }

    return {
      nodes: Array.from(visitedNodes.values()),
      edges: this.deduplicateEdges(edges),
    };
  }

  /**
   * 查找两个实体之间的路径
   */
  async findPath(
    apiKeyId: string,
    sourceId: string,
    targetId: string,
    maxDepth: number = 5,
  ): Promise<GraphData | null> {
    // BFS 查找最短路径
    const visited = new Set<string>();
    const parent = new Map<string, { nodeId: string; edge: GraphEdge }>();
    const queue: string[] = [sourceId];
    visited.add(sourceId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (currentId === targetId) {
        // 找到路径，重建它
        return this.reconstructPath(apiKeyId, sourceId, targetId, parent);
      }

      // 检查深度
      let depth = 0;
      let checkId = currentId;
      while (parent.has(checkId)) {
        depth++;
        checkId = parent.get(checkId)!.nodeId;
      }
      if (depth >= maxDepth) continue;

      // 获取邻居
      const relations = await this.relationRepository.findByEntity(apiKeyId, currentId);
      for (const rel of relations) {
        const neighborId = rel.sourceId === currentId ? rel.targetId : rel.sourceId;
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          parent.set(neighborId, {
            nodeId: currentId,
            edge: {
              id: rel.id,
              type: rel.type,
              sourceId: rel.sourceId,
              targetId: rel.targetId,
              properties: rel.properties,
              confidence: rel.confidence,
            },
          });
          queue.push(neighborId);
        }
      }
    }

    return null; // 没有找到路径
  }

  /**
   * 获取实体的邻居
   */
  async getNeighbors(
    apiKeyId: string,
    entityId: string,
    options: { relationTypes?: string[]; direction?: 'in' | 'out' | 'both' } = {},
  ): Promise<{ entity: GraphNode; relation: GraphEdge }[]> {
    const direction = options.direction ?? 'both';
    const relations = await this.relationRepository.findByEntity(apiKeyId, entityId);

    const neighbors: { entity: GraphNode; relation: GraphEdge }[] = [];

    for (const rel of relations) {
      // 检查方向
      if (direction === 'out' && rel.sourceId !== entityId) continue;
      if (direction === 'in' && rel.targetId !== entityId) continue;

      // 检查关系类型
      if (options.relationTypes && !options.relationTypes.includes(rel.type)) {
        continue;
      }

      const neighborId = rel.sourceId === entityId ? rel.targetId : rel.sourceId;
      const neighbor = await this.entityRepository.findById(apiKeyId, neighborId);
      if (!neighbor) continue;

      neighbors.push({
        entity: {
          id: neighbor.id,
          type: neighbor.type,
          name: neighbor.name,
          properties: neighbor.properties,
        },
        relation: {
          id: rel.id,
          type: rel.type,
          sourceId: rel.sourceId,
          targetId: rel.targetId,
          properties: rel.properties,
          confidence: rel.confidence,
        },
      });
    }

    return neighbors;
  }

  /**
   * 重建路径
   */
  private async reconstructPath(
    apiKeyId: string,
    sourceId: string,
    targetId: string,
    parent: Map<string, { nodeId: string; edge: GraphEdge }>,
  ): Promise<GraphData> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    let currentId = targetId;

    while (currentId !== sourceId) {
      const entity = await this.entityRepository.findById(apiKeyId, currentId);
      if (entity) {
        nodes.unshift({
          id: entity.id,
          type: entity.type,
          name: entity.name,
          properties: entity.properties,
        });
      }

      const parentInfo = parent.get(currentId);
      if (!parentInfo) break;

      edges.unshift(parentInfo.edge);
      currentId = parentInfo.nodeId;
    }

    // 添加源节点
    const sourceEntity = await this.entityRepository.findById(apiKeyId, sourceId);
    if (sourceEntity) {
      nodes.unshift({
        id: sourceEntity.id,
        type: sourceEntity.type,
        name: sourceEntity.name,
        properties: sourceEntity.properties,
      });
    }

    return { nodes, edges };
  }

  /**
   * 去重边
   */
  private deduplicateEdges(edges: GraphEdge[]): GraphEdge[] {
    const seen = new Set<string>();
    return edges.filter((edge) => {
      if (seen.has(edge.id)) return false;
      seen.add(edge.id);
      return true;
    });
  }
}
