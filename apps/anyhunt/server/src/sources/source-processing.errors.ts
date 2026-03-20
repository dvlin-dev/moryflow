import { BadRequestException } from '@nestjs/common';

export const SOURCE_PROCESSING_CONFLICT_CODE = 'SOURCE_PROCESSING_CONFLICT';
export const SOURCE_REVISION_PROCESSING_CONFLICT_CODE =
  'SOURCE_REVISION_PROCESSING_CONFLICT';

export const createSourceProcessingConflictError = (): BadRequestException =>
  new BadRequestException({
    message: 'Knowledge source is processing',
    code: SOURCE_PROCESSING_CONFLICT_CODE,
  });

export const createSourceRevisionProcessingConflictError =
  (): BadRequestException =>
    new BadRequestException({
      message: 'Knowledge source revision is processing',
      code: SOURCE_REVISION_PROCESSING_CONFLICT_CODE,
    });

export const isSourceProcessingConflictError = (error: unknown): boolean => {
  if (!(error instanceof BadRequestException)) {
    return false;
  }

  const response = error.getResponse();
  if (!response || typeof response !== 'object') {
    return false;
  }

  const code =
    'code' in response && typeof response.code === 'string'
      ? response.code
      : null;

  return (
    code === SOURCE_PROCESSING_CONFLICT_CODE ||
    code === SOURCE_REVISION_PROCESSING_CONFLICT_CODE
  );
};
