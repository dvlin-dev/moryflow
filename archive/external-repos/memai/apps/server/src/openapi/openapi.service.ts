/**
 * OpenAPI document builder service
 *
 * [PROVIDES]: buildPublicConfig(), buildInternalConfig()
 * [POS]: Used by main.ts to configure Swagger/Scalar
 */
import { Injectable } from '@nestjs/common';
import { DocumentBuilder } from '@nestjs/swagger';

@Injectable()
export class OpenApiService {
  /**
   * Public API configuration
   * Only includes v1 API endpoints for external users
   */
  buildPublicConfig() {
    return new DocumentBuilder()
      .setTitle('Memai API')
      .setDescription('Memory as a Service - AI-Powered Memory Management')
      .setVersion('1.0.0')
      .setContact('Memai', 'https://memai.dev', 'support@memai.dev')
      .addApiKey(
        { type: 'apiKey', name: 'X-API-Key', in: 'header' },
        'apiKey',
      )
      .addTag('Memory', 'Memory CRUD operations')
      .addTag('Entity', 'Entity management')
      .addTag('Relation', 'Relationship management')
      .addTag('Graph', 'Knowledge graph operations')
      .addTag('Extract', 'NLP entity extraction')
      .build();
  }

  /**
   * Internal API configuration
   * Includes all endpoints (dev environment only)
   */
  buildInternalConfig() {
    return new DocumentBuilder()
      .setTitle('Memai API (Internal)')
      .setDescription('Memory as a Service - Full API Reference')
      .setVersion('1.0.0')
      .setContact('Memai', 'https://memai.dev', 'support@memai.dev')
      .addApiKey(
        { type: 'apiKey', name: 'X-API-Key', in: 'header' },
        'apiKey',
      )
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'bearer',
      )
      .addCookieAuth('better-auth.session_token', {
        type: 'apiKey',
        in: 'cookie',
      })
      .addTag('Memory', 'Memory CRUD operations')
      .addTag('Entity', 'Entity management')
      .addTag('Relation', 'Relationship management')
      .addTag('Graph', 'Knowledge graph operations')
      .addTag('Extract', 'NLP entity extraction')
      .addTag('ApiKey', 'API key management')
      .addTag('Webhook', 'Webhook management')
      .addTag('User', 'User profile management')
      .addTag('Health', 'Health check endpoints')
      .addTag('Admin', 'Admin operations')
      .addTag('Payment', 'Payment operations')
      .build();
  }
}
