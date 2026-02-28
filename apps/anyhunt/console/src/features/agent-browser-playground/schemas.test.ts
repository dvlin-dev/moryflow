import { describe, it, expect } from 'vitest';
import {
  browserActionBatchSchema,
  browserCdpSchema,
  browserHeadersSchema,
  browserStreamSchema,
} from './schemas';

describe('agent-browser-playground schemas', () => {
  it('validates action batch JSON array', () => {
    const ok = browserActionBatchSchema.safeParse({
      actionsJson: '[{"type":"click","selector":"@e1"}]',
      stopOnError: true,
    });
    expect(ok.success).toBe(true);

    const bad = browserActionBatchSchema.safeParse({
      actionsJson: '{"type":"click"}',
      stopOnError: true,
    });
    expect(bad.success).toBe(false);
  });

  it('validates headers JSON object', () => {
    const ok = browserHeadersSchema.safeParse({
      origin: 'https://example.com',
      headersJson: '{"x-debug":"1"}',
      clearGlobal: false,
    });
    expect(ok.success).toBe(true);

    const bad = browserHeadersSchema.safeParse({
      origin: '',
      headersJson: '[]',
      clearGlobal: false,
    });
    expect(bad.success).toBe(false);
  });

  it('enforces stream token TTL bounds', () => {
    const ok = browserStreamSchema.safeParse({ expiresIn: 300 });
    expect(ok.success).toBe(true);

    const bad = browserStreamSchema.safeParse({ expiresIn: 10 });
    expect(bad.success).toBe(false);
  });

  it('requires wsEndpoint or port for CDP connect', () => {
    const okWithEndpoint = browserCdpSchema.safeParse({
      wsEndpoint: 'ws://localhost:9222/devtools/browser/abc',
      timeout: 30000,
    });
    expect(okWithEndpoint.success).toBe(true);

    const okWithPort = browserCdpSchema.safeParse({
      port: 9222,
      timeout: 30000,
    });
    expect(okWithPort.success).toBe(true);

    const bad = browserCdpSchema.safeParse({ timeout: 30000 });
    expect(bad.success).toBe(false);
  });
});
