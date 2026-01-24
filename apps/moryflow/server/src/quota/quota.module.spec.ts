import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { AuthModule } from '../auth';
import { QuotaModule } from './quota.module';

describe('QuotaModule', () => {
  it('imports AuthModule for AuthGuard dependencies', () => {
    const imports =
      (Reflect.getMetadata('imports', QuotaModule) as unknown[]) ?? [];

    expect(imports).toContain(AuthModule);
  });
});
