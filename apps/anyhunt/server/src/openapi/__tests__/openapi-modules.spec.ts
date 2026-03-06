import { describe, expect, it } from 'vitest';
import { SourcesModule } from '../../sources';
import { PUBLIC_API_MODULES } from '../openapi-modules';

describe('PUBLIC_API_MODULES', () => {
  it('includes SourcesModule in the public OpenAPI registry', () => {
    expect(PUBLIC_API_MODULES).toContain(SourcesModule);
  });
});
