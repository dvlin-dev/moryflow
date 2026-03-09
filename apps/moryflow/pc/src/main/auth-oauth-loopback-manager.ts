import {
  startOAuthLoopbackListener,
  type OAuthLoopbackHandle,
  type OAuthLoopbackPayload,
} from './auth-oauth-loopback.js';

type OAuthLoopbackOwner = {
  id: number;
  isDestroyed: () => boolean;
  send: (channel: string, payload: OAuthLoopbackPayload) => void;
  onDestroyed: (listener: () => void) => () => void;
};

type OAuthLoopbackSession = {
  disposeOwnerDestroyed: () => void;
  handle: OAuthLoopbackHandle;
};

type StartOAuthLoopbackListener = typeof startOAuthLoopbackListener;

const releaseSession = (
  sessions: Map<number, OAuthLoopbackSession>,
  ownerId: number
): OAuthLoopbackSession | null => {
  const session = sessions.get(ownerId) ?? null;
  if (!session) {
    return null;
  }
  sessions.delete(ownerId);
  session.disposeOwnerDestroyed();
  return session;
};

export const createOAuthLoopbackManager = (
  startListener: StartOAuthLoopbackListener = startOAuthLoopbackListener
) => {
  const sessions = new Map<number, OAuthLoopbackSession>();

  const stop = async (ownerId: number): Promise<void> => {
    const session = releaseSession(sessions, ownerId);
    if (!session) {
      return;
    }
    await session.handle.stop();
  };

  const start = async (owner: OAuthLoopbackOwner): Promise<{ callbackUrl: string }> => {
    await stop(owner.id);

    const handle = await startListener({
      onCallback: async (payload) => {
        if (owner.isDestroyed()) {
          throw new Error('OAuth callback target is unavailable');
        }
        releaseSession(sessions, owner.id);
        owner.send('membership:oauth-callback', payload);
      },
    });

    const disposeOwnerDestroyed = owner.onDestroyed(() => {
      void stop(owner.id);
    });

    sessions.set(owner.id, {
      disposeOwnerDestroyed,
      handle,
    });

    return {
      callbackUrl: handle.callbackUrl,
    };
  };

  return {
    start,
    stop,
  };
};
