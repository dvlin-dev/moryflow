import { describe, expect, it } from 'vitest';
import { isOpenApiRoutePath } from '../openapi-paths';

describe('isOpenApiRoutePath', () => {
  it('should match public docs path', () => {
    expect(isOpenApiRoutePath('/api-reference')).toBe(true);
    expect(isOpenApiRoutePath('/api-reference/')).toBe(true);
  });

  it('should match internal docs path', () => {
    expect(isOpenApiRoutePath('/api-reference/internal')).toBe(true);
    expect(isOpenApiRoutePath('/api-reference/internal/')).toBe(true);
  });

  it('should match openapi json paths', () => {
    expect(isOpenApiRoutePath('/openapi.json')).toBe(true);
    expect(isOpenApiRoutePath('/openapi-internal.json')).toBe(true);
  });

  it('should not match non-openapi paths', () => {
    expect(isOpenApiRoutePath('/api/v1/auth/refresh')).toBe(false);
    expect(isOpenApiRoutePath('/health')).toBe(false);
    expect(isOpenApiRoutePath('/')).toBe(false);
  });
});
