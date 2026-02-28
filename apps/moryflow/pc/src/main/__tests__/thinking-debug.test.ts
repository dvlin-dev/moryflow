import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getThinkingDebugLogPath,
  initializeThinkingDebugLogging,
  isThinkingDebugEnabled,
  logThinkingDebug,
  shutdownThinkingDebugLogging,
} from '../thinking-debug.js';

const createdDirectories: string[] = [];

const createTempLogsDirectory = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'moryflow-thinking-debug-'));
  createdDirectories.push(directory);
  return directory;
};

afterEach(() => {
  shutdownThinkingDebugLogging();
  vi.restoreAllMocks();
  for (const directory of createdDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

const waitForLogFlush = async () => {
  await new Promise((resolve) => setTimeout(resolve, 20));
};

describe('thinking-debug', () => {
  it('initializes and truncates log file on startup', () => {
    const logsDirectory = createTempLogsDirectory();
    const targetPath = path.join(logsDirectory, 'thinking-debug.log');
    fs.writeFileSync(targetPath, 'legacy-content\n', 'utf8');

    const initializedPath = initializeThinkingDebugLogging(logsDirectory);

    expect(initializedPath).toBe(targetPath);
    expect(getThinkingDebugLogPath()).toBe(targetPath);
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('');
  });

  it('writes JSONL entries after initialization', async () => {
    const logsDirectory = createTempLogsDirectory();
    const targetPath = initializeThinkingDebugLogging(logsDirectory);
    expect(targetPath).not.toBeNull();

    logThinkingDebug('chat.stream.summary', { foo: 'bar' });
    logThinkingDebug('chat.run.turn.completed');
    await waitForLogFlush();

    const lines = fs
      .readFileSync(targetPath as string, 'utf8')
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as { stage: string; payload: unknown; timestamp: string });

    expect(lines).toHaveLength(2);
    expect(lines[0]?.stage).toBe('chat.stream.summary');
    expect(lines[0]?.payload).toEqual({ foo: 'bar' });
    expect(lines[1]?.stage).toBe('chat.run.turn.completed');
    expect(lines[1]?.payload).toBeNull();
    expect(typeof lines[0]?.timestamp).toBe('string');
    expect(isThinkingDebugEnabled()).toBe(true);
  });

  it('falls back to console-only logging when file logger initialization fails', async () => {
    const logsDirectory = createTempLogsDirectory();
    const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
      throw new Error('permission denied');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const initializedPath = initializeThinkingDebugLogging(logsDirectory);
    expect(initializedPath).toBeNull();
    expect(getThinkingDebugLogPath()).toBeNull();

    logThinkingDebug('chat.stream.summary', { fallback: true });
    await waitForLogFlush();

    expect(mkdirSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[thinking-debug] failed to initialize file logger',
      expect.any(Error)
    );
  });
});
