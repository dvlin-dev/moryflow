import { describe, expect, it } from 'vitest';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { QueueModule } from '../../queue';
import { MemoxPlatformModule } from '../../memox-platform';
import { ApiKeyCleanupProcessor } from '../api-key-cleanup.processor';
import { ApiKeyCleanupService } from '../api-key-cleanup.service';
import { ApiKeyModule } from '../api-key.module';

function importsContainModule(imports: unknown[], target: unknown): boolean {
  return imports.some((entry) => {
    if (entry === target) {
      return true;
    }

    if (
      entry &&
      typeof entry === 'object' &&
      'forwardRef' in entry &&
      typeof (entry as { forwardRef?: unknown }).forwardRef === 'function'
    ) {
      return (entry as { forwardRef: () => unknown }).forwardRef() === target;
    }

    return false;
  });
}

describe('ApiKeyModule', () => {
  it('registers cleanup worker dependencies and providers', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ApiKeyModule) ?? [];
    const providers =
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ApiKeyModule) ?? [];

    expect(importsContainModule(imports, QueueModule)).toBe(true);
    expect(importsContainModule(imports, MemoxPlatformModule)).toBe(true);
    expect(providers).toContain(ApiKeyCleanupService);
    expect(providers).toContain(ApiKeyCleanupProcessor);
  });
});
