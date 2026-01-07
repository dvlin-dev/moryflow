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
      .setTitle('Memox API')
      .setDescription('Memory as a Service - AI-Powered Memory Management')
      .setVersion('1.0.0')
      .setContact('Memox', 'https://aiget.dev', 'support@aiget.dev')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'APIKey' },
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
      .setTitle('Memox API (Internal)')
      .setDescription('Memory as a Service - Full API Reference')
      .setVersion('1.0.0')
      .setContact('Memox', 'https://aiget.dev', 'support@aiget.dev')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'APIKey' },
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
