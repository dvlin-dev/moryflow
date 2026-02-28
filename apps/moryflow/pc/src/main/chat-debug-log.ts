/**
 * [PROVIDES]: 对话流调试日志初始化、路径查询与统一输出函数
 * [DEPENDS]: node:fs, node:path
 * [POS]: PC 主进程对话链路排障辅助（请求/模型构建/流式事件）
 *
 * [PROTOCOL]: 本文件为长期排障基线能力，日志文件每次应用启动时清空
 */

import fs from 'node:fs';
import path from 'node:path';

const CHAT_DEBUG_LOG_FILENAME = 'chat-stream.log';
const DEFAULT_CHAT_DEBUG_LOG_MAX_BYTES = 4 * 1024 * 1024;
const DEFAULT_CHAT_DEBUG_LOG_TRIM_TO_BYTES = 3 * 1024 * 1024;

type ChatDebugLoggingOptions = {
  maxBytes?: number;
  trimToBytes?: number;
};

type ChatDebugRuntimeConfig = {
  maxBytes: number;
  trimToBytes: number;
};

let chatDebugLogPath: string | null = null;
let chatDebugStream: fs.WriteStream | null = null;
let chatDebugApproximateBytes = 0;
let chatDebugTrimInProgress = false;
let chatDebugPendingLines: string[] = [];
let chatDebugConfig: ChatDebugRuntimeConfig = {
  maxBytes: DEFAULT_CHAT_DEBUG_LOG_MAX_BYTES,
  trimToBytes: DEFAULT_CHAT_DEBUG_LOG_TRIM_TO_BYTES,
};

const normalizeByteSize = (value: number | undefined, fallback: number): number => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const normalized = Math.floor(value as number);
  if (normalized <= 0) {
    return fallback;
  }
  return normalized;
};

const resolveRuntimeConfig = (options?: ChatDebugLoggingOptions): ChatDebugRuntimeConfig => {
  const maxBytes = normalizeByteSize(options?.maxBytes, DEFAULT_CHAT_DEBUG_LOG_MAX_BYTES);
  const requestedTrimBytes = normalizeByteSize(
    options?.trimToBytes,
    DEFAULT_CHAT_DEBUG_LOG_TRIM_TO_BYTES
  );
  const trimToBytes = Math.min(requestedTrimBytes, maxBytes);
  return { maxBytes, trimToBytes };
};

const createChatDebugWriteStream = (targetPath: string, flags: 'w' | 'a'): fs.WriteStream => {
  const fileDescriptor = fs.openSync(targetPath, flags);
  let stream: fs.WriteStream;
  try {
    stream = fs.createWriteStream(targetPath, {
      fd: fileDescriptor,
      encoding: 'utf8',
      autoClose: true,
    });
  } catch (error) {
    fs.closeSync(fileDescriptor);
    throw error;
  }
  stream.on('error', (error) => {
    console.warn('[chat-debug] write stream error', error);
  });
  return stream;
};

const closeChatDebugStream = () => {
  if (!chatDebugStream) {
    return;
  }
  chatDebugStream.end();
  chatDebugStream = null;
};

const closeChatDebugStreamWithFlush = (onClosed: () => void) => {
  if (!chatDebugStream) {
    onClosed();
    return;
  }
  const stream = chatDebugStream;
  chatDebugStream = null;
  stream.end(() => {
    onClosed();
  });
};

