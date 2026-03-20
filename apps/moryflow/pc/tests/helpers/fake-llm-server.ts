import { createServer, type Server } from 'node:http';

export type FakeLlmServerInput = {
  delayMs?: number;
  status?: number;
  body?: unknown;
  scriptedResponses?: FakeLlmScriptedResponse[];
  resolveResponse?: (
    request: FakeLlmServerRequest,
    context: { requestIndex: number; requests: FakeLlmServerRequest[] }
  ) => FakeLlmScriptedResponse | undefined;
};

export type FakeLlmSseChunk = {
  delayMs?: number;
  data: unknown | '[DONE]';
};

export type FakeLlmScriptedResponse = {
  delayMs?: number;
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  sse?: FakeLlmSseChunk[];
};

export type FakeLlmServerRequest = {
  method: string;
  path: string;
  headers: Record<string, string | string[]>;
  bodyText: string;
  bodyJson: unknown;
};

export type FakeLlmServer = {
  server: Server;
  baseUrl: string;
  getRequestCount: () => number;
  getRequests: () => FakeLlmServerRequest[];
  close: () => Promise<void>;
};

export const createFakeLlmServer = async (
  input: FakeLlmServerInput = {}
): Promise<FakeLlmServer> => {
  let requestCount = 0;
  const delayMs = input.delayMs ?? 0;
  const status = input.status ?? 500;
  const body = input.body ?? {
    error: {
      message: 'fake llm server failure',
    },
  };
  const scriptedResponses = input.scriptedResponses ?? [];
  const requests: FakeLlmServerRequest[] = [];

  const server = createServer((req, res) => {
    if (req.method !== 'POST') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Unsupported method' } }));
      return;
    }

    requestCount += 1;
    const respond = async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const bodyText = Buffer.concat(chunks).toString('utf8');
      let bodyJson: unknown = null;
      if (bodyText) {
        try {
          bodyJson = JSON.parse(bodyText);
        } catch {
          bodyJson = bodyText;
        }
      }

      const request: FakeLlmServerRequest = {
        method: req.method ?? 'POST',
        path: req.url ?? '/',
        headers: req.headers,
        bodyText,
        bodyJson,
      };
      requests.push(request);

      const scriptedResponse =
        input.resolveResponse?.(request, {
          requestIndex: requestCount,
          requests: [...requests],
        }) ?? scriptedResponses[requestCount - 1];
      const resolvedDelayMs = scriptedResponse?.delayMs ?? delayMs;
      const resolvedStatus = scriptedResponse?.status ?? status;
      const resolvedBody = scriptedResponse?.body ?? body;
      const resolvedHeaders = scriptedResponse?.headers ?? {};
      const resolvedSse = scriptedResponse?.sse;

      await new Promise((resolve) => setTimeout(resolve, resolvedDelayMs));

      if (resolvedSse && resolvedSse.length > 0) {
        res.writeHead(resolvedStatus, {
          'content-type': 'text/event-stream',
          'cache-control': 'no-cache',
          connection: 'keep-alive',
          ...resolvedHeaders,
        });

        for (const chunk of resolvedSse) {
          if ((chunk.delayMs ?? 0) > 0) {
            await new Promise((resolve) => setTimeout(resolve, chunk.delayMs));
          }
          const payload = chunk.data === '[DONE]' ? '[DONE]' : JSON.stringify(chunk.data);
          res.write(`data: ${payload}\n\n`);
        }

        res.end();
        return;
      }

      res.writeHead(resolvedStatus, {
        'content-type': 'application/json',
        ...resolvedHeaders,
      });
      res.end(JSON.stringify(resolvedBody));
    };

    void respond();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Failed to start fake LLM server.');
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}/v1`,
    getRequestCount: () => requestCount,
    getRequests: () => [...requests],
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
};
