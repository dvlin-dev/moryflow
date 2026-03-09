import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const OAUTH_LOOPBACK_HOST = '127.0.0.1';
const OAUTH_LOOPBACK_PATH = '/auth/success';

export type OAuthLoopbackPayload = {
  code: string;
  nonce: string;
};

export type OAuthLoopbackHandle = {
  callbackUrl: string;
  stop: () => Promise<void>;
};

const sendText = (
  res: ServerResponse<IncomingMessage>,
  statusCode: number,
  body: string,
  contentType = 'text/plain; charset=utf-8'
): void => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', contentType);
  res.end(body);
};

const closeServer = (server: ReturnType<typeof createServer>): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

export const startOAuthLoopbackListener = async (input: {
  onCallback: (payload: OAuthLoopbackPayload) => void | Promise<void>;
}): Promise<OAuthLoopbackHandle> => {
  let closePromise: Promise<void> | null = null;
  const server = createServer(async (req, res) => {
    if (req.method !== 'GET' || !req.url) {
      sendText(res, 404, 'Not found');
      return;
    }

    const requestUrl = new URL(req.url, `http://${OAUTH_LOOPBACK_HOST}`);
    if (requestUrl.pathname !== OAUTH_LOOPBACK_PATH) {
      sendText(res, 404, 'Not found');
      return;
    }

    const code = requestUrl.searchParams.get('code')?.trim() ?? '';
    const nonce = requestUrl.searchParams.get('nonce')?.trim() ?? '';
    if (!code || !nonce) {
      sendText(res, 400, 'Missing oauth callback params');
      return;
    }

    try {
      await input.onCallback({ code, nonce });
      sendText(
        res,
        200,
        '<html><body>You can close this window and return to Moryflow.</body></html>',
        'text/html; charset=utf-8'
      );
    } catch {
      sendText(res, 500, 'OAuth callback handling failed');
      return;
    }

    void stop().catch(() => undefined);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, OAUTH_LOOPBACK_HOST, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    await closeServer(server);
    throw new Error('Failed to start oauth loopback listener');
  }

  const callbackUrl = `http://${OAUTH_LOOPBACK_HOST}:${address.port}${OAUTH_LOOPBACK_PATH}`;

  const stop = async (): Promise<void> => {
    if (closePromise) {
      return closePromise;
    }
    closePromise = closeServer(server);
    return closePromise;
  };

  return {
    callbackUrl,
    stop,
  };
};
