import { Injectable } from '@nestjs/common';
import type { GraphScope } from '../../generated/prisma-vector/client';
import { VectorPrismaService } from '../vector-prisma';
import {
  createGraphScopeNotFoundError,
  createGraphScopeRequiredError,
} from './graph-scope.types';

const DEFAULT_GRAPH_PROJECTION_FAILED_CODE = 'GRAPH_PROJECTION_FAILED';
const DEFAULT_GRAPH_PROJECTION_FAILED_MESSAGE =
  'Graph projection failed for one or more memory facts';

@Injectable()
export class GraphScopeService {
  constructor(private readonly vectorPrisma: VectorPrismaService) {}

  async getScope(
    apiKeyId: string,
    projectId: string,
  ): Promise<GraphScope | null> {
    return this.vectorPrisma.graphScope.findUnique({
      where: {
        apiKeyId_projectId: {
          apiKeyId,
          projectId,
        },
      },
    });
  }

  async requireScope(
    apiKeyId: string,
    projectId?: string,
  ): Promise<GraphScope> {
    if (!projectId?.trim()) {
      throw createGraphScopeRequiredError('read');
    }

    const scope = await this.getScope(apiKeyId, projectId);
    if (!scope) {
      throw createGraphScopeNotFoundError();
    }

    return scope;
  }

  async ensureScope(apiKeyId: string, projectId?: string): Promise<GraphScope> {
    if (!projectId?.trim()) {
      throw createGraphScopeRequiredError('write');
    }

    return this.vectorPrisma.graphScope.upsert({
      where: {
        apiKeyId_projectId: {
          apiKeyId,
          projectId,
        },
      },
      update: {
        status: 'ACTIVE',
      },
      create: {
        apiKeyId,
        projectId,
        status: 'ACTIVE',
        projectionStatus: 'IDLE',
      },
    });
  }

  async markProjectionQueued(graphScopeId: string): Promise<void> {
    await this.vectorPrisma.graphScope.update({
      where: { id: graphScopeId },
      data: {
        projectionStatus: 'BUILDING',
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
  }

  async markProjectionFailed(
    graphScopeId: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    await this.vectorPrisma.graphScope.update({
      where: { id: graphScopeId },
      data: {
        projectionStatus: 'FAILED',
        lastErrorCode: errorCode,
        lastErrorMessage: errorMessage,
      },
    });
  }

  async reconcileProjectionState(
    graphScopeId: string,
    options?: { touchProjectedAt?: boolean },
  ): Promise<void> {
    const [pendingCount, failedFact, observationCount] = await Promise.all([
      this.vectorPrisma.memoryFact.count({
        where: {
          graphScopeId,
          graphProjectionState: 'PENDING',
        },
      }),
      this.vectorPrisma.memoryFact.findFirst({
        where: {
          graphScopeId,
          graphProjectionState: 'FAILED',
        },
        orderBy: { updatedAt: 'desc' },
        select: {
          graphProjectionErrorCode: true,
        },
      }),
      this.vectorPrisma.graphObservation.count({
        where: { graphScopeId },
      }),
    ]);

    if (pendingCount > 0) {
      await this.markProjectionQueued(graphScopeId);
      return;
    }

    if (failedFact) {
      await this.markProjectionFailed(
        graphScopeId,
        failedFact.graphProjectionErrorCode ??
          DEFAULT_GRAPH_PROJECTION_FAILED_CODE,
        DEFAULT_GRAPH_PROJECTION_FAILED_MESSAGE,
      );
      return;
    }

    await this.vectorPrisma.graphScope.update({
      where: { id: graphScopeId },
      data: {
        projectionStatus: observationCount > 0 ? 'READY' : 'IDLE',
        lastProjectedAt: options?.touchProjectedAt ? new Date() : undefined,
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
  }
}
