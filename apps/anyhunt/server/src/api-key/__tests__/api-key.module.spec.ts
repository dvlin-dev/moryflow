import { describe, expect, it } from 'vitest';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { QueueModule } from '../../queue';
import { SourcesModule } from '../../sources';
import { ApiKeyCleanupProcessor } from '../api-key-cleanup.processor';
import { ApiKeyCleanupService } from '../api-key-cleanup.service';
import { ApiKeyModule } from '../api-key.module';

describe('ApiKeyModule', () => {
  it('registers cleanup worker dependencies and providers', () => {
    const imports =
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, ApiKeyModule) ?? [];
    const providers =
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ApiKeyModule) ?? [];

    expect(imports).toContain(QueueModule);
    expect(imports).toContain(SourcesModule);
    expect(providers).toContain(ApiKeyCleanupService);
    expect(providers).toContain(ApiKeyCleanupProcessor);
  });
});
