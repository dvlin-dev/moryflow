import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getChatDebugLogPath,
  initializeChatDebugLogging,
  isChatDebugEnabled,
  logChatDebug,
  shutdownChatDebugLogging,
} from '../chat-debug-log.js';

const createdDirectories: string[] = [];

const createTempLogsDirectory = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'moryflow-chat-debug-'));
  createdDirectories.push(directory);
  return directory;
};

afterEach(() => {
  shutdownChatDebugLogging();
  vi.restoreAllMocks();
  for (const directory of createdDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

const waitForLogFlush = async (ms = 20) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

describe('chat-debug-log', () => {
  it('initializes and truncates log file on startup', () => {
    const logsDirectory = createTempLogsDirectory();
    const targetPath = path.join(logsDirectory, 'chat-stream.log');
    fs.writeFileSync(targetPath, 'legacy-content\n', 'utf8');

    const initializedPath = initializeChatDebugLogging(logsDirectory);

    expect(initializedPath).toBe(targetPath);
    expect(getChatDebugLogPath()).toBe(targetPath);
    expect(fs.readFileSync(targetPath, 'utf8')).toBe('');
  });

  it('writes JSONL entries after initialization', async () => {
    const logsDirectory = createTempLogsDirectory();
    const targetPath = initializeChatDebugLogging(logsDirectory);
    expect(targetPath).not.toBeNull();

    logChatDebug('chat.stream.summary', { foo: 'bar' });
    logChatDebug('chat.run.turn.completed');
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
    expect(isChatDebugEnabled()).toBe(true);
  });

  it('falls back to console-only logging when file logger initialization fails', async () => {
    const logsDirectory = createTempLogsDirectory();
    const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
      throw new Error('permission denied');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const initializedPath = initializeChatDebugLogging(logsDirectory);
    expect(initializedPath).toBeNull();
    expect(getChatDebugLogPath()).toBeNull();

    logChatDebug('chat.stream.summary', { fallback: true });
    await waitForLogFlush();

    expect(mkdirSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      '[chat-debug] failed to initialize file logger',
      expect.any(Error)
    );
    expect(logSpy).toHaveBeenCalledWith(
      '[chat-debug]',
      expect.stringContaining('"stage":"chat.stream.summary"')
    );
  });

  it('drops oldest log lines when file exceeds max size', async () => {
    const logsDirectory = createTempLogsDirectory();
    const targetPath = initializeChatDebugLogging(logsDirectory, {
      maxBytes: 1024,
      trimToBytes: 640,
    });
    expect(targetPath).not.toBeNull();

    for (let index = 0; index < 80; index += 1) {
      logChatDebug('chat.stream.event.received', {
        index,
        message: 'x'.repeat(80),
      });
    }

    await waitForLogFlush(120);
    shutdownChatDebugLogging();

    const content = fs.readFileSync(targetPath as string, 'utf8');
    const size = Buffer.byteLength(content, 'utf8');
    expect(size).toBeLessThanOrEqual(1024);

    const lines = content
      .trim()
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as { payload: { index?: number } | null });

    expect(lines.length).toBeGreaterThan(0);
    const firstIndex = lines[0]?.payload?.index ?? -1;
    const lastIndex = lines.at(-1)?.payload?.index ?? -1;

    expect(firstIndex).toBeGreaterThan(0);
    expect(lastIndex).toBe(79);
  });
});
