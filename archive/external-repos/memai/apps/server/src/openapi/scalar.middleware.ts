/**
 * Scalar API Reference middleware factory
 *
 * [PROVIDES]: createScalarMiddleware - Express middleware for Scalar UI
 * [DEPENDS]: @scalar/nestjs-api-reference
 */
import { apiReference } from '@scalar/nestjs-api-reference';
import { SCALAR_CONFIG, AUTH_CONFIG } from './openapi.constants';

export function createScalarMiddleware(options: {
  openApiJsonUrl: string;
  proxyUrl?: string;
}) {
  return apiReference({
    url: options.openApiJsonUrl,
    theme: SCALAR_CONFIG.THEME,
    authentication: AUTH_CONFIG,
    persistAuth: true,
    defaultHttpClient: SCALAR_CONFIG.DEFAULT_HTTP_CLIENT,
    hiddenClients: SCALAR_CONFIG.HIDDEN_CLIENTS,
    ...(options.proxyUrl && { proxyUrl: options.proxyUrl }),
    metaData: {
      title: 'Memai API Reference',
      description: 'Interactive API documentation for Memai',
    },
  });
}
