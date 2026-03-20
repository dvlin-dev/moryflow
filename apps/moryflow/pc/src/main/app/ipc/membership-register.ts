import { AUTH_API } from '@moryflow/api';
import { createApiTransport, ServerApiError } from '@moryflow/api/client';
import type {
  MembershipAccessSessionPayload,
  MembershipAuthResult,
  MembershipAuthUser,
  MembershipRefreshSessionResult,
} from '../../../shared/ipc.js';
import { membershipBridge } from '../../membership-bridge.js';
import {
  isSecureStorageAvailable,
  getRefreshToken,
  setRefreshToken,
  clearRefreshToken,
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  getAccessTokenExpiresAt,
  setAccessTokenExpiresAt,
  clearAccessTokenExpiresAt,
} from '../../membership-token-store.js';
import { createOAuthLoopbackManager } from '../../auth-oauth-loopback-manager.js';
import { MEMBERSHIP_API_URL } from '../../membership-api-url.js';
import { createMembershipDeviceAuthHeaders } from '../security/membership-auth-headers.js';
import { type IpcMainLike, asObjectRecord } from './shared.js';

const MEMBERSHIP_REFRESH_TIMEOUT_MS = 10_000;
const membershipAuthTransport = createApiTransport({
  baseUrl: MEMBERSHIP_API_URL,
  timeoutMs: MEMBERSHIP_REFRESH_TIMEOUT_MS,
});

type MembershipTokenPayload = MembershipAccessSessionPayload & {
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user?: MembershipAuthUser;
};

const isMembershipTokenPayload = (payload: unknown): payload is MembershipTokenPayload => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const data = payload as Record<string, unknown>;
  return (
    typeof data.accessToken === 'string' &&
    typeof data.accessTokenExpiresAt === 'string' &&
    typeof data.refreshToken === 'string' &&
    typeof data.refreshTokenExpiresAt === 'string'
  );
};

const sanitizeMembershipUser = (user: unknown): MembershipAuthUser | undefined => {
  if (!user || typeof user !== 'object') {
    return undefined;
  }
  const data = user as Record<string, unknown>;
  if (typeof data.id !== 'string' || typeof data.email !== 'string') {
    return undefined;
  }
  return {
    id: data.id,
    email: data.email,
    name: typeof data.name === 'string' ? data.name : undefined,
  };
};

const toAccessSessionPayload = (
  payload: MembershipTokenPayload
): MembershipAccessSessionPayload => ({
  accessToken: payload.accessToken,
  accessTokenExpiresAt: payload.accessTokenExpiresAt,
});

const clearMembershipSession = async (): Promise<void> => {
  await clearAccessToken();
  await clearRefreshToken();
};

const persistMembershipSession = async (payload: MembershipTokenPayload): Promise<void> => {
  await setAccessToken(payload.accessToken);
  await setAccessTokenExpiresAt(payload.accessTokenExpiresAt);
  await setRefreshToken(payload.refreshToken);
};

const parseMembershipAuthError = (
  error: unknown,
  fallback: string
): { code: string; message: string } => {
  if (error instanceof ServerApiError) {
    return {
      code: error.code || 'UNKNOWN',
      message: error.message || fallback,
    };
  }

  return {
    code: 'NETWORK_ERROR',
    message: 'Network connection failed',
  };
};

const invalidMembershipAuthResult = (message: string): MembershipAuthResult => ({
  ok: false,
  error: {
    code: 'INVALID_REQUEST',
    message,
  },
});

const performMembershipTokenAuth = async (
  requestPath: string,
  body: Record<string, string>,
  fallbackError: string
): Promise<MembershipAuthResult> => {
  try {
    const data = await membershipAuthTransport.request<unknown>({
      path: requestPath,
      method: 'POST',
      headers: createMembershipDeviceAuthHeaders(),
      body,
      timeoutMs: MEMBERSHIP_REFRESH_TIMEOUT_MS,
    });

    if (!isMembershipTokenPayload(data)) {
      await clearMembershipSession();
      return {
        ok: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Invalid authentication response',
        },
      };
    }

    await persistMembershipSession(data);
    return {
      ok: true,
      payload: toAccessSessionPayload(data),
      user: sanitizeMembershipUser(data.user),
    };
  } catch (error) {
    return {
      ok: false,
      error: parseMembershipAuthError(error, fallbackError),
    };
  }
};

const refreshMembershipSession = async (): Promise<MembershipRefreshSessionResult> => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return { ok: false, reason: 'missing_refresh_token' };
  }

  try {
    const data = await membershipAuthTransport.request<unknown>({
      path: AUTH_API.REFRESH,
      method: 'POST',
      headers: createMembershipDeviceAuthHeaders(),
      body: { refreshToken },
      timeoutMs: MEMBERSHIP_REFRESH_TIMEOUT_MS,
    });
    if (!isMembershipTokenPayload(data)) {
      await clearMembershipSession();
      return { ok: false, reason: 'invalid_response' };
    }
    await persistMembershipSession(data);
    return { ok: true, payload: toAccessSessionPayload(data) };
  } catch (error) {
    if (error instanceof ServerApiError && (error.status === 401 || error.status === 403)) {
      await clearMembershipSession();
      return { ok: false, reason: 'unauthorized' };
    }
    return { ok: false, reason: 'network' };
  }
};

