import { ConflictException } from '@nestjs/common';

export const DOCUMENT_WORKSPACE_MISMATCH_ERROR_CODE =
  'DOCUMENT_WORKSPACE_MISMATCH';
export const DOCUMENT_WORKSPACE_MISMATCH_MESSAGE =
  'Document does not belong to current workspace';

export const createDocumentWorkspaceMismatchConflict = (): ConflictException =>
  new ConflictException({
    code: DOCUMENT_WORKSPACE_MISMATCH_ERROR_CODE,
    message: DOCUMENT_WORKSPACE_MISMATCH_MESSAGE,
  });
