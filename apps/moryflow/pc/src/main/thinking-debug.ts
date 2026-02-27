/**
 * [PROVIDES]: thinking 调试日志初始化、路径查询与统一输出函数
 * [DEPENDS]: node:fs, node:path
 * [POS]: PC 主进程 thinking 链路排障辅助（请求/模型构建/流式事件）
 *
 * [PROTOCOL]: 本文件为长期排障基线能力，日志文件每次应用启动时清空
 */

import fs from 'node:fs';
import path from 'node:path';

const THINKING_DEBUG_LOG_FILENAME = 'thinking-debug.log';
let thinkingDebugLogPath: string | null = null;
let thinkingDebugStream: fs.WriteStream | null = null;

const closeThinkingDebugStream = () => {
  if (!thinkingDebugStream) {
    return;
  }
  thinkingDebugStream.end();
  thinkingDebugStream = null;
};

export const shutdownThinkingDebugLogging = () => {
  closeThinkingDebugStream();
  thinkingDebugLogPath = null;
};

const toJsonSafeValue = (value: unknown): unknown => {
  const seen = new WeakSet<object>();
  const replacer = (_key: string, current: unknown): unknown => {
    if (typeof current === 'bigint') {
      return current.toString();
    }
    if (current instanceof Error) {
      return {
        name: current.name,
        message: current.message,
        stack: current.stack,
      };
    }
    if (typeof current === 'object' && current !== null) {
      if (seen.has(current)) {
        return '[Circular]';
      }
      seen.add(current);
    }
    return current;
  };

  try {
    return JSON.parse(JSON.stringify(value, replacer));
  } catch {
    return '[Unserializable]';
  }
};

const appendLogLine = (line: string) => {
  if (!thinkingDebugStream || !thinkingDebugLogPath) {
    return;
  }
  thinkingDebugStream.write(`${line}\n`, 'utf8', (error) => {
    if (!error) {
      return;
    }
    console.warn('[thinking-debug] failed to append log line', error);
  });
};

export const initializeThinkingDebugLogging = (logsDirectory: string): string | null => {
  shutdownThinkingDebugLogging();

  try {
    const resolvedLogsDirectory = path.resolve(logsDirectory);
    fs.mkdirSync(resolvedLogsDirectory, { recursive: true });
    const targetPath = path.join(resolvedLogsDirectory, THINKING_DEBUG_LOG_FILENAME);
    const fileDescriptor = fs.openSync(targetPath, 'w');
    const stream = fs.createWriteStream(targetPath, {
      fd: fileDescriptor,
      autoClose: true,
      encoding: 'utf8',
    });
    stream.on('error', (error) => {
      console.warn('[thinking-debug] write stream error', error);
    });
    thinkingDebugStream = stream;
    thinkingDebugLogPath = targetPath;
    return targetPath;
  } catch (error) {
    console.warn('[thinking-debug] failed to initialize file logger', error);
    shutdownThinkingDebugLogging();
    return null;
  }
};

export const getThinkingDebugLogPath = (): string | null => thinkingDebugLogPath;

export const isThinkingDebugEnabled = (): boolean => true;

export const logThinkingDebug = (stage: string, payload?: unknown) => {
  const normalizedPayload = payload === undefined ? null : toJsonSafeValue(payload);
  const entry = {
    timestamp: new Date().toISOString(),
    stage,
    payload: normalizedPayload,
  };
  appendLogLine(JSON.stringify(entry));

  if (payload === undefined) {
    console.info(`[thinking-debug] ${stage}`);
    return;
  }
  console.info(`[thinking-debug] ${stage}`, normalizedPayload);
};
