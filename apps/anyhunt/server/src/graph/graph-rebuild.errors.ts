import { ConflictException } from '@nestjs/common';

export const GRAPH_SCOPE_REBUILD_CONFLICT_CODE = 'GRAPH_SCOPE_REBUILD_CONFLICT';

export const createGraphScopeRebuildConflictError = (): ConflictException =>
  new ConflictException({
    message: 'Graph scope rebuild is already starting',
    code: GRAPH_SCOPE_REBUILD_CONFLICT_CODE,
  });