const logoutMembershipSession = async (): Promise<void> => {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return;
  }

  await membershipAuthTransport
    .request<void>({
      path: AUTH_API.LOGOUT,
      method: 'POST',
      headers: createMembershipDeviceAuthHeaders(),
      body: { refreshToken },
      timeoutMs: MEMBERSHIP_REFRESH_TIMEOUT_MS,
    })
    .catch(() => undefined);
};

export const registerMembershipIpcHandlers = (ipcMain: IpcMainLike): void => {
  const oauthLoopbackManager = createOAuthLoopbackManager();

  ipcMain.handle('membership:syncToken', (_event, payload) => {
    const token = payload === null ? null : typeof payload === 'string' ? payload : null;
    membershipBridge.syncToken(token);
  });
  ipcMain.handle('membership:syncEnabled', (_event, payload) => {
    const enabled = typeof payload === 'boolean' ? payload : true;
    membershipBridge.setEnabled(enabled);
  });
  ipcMain.handle('membership:isSecureStorageAvailable', async () => isSecureStorageAvailable());
  ipcMain.handle('membership:hasRefreshToken', async () => Boolean(await getRefreshToken()));
  ipcMain.handle('membership:signInWithEmail', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const email = typeof input.email === 'string' ? input.email.trim() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (!email || !password) {
      return invalidMembershipAuthResult('Email and password are required.');
    }
    return performMembershipTokenAuth(
      AUTH_API.SIGN_IN_EMAIL,
      { email, password },
      'Sign in failed'
    );
  });
  ipcMain.handle('membership:verifyEmailOTP', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const email = typeof input.email === 'string' ? input.email.trim() : '';
    const otp = typeof input.otp === 'string' ? input.otp.trim() : '';
    if (!email || !otp) {
      return invalidMembershipAuthResult('Email and otp are required.');
    }
    return performMembershipTokenAuth(
      '/api/v1/auth/email-otp/verify-email',
      { email, otp },
      'Verification failed'
    );
  });
  ipcMain.handle('membership:completeEmailSignUp', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const signupToken = typeof input.signupToken === 'string' ? input.signupToken.trim() : '';
    const password = typeof input.password === 'string' ? input.password : '';
    if (!signupToken || !password) {
      return invalidMembershipAuthResult('Signup token and password are required.');
    }
    return performMembershipTokenAuth(
      AUTH_API.SIGN_UP_EMAIL_COMPLETE,
      { signupToken, password },
      'Sign up failed'
    );
  });
  ipcMain.handle('membership:exchangeGoogleCode', async (_event, payload) => {
    const input = asObjectRecord(payload);
    const code = typeof input.code === 'string' ? input.code.trim() : '';
    const nonce = typeof input.nonce === 'string' ? input.nonce.trim() : '';
    if (!code || !nonce) {
      return invalidMembershipAuthResult('Code and nonce are required.');
    }
    return performMembershipTokenAuth(
      AUTH_API.SOCIAL_GOOGLE_EXCHANGE,
      { code, nonce },
      'Google sign in failed'
    );
  });
  ipcMain.handle('membership:refreshSession', async () => refreshMembershipSession());
  ipcMain.handle('membership:logout', async () => {
    await logoutMembershipSession();
  });
  ipcMain.handle('membership:clearSession', async () => {
    await clearMembershipSession();
  });
  ipcMain.handle('membership:getAccessToken', async () => getAccessToken());
  ipcMain.handle('membership:setAccessToken', async (_event, payload) => {
    if (typeof payload === 'string' && payload.trim()) {
      await setAccessToken(payload.trim());
      return;
    }
    await clearAccessToken();
  });
  ipcMain.handle('membership:clearAccessToken', async () => {
    await clearAccessToken();
  });
  ipcMain.handle('membership:getAccessTokenExpiresAt', async () => getAccessTokenExpiresAt());
  ipcMain.handle('membership:setAccessTokenExpiresAt', async (_event, payload) => {
    if (typeof payload === 'string' && payload.trim()) {
      await setAccessTokenExpiresAt(payload.trim());
      return;
    }
    await clearAccessTokenExpiresAt();
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
    return oauthLoopbackManager.start(owner);
  });
  ipcMain.handle('membership:stopOAuthCallbackLoopback', async (event) => {
    await oauthLoopbackManager.stop(event.sender.id);
  });
  ipcMain.handle('membership:clearAccessTokenExpiresAt', async () => {
    await clearAccessTokenExpiresAt();
  });
};