export const shutdownChatDebugLogging = () => {
  closeChatDebugStream();
  chatDebugLogPath = null;
  chatDebugApproximateBytes = 0;
  chatDebugTrimInProgress = false;
  chatDebugPendingLines = [];
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

const appendLineToActiveStream = (line: string) => {
  if (!chatDebugStream) {
    return;
  }
  const payload = `${line}\n`;
  chatDebugApproximateBytes += Buffer.byteLength(payload, 'utf8');
  chatDebugStream.write(payload, 'utf8', (error) => {
    if (!error) {
      return;
    }
    console.warn('[chat-debug] failed to append log line', error);
  });
};

const scheduleChatDebugTrim = () => {
  if (chatDebugTrimInProgress) {
    return;
  }
  if (!chatDebugLogPath) {
    return;
  }
  if (chatDebugApproximateBytes <= chatDebugConfig.maxBytes) {
    return;
  }

  chatDebugTrimInProgress = true;
  setImmediate(() => {
    const targetPath = chatDebugLogPath;
    if (!targetPath) {
      chatDebugTrimInProgress = false;
      return;
    }

    closeChatDebugStreamWithFlush(() => {
      try {
        const currentBuffer = fs.existsSync(targetPath)
          ? fs.readFileSync(targetPath)
          : Buffer.alloc(0);
        let nextBuffer = currentBuffer;

        if (currentBuffer.byteLength > chatDebugConfig.maxBytes) {
          const keepBytes = Math.min(chatDebugConfig.trimToBytes, chatDebugConfig.maxBytes);
          let startOffset = Math.max(0, currentBuffer.byteLength - keepBytes);
          const newlineOffset = currentBuffer.indexOf(0x0a, startOffset);
          if (newlineOffset >= 0 && newlineOffset + 1 < currentBuffer.length) {
            startOffset = newlineOffset + 1;
          }
          nextBuffer = currentBuffer.subarray(startOffset);
          fs.writeFileSync(targetPath, nextBuffer);
        }

        chatDebugApproximateBytes = nextBuffer.byteLength;
        chatDebugStream = createChatDebugWriteStream(targetPath, 'a');

        if (chatDebugPendingLines.length > 0) {
          const pendingLines = chatDebugPendingLines;
          chatDebugPendingLines = [];
          for (const line of pendingLines) {
            appendLineToActiveStream(line);
          }
        }
      } catch (error) {
        console.warn('[chat-debug] failed to trim log file', error);
        shutdownChatDebugLogging();
        return;
      } finally {
        chatDebugTrimInProgress = false;
      }

      if (chatDebugApproximateBytes > chatDebugConfig.maxBytes) {
        scheduleChatDebugTrim();
      }
    });
  });
};

const appendLogLine = (line: string) => {
  if (!chatDebugLogPath) {
    return;
  }

  if (!chatDebugStream || chatDebugTrimInProgress) {
    chatDebugPendingLines.push(line);
    return;
  }

  appendLineToActiveStream(line);
  scheduleChatDebugTrim();
};

export const initializeChatDebugLogging = (
  logsDirectory: string,
  options?: ChatDebugLoggingOptions
): string | null => {
  shutdownChatDebugLogging();
  chatDebugConfig = resolveRuntimeConfig(options);

  try {
    const resolvedLogsDirectory = path.resolve(logsDirectory);
    fs.mkdirSync(resolvedLogsDirectory, { recursive: true });
    const targetPath = path.join(resolvedLogsDirectory, CHAT_DEBUG_LOG_FILENAME);
    fs.writeFileSync(targetPath, '', 'utf8');
    chatDebugStream = createChatDebugWriteStream(targetPath, 'a');
    chatDebugLogPath = targetPath;
    chatDebugApproximateBytes = 0;
    return targetPath;
  } catch (error) {
    console.warn('[chat-debug] failed to initialize file logger', error);
    shutdownChatDebugLogging();
    return null;
  }
};

export const getChatDebugLogPath = (): string | null => chatDebugLogPath;

export const isChatDebugEnabled = (): boolean => true;

export const logChatDebug = (stage: string, payload?: unknown) => {
  const normalizedPayload = payload === undefined ? null : toJsonSafeValue(payload);
  const entry = {
    timestamp: new Date().toISOString(),
    stage,
    payload: normalizedPayload,
  };
  appendLogLine(JSON.stringify(entry));
};
