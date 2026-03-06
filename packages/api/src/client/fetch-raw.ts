/**
 * [PROVIDES]: fetchRaw - 原始 HTTP 请求（保留 Response，不自动按状态抛错）
 * [DEPENDS]: global fetch
 * [POS]: packages/api 原始请求工具（适用于预签名 URL 上传/下载）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

export interface FetchRawOptions extends RequestInit {
  timeoutMs?: number;
}

export async function fetchRaw(url: string, options: FetchRawOptions = {}): Promise<Response> {
  const { timeoutMs = 30_000, signal: externalSignal, ...init } = options;
  const controller = new AbortController();

  const abortByExternal = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', abortByExternal, { once: true });
    }
  }

  const timeoutId =
    timeoutMs > 0
      ? setTimeout(() => {
          controller.abort();
        }, timeoutMs)
      : null;

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'AbortError' &&
      timeoutMs > 0 &&
      !externalSignal?.aborted
    ) {
      throw new Error(`请求超时 (${timeoutMs}ms)`);
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    externalSignal?.removeEventListener('abort', abortByExternal);
  }
}
