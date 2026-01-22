import { describe, it, expect, vi } from 'vitest';
import { handleRequest } from '../../publish-worker/src/handler';

declare global {
  interface R2Bucket {
    get(key: string): Promise<{
      body: ReadableStream<Uint8Array>;
      text(): Promise<string>;
      json(): Promise<unknown>;
    } | null>;
  }
}

const encoder = new TextEncoder();

const createBucket = (objects: Record<string, string>) => ({
  get: vi.fn((key: string) => {
    const value = objects[key];
    if (value === undefined) {
      return Promise.resolve(null);
    }

    return Promise.resolve({
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(value));
          controller.close();
        },
      }),
      text: () => Promise.resolve(value),
      json: () => Promise.resolve(JSON.parse(value) as unknown),
    });
  }),
});

const createEnv = (objects: Record<string, string>) => ({
  SITE_DOMAIN: 'moryflow.app',
  SITE_BUCKET: createBucket(objects) as R2Bucket,
});

describe('publish-worker handler', () => {
  it('rejects non-GET/HEAD requests', async () => {
    const env = createEnv({});
    const response = await handleRequest(
      new Request('https://test.moryflow.app/', { method: 'POST' }),
      env,
    );

    expect(response.status).toBe(405);
    expect(response.headers.get('Allow')).toBe('GET, HEAD');
  });

  it('returns offline page when meta is invalid', async () => {
    const env = createEnv({
      'sites/test/_meta.json': '{',
    });

    const response = await handleRequest(
      new Request('https://test.moryflow.app/'),
      env,
    );

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe(
      'no-store, must-revalidate',
    );
  });

  it('returns offline page when pathname decoding fails', async () => {
    const env = createEnv({
      'sites/test/_meta.json': JSON.stringify({ status: 'ACTIVE' }),
    });

    const response = await handleRequest(
      new Request('https://test.moryflow.app/%E0%A4%A'),
      env,
    );

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe(
      'no-store, must-revalidate',
    );
  });

  it('returns headers for HEAD without body', async () => {
    const env = createEnv({
      'sites/test/_meta.json': JSON.stringify({ status: 'ACTIVE' }),
      'sites/test/index.html': '<html>ok</html>',
    });

    const response = await handleRequest(
      new Request('https://test.moryflow.app/', { method: 'HEAD' }),
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
  });
});
