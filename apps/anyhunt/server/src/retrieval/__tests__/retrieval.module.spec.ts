import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { ApiKeyModule } from '../../api-key';
import { RetrievalModule } from '../retrieval.module';

describe('RetrievalModule', () => {
  it('imports ApiKeyModule for public ApiKeyGuard routes', () => {
    const imports = Reflect.getMetadata('imports', RetrievalModule) ?? [];

    expect(imports).toContain(ApiKeyModule);
  });
});
