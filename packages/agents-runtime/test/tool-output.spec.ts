import { describe, it, expect, vi } from 'vitest';
import {
  createToolOutputPostProcessor,
  isTruncatedToolOutput,
  type ToolOutputStorage,
  type ToolOutputTruncationConfig,
} from '../src/tool-output';

const createStorage = () => {
  const storage: ToolOutputStorage = {
    write: vi.fn(async () => ({ fullPath: '/tmp/tool-output.txt' })),
    cleanup: vi.fn(async () => undefined),
  };
  return storage;
};

const createProcessor = (config: ToolOutputTruncationConfig, storage: ToolOutputStorage) =>
  createToolOutputPostProcessor({
    config,
    storage,
    buildHint: ({ fullPath }) => `Saved at ${fullPath}`,
  });

describe('createToolOutputPostProcessor', () => {
  it('returns original output when under limits', async () => {
    const storage = createStorage();
    const processor = createProcessor({ maxLines: 10, maxBytes: 1024, ttlDays: 7 }, storage);
    const output = { ok: true };

    const result = await processor(output);

    expect(result).toBe(output);
    expect(storage.write).not.toHaveBeenCalled();
    expect(storage.cleanup).not.toHaveBeenCalled();
  });

  it('truncates by line count and persists full output', async () => {
    const storage = createStorage();
    const processor = createProcessor({ maxLines: 2, maxBytes: 1024, ttlDays: 7 }, storage);
    const output = 'line-1\nline-2\nline-3';

    const result = await processor(output, { toolName: 'read' });

    expect(isTruncatedToolOutput(result)).toBe(true);
    if (isTruncatedToolOutput(result)) {
      expect(result.preview).toBe('line-1\nline-2');
      expect(result.fullPath).toBe('/tmp/tool-output.txt');
      expect(result.hint).toBe('Saved at /tmp/tool-output.txt');
    }
    expect(storage.write).toHaveBeenCalledWith(
      expect.objectContaining({ content: output, toolName: 'read' })
    );
    expect(storage.cleanup).toHaveBeenCalled();
  });

  it('truncates by byte limit even when line count is within limit', async () => {
    const storage = createStorage();
    const processor = createProcessor({ maxLines: 10, maxBytes: 5, ttlDays: 7 }, storage);
    const output = 'abcdefghij';

    const result = await processor(output);

    expect(isTruncatedToolOutput(result)).toBe(true);
    if (isTruncatedToolOutput(result)) {
      expect(result.preview).toBe('abcde');
    }
  });

  it('passes through existing truncated output', async () => {
    const storage = createStorage();
    const processor = createProcessor({ maxLines: 10, maxBytes: 10, ttlDays: 7 }, storage);
    const output = {
      kind: 'truncated_output',
      truncated: true,
      preview: 'preview',
      fullPath: '/tmp/tool-output.txt',
      hint: 'Saved at /tmp/tool-output.txt',
      metadata: { lines: 1, bytes: 1, maxLines: 10, maxBytes: 10 },
    };

    const result = await processor(output);

    expect(result).toBe(output);
    expect(storage.write).not.toHaveBeenCalled();
  });
});
