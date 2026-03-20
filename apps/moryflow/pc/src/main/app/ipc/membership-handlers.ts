import { AUTH_API } from '@moryflow/api';

type MembershipBridgeLike = {
  syncToken: (token: string | null) => void;
  setEnabled: (enabled: boolean) => void;
};

type OAuthLoopbackManagerLike = {
  start: (owner: {
    id: number;
    isDestroyed: () => boolean;
    send: (channel: string, payload: { code: string; nonce: string }) => void;
    onDestroyed: (listener: () => void) => () => void;
  }) => Promise<{ callbackUrl: string }>;
  stop: (ownerId: number) => Promise<void>;
};

type IpcMainHandleLike = {
  handle: (channel: string, listener: (...args: any[]) => unknown) => void;
};

type MembershipHandlerDeps = {
  membershipBridge: MembershipBridgeLike;
  isSecureStorageAvailable: () => Promise<boolean>;
  getRefreshToken: () => Promise<string | null>;
  setRefreshToken: (token: string) => Promise<void>;
  clearRefreshToken: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  setAccessToken: (token: string) => Promise<void>;
  clearAccessToken: () => Promise<void>;
  getAccessTokenExpiresAt: () => Promise<string | null>;
  setAccessTokenExpiresAt: (expiresAt: string) => Promise<void>;
  clearAccessTokenExpiresAt: () => Promise<void>;
  refreshMembershipSession: () => Promise<unknown>;
  logoutMembershipSession?: () => Promise<void>;
  clearMembershipSession: () => Promise<void>;
  invalidMembershipAuthResult?: (message: string) => unknown;
  performMembershipTokenAuth?: (
    endpoint: string,
    payload: Record<string, string>,
    fallbackMessage: string
  ) => Promise<unknown>;
  oauthLoopbackManager: OAuthLoopbackManagerLike;
};

export const registerMembershipIpcHandlers = (input: {
  ipcMain: IpcMainHandleLike;
  deps: MembershipHandlerDeps;
}) => {
  const { ipcMain, deps } = input;

  ipcMain.handle('membership:syncToken', (_event, payload) => {
    const token = payload === null ? null : typeof payload === 'string' ? payload : null;
    deps.membershipBridge.syncToken(token);
  });

  ipcMain.handle('membership:syncEnabled', (_event, payload) => {
    const enabled = typeof payload === 'boolean' ? payload : true;
    deps.membershipBridge.setEnabled(enabled);
  });

  ipcMain.handle('membership:isSecureStorageAvailable', async () =>
    deps.isSecureStorageAvailable()
  );

  ipcMain.handle('membership:hasRefreshToken', async () => Boolean(await deps.getRefreshToken()));

  if (deps.performMembershipTokenAuth && deps.invalidMembershipAuthResult) {
    ipcMain.handle('membership:signInWithEmail', async (_event, payload) => {
      const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
      const password = typeof payload?.password === 'string' ? payload.password : '';
      if (!email || !password) {
        return deps.invalidMembershipAuthResult?.('Email and password are required.');
      }
      return deps.performMembershipTokenAuth?.(
        AUTH_API.SIGN_IN_EMAIL,
        { email, password },
        'Sign in failed'
      );
    });

    ipcMain.handle('membership:verifyEmailOTP', async (_event, payload) => {
      const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
      const otp = typeof payload?.otp === 'string' ? payload.otp.trim() : '';
      if (!email || !otp) {
        return deps.invalidMembershipAuthResult?.('Email and otp are required.');
      }
      return deps.performMembershipTokenAuth?.(
        '/api/v1/auth/email-otp/verify-email',
        { email, otp },
        'Verification failed'
      );
    });

    ipcMain.handle('membership:completeEmailSignUp', async (_event, payload) => {
      const signupToken =
        typeof payload?.signupToken === 'string' ? payload.signupToken.trim() : '';
      const password = typeof payload?.password === 'string' ? payload.password : '';
      if (!signupToken || !password) {
        return deps.invalidMembershipAuthResult?.('Signup token and password are required.');
      }
      return deps.performMembershipTokenAuth?.(
        AUTH_API.SIGN_UP_EMAIL_COMPLETE,
        { signupToken, password },
        'Sign up failed'
      );
    });

    ipcMain.handle('membership:exchangeGoogleCode', async (_event, payload) => {
      const code = typeof payload?.code === 'string' ? payload.code.trim() : '';
      const nonce = typeof payload?.nonce === 'string' ? payload.nonce.trim() : '';
      if (!code || !nonce) {
        return deps.invalidMembershipAuthResult?.('Code and nonce are required.');
      }
      return deps.performMembershipTokenAuth?.(
        AUTH_API.SOCIAL_GOOGLE_EXCHANGE,
        { code, nonce },
        'Google sign in failed'
      );
    });
  }

  ipcMain.handle('membership:refreshSession', async () => deps.refreshMembershipSession());

  ipcMain.handle('membership:logout', async () => {
    await deps.logoutMembershipSession?.();
  });

  ipcMain.handle('membership:clearSession', async () => {
    await deps.clearMembershipSession();
  });

  ipcMain.handle('membership:getAccessToken', async () => deps.getAccessToken());

  ipcMain.handle('membership:setAccessToken', async (_event, payload) => {
    if (typeof payload === 'string' && payload.trim()) {
      await deps.setAccessToken(payload.trim());
      return;
    }
    await deps.clearAccessToken();
  });

  ipcMain.handle('membership:clearAccessToken', async () => {
    await deps.clearAccessToken();
  });

  ipcMain.handle('membership:getAccessTokenExpiresAt', async () => deps.getAccessTokenExpiresAt());

  ipcMain.handle('membership:setAccessTokenExpiresAt', async (_event, payload) => {
    if (typeof payload === 'string' && payload.trim()) {
      await deps.setAccessTokenExpiresAt(payload.trim());
      return;
    }
    await deps.clearAccessTokenExpiresAt();
  });

  ipcMain.handle('membership:clearAccessTokenExpiresAt', async () => {
    await deps.clearAccessTokenExpiresAt();
  });

  ipcMain.handle('membership:startOAuthCallbackLoopback', async (event) => {
    const owner = {
      id: event.sender.id,
      isDestroyed: () => event.sender.isDestroyed(),
      send: (channel: string, payload: { code: string; nonce: string }) => {
        event.sender.send(channel, payload);
      },
      onDestroyed: (listener: () => void) => {
        event.sender.once('destroyed', listener);
        return () => {
          event.sender.off('destroyed', listener);
        };
      },
    };
    return deps.oauthLoopbackManager.start(owner);
  });

  ipcMain.handle('membership:stopOAuthCallbackLoopback', async (event) => {
    await deps.oauthLoopbackManager.stop(event.sender.id);
  });
};
