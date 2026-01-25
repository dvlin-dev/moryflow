import { describe, it, expect, vi, afterEach } from 'vitest';
import type { SessionManager } from '../session';

const loadHandler = async () => {
  const module = await import('../handlers/action.handler');
  return module.ActionHandler;
};

const createHandler = async () => {
  const ActionHandler = await loadHandler();
  return new ActionHandler({} as SessionManager);
};

describe('ActionHandler', () => {
  const originalUploadMax = process.env.BROWSER_UPLOAD_MAX_MB;

  afterEach(() => {
    if (originalUploadMax === undefined) {
      delete process.env.BROWSER_UPLOAD_MAX_MB;
    } else {
      process.env.BROWSER_UPLOAD_MAX_MB = originalUploadMax;
    }
    vi.resetModules();
  });

  it('sanitizes upload filenames', async () => {
    vi.resetModules();
    const handler = await createHandler();
    expect((handler as any).sanitizeFilename('../secret.txt')).toBe(
      'secret.txt',
    );
  });

  it('builds upload payloads with base64 content', async () => {
    vi.resetModules();
    const handler = await createHandler();
    const payloads = (handler as any).buildUploadPayloads({
      name: '../hello.txt',
      mimeType: 'text/plain',
      dataBase64: Buffer.from('hello').toString('base64'),
    }) as Array<{ name: string; mimeType?: string; buffer: Buffer }>;
    expect(payloads).toHaveLength(1);
    expect(payloads[0].name).toBe('hello.txt');
    expect(payloads[0].mimeType).toBe('text/plain');
    expect(payloads[0].buffer.toString()).toBe('hello');
  });

  it('rejects oversized upload payloads', async () => {
    process.env.BROWSER_UPLOAD_MAX_MB = '1';
    vi.resetModules();
    const handler = await createHandler();
    const largeBuffer = Buffer.alloc(1024 * 1024 + 1, 'a');
    const payload = {
      name: 'big.bin',
      dataBase64: largeBuffer.toString('base64'),
    };
    expect(() => (handler as any).buildUploadPayloads(payload)).toThrow(
      'Upload file too large',
    );
  });
});
