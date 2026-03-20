import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

export const GRAPH_SCOPE_REQUIRED_CODE = 'GRAPH_SCOPE_REQUIRED';
export const GRAPH_SCOPE_NOT_FOUND_CODE = 'GRAPH_SCOPE_NOT_FOUND';

export type GraphScopeAccessMode = 'read' | 'write';

export const createGraphScopeRequiredError = (
  mode: GraphScopeAccessMode,
): UnprocessableEntityException =>
  new UnprocessableEntityException({
    code: GRAPH_SCOPE_REQUIRED_CODE,
    message:
      mode === 'write'
        ? 'project_id is required for graph writes'
        : 'project_id is required for graph access',
  });

export const createGraphScopeNotFoundError = (): NotFoundException =>
  new NotFoundException({
    code: GRAPH_SCOPE_NOT_FOUND_CODE,
    message: 'Graph scope not found',
  });
