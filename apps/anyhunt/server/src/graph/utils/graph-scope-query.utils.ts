import { BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';
import { GraphScopeSchema, type GraphQueryInputDto } from '../dto/graph.schema';

export const parseGraphScopeQuery = (
  query: Record<string, unknown>,
): GraphQueryInputDto['scope'] => {
  const normalized = {
    project_id: Array.isArray(query.project_id)
      ? query.project_id[query.project_id.length - 1]
      : query.project_id,
  };

  try {
    return GraphScopeSchema.parse(normalized);
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.issues.map((issue) => {
        const path = issue.path.join('.');
        return path ? `${path}: ${issue.message}` : issue.message;
      });
      throw new BadRequestException({
        code: 'GRAPH_SCOPE_INVALID',
        message: 'Validation failed',
        errors,
      });
    }
    throw error;
  }
};
