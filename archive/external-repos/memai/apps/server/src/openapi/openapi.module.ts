/**
 * OpenAPI module for Scalar API Reference
 *
 * [PROVIDES]: OpenApiService for document configuration
 * [POS]: Imported by AppModule
 */
import { Module } from '@nestjs/common';
import { OpenApiService } from './openapi.service';

@Module({
  providers: [OpenApiService],
  exports: [OpenApiService],
})
export class OpenApiModule {}
