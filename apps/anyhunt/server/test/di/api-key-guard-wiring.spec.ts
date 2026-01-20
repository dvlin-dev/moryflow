/**
 * [INPUT]: Module class metadata (no app bootstrap)
 * [OUTPUT]: Assert BrowserModule/AgentModule import ApiKeyModule
 * [POS]: 回归测试：防止新增/迁移 ApiKeyGuard 后漏导入 ApiKeyModule，导致线上 Nest 启动失败
 */

import { describe, expect, it } from 'vitest';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ApiKeyModule } from '../../src/api-key/api-key.module';
import { BrowserModule } from '../../src/browser/browser.module';
import { AgentModule } from '../../src/agent/agent.module';

function getImports(moduleClass: unknown): unknown[] {
  return (
    (Reflect.getMetadata(MODULE_METADATA.IMPORTS, moduleClass) as unknown[]) ??
    []
  );
}

describe('ApiKeyGuard wiring', () => {
  it('BrowserModule imports ApiKeyModule', () => {
    expect(getImports(BrowserModule)).toContain(ApiKeyModule);
  });

  it('AgentModule imports ApiKeyModule', () => {
    expect(getImports(AgentModule)).toContain(ApiKeyModule);
  });
});
