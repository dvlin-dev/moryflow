import { Module } from '@nestjs/common';
import { NotFoundController } from '../common/controllers';

/**
 * Module for handling 404 Not Found errors.
 * This module should be imported LAST in AppModule to ensure
 * the wildcard route catches only unmatched requests.
 */
@Module({
  controllers: [NotFoundController],
})
export class NotFoundModule {}
