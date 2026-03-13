import { createServer, type Server } from 'node:http';

export type FakeLlmServerInput = {
  delayMs?: number;
  status?: number;
  body?: unknown;
};

export type FakeLlmServer = {
  server: Server;
  baseUrl: string;
  getRequestCount: () => number;
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

  const server = createServer((req, res) => {
    if (req.method === 'POST') {
      requestCount += 1;
      void req.resume();
    }

    setTimeout(() => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    }, delayMs);
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
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
};
