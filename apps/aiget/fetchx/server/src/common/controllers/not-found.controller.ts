import { Controller, All, Req, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Fallback controller to catch all unmatched routes.
 * This ensures that 404 errors are handled by our HttpExceptionFilter
 * and return a unified response format.
 *
 * NOTE: This controller must be registered LAST in AppModule imports
 * to ensure other routes are matched first.
 */
@Controller()
export class NotFoundController {
  @All('*path')
  handleNotFound(@Req() req: Request): never {
    throw new NotFoundException(`Cannot ${req.method} ${req.path}`);
  }
}
