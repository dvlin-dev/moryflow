import { describe, expect, it, vi } from 'vitest';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { VectorPrismaService } from '../../vector-prisma';
import { GraphScopeService } from '../graph-scope.service';
import {
  GRAPH_SCOPE_NOT_FOUND_CODE,
  GRAPH_SCOPE_REQUIRED_CODE,
} from '../graph-scope.types';

describe('GraphScopeService', () => {
  it('requires project_id for graph reads', async () => {
    const vectorPrisma = {
      graphScope: {
        findUnique: vi.fn(),
      },
    } as unknown as VectorPrismaService;
    const service = new GraphScopeService(vectorPrisma);

    await expect(service.requireScope('api-key-1')).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    await expect(service.requireScope('api-key-1')).rejects.toMatchObject({
      response: {
        code: GRAPH_SCOPE_REQUIRED_CODE,
      },
    });
  });

  it('throws typed not-found error when graph scope does not exist', async () => {
    const vectorPrisma = {
      graphScope: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as VectorPrismaService;
    const service = new GraphScopeService(vectorPrisma);

    await expect(
      service.requireScope('api-key-1', 'project-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.requireScope('api-key-1', 'project-1'),
    ).rejects.toMatchObject({
      response: {
        code: GRAPH_SCOPE_NOT_FOUND_CODE,
      },
    });
  });

  it('materializes graph scope for graph writes', async () => {
    const vectorPrisma = {
      graphScope: {
        upsert: vi.fn().mockResolvedValue({
          id: 'graph-scope-1',
          apiKeyId: 'api-key-1',
          projectId: 'project-1',
          status: 'ACTIVE',
          projectionStatus: 'IDLE',
        }),
      },
    } as unknown as VectorPrismaService;
    const service = new GraphScopeService(vectorPrisma);

    await expect(
      service.ensureScope('api-key-1', 'project-1'),
    ).resolves.toMatchObject({
      id: 'graph-scope-1',
      projectId: 'project-1',
    });
    expect(vectorPrisma.graphScope.upsert).toHaveBeenCalledWith({
      where: {
        apiKeyId_projectId: {
          apiKeyId: 'api-key-1',
          projectId: 'project-1',
        },
      },
      update: {
        status: 'ACTIVE',
      },
      create: {
        apiKeyId: 'api-key-1',
        projectId: 'project-1',
        status: 'ACTIVE',
        projectionStatus: 'IDLE',
      },
    });
  });
});
