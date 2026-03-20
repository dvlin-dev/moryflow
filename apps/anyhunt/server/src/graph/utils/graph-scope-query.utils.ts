import { BadRequestException } from '@nestjs/common';
import { ZodError } from 'zod';
import { GraphScopeSchema, type GraphQueryInputDto } from '../dto/graph.schema';

const getLastQueryValue = (value: unknown): unknown => {
  if (!Array.isArray(value)) {
    return value;
  }

  const values = value as unknown[];
  return values.length > 0 ? values[values.length - 1] : undefined;
};

export const parseGraphScopeQuery = (
  query: Record<string, unknown>,
): GraphQueryInputDto['scope'] => {
  const normalized = {
    project_id: getLastQueryValue(query.project_id),
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
