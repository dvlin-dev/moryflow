import { describe, expect, it } from 'vitest';
import { OpenApiService } from '../openapi.service';

describe('OpenApiService', () => {
  it('builds sale-grade public metadata for developer API', () => {
    const service = new OpenApiService();
    const config = service.buildPublicConfig();

    expect(config.info.title).toBe('Anyhunt API');
    expect(config.info.contact).toEqual({
      name: 'Anyhunt Support',
      url: 'https://anyhunt.app',
      email: 'support@anyhunt.app',
    });
    expect(config.externalDocs).toEqual({
      description: 'Anyhunt developer docs',
      url: 'https://docs.anyhunt.app',
    });
    expect(config.servers).toEqual([
      { url: 'https://server.anyhunt.app', description: 'Production' },
      { url: 'http://localhost:3000', description: 'Local development' },
    ]);
    expect(config.components?.securitySchemes).toMatchObject({
      apiKey: expect.any(Object),
      bearer: expect.any(Object),
      session: expect.any(Object),
    });
  });
});
