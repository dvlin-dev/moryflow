/**
 * [PROVIDES]: resolveSessionMemoryScope - session-bound Memory scope resolver
 * [DEPENDS]: chat session summary, workspace profile service
 * [POS]: PC Agent Runtime Memory 子域的 scope 事实源
 */

import type { WorkspaceProfileRecord } from '../../workspace-profile/const.js';

export type MemoryScopeDeps = {
  getSessionSummary: (chatId: string) => {
    profileKey?: string | null;
    vaultPath?: string | null;
  } | null;
  getProfile: (userId: string, clientWorkspaceId: string) => WorkspaceProfileRecord | null;
  isAbsolutePath: (value: string) => boolean;
};

export type SessionMemoryScopeResolution =
  | {
      state: 'resolved';
      profileKey: string;
      profile: WorkspaceProfileRecord;
      vaultPath: string | null;
    }
  | {
      state: 'missing';
      profileKey: null;
      vaultPath: null;
    }
  | {
      state: 'unresolved';
      profileKey: string | null;
      vaultPath: string | null;
    };

const parseProfileKey = (
  profileKey: string | null | undefined
): { userId: string; clientWorkspaceId: string } | null => {
  const raw = profileKey?.trim() ?? '';
  if (!raw) return null;
  const sepIdx = raw.indexOf(':');
  if (sepIdx <= 0 || sepIdx >= raw.length - 1) return null;
  return {
    userId: raw.slice(0, sepIdx),
    clientWorkspaceId: raw.slice(sepIdx + 1),
  };
};

export const resolveSessionMemoryScope = (
  deps: MemoryScopeDeps,
  chatId?: string
): SessionMemoryScopeResolution => {
  if (!chatId) {
    return {
      state: 'missing',
      profileKey: null,
      vaultPath: null,
    };
  }

  const summary = deps.getSessionSummary(chatId);
  if (!summary) {
    return {
      state: 'unresolved',
      profileKey: null,
      vaultPath: null,
    };
  }

  const profileKey = summary.profileKey?.trim() || null;
  const vaultPath =
    typeof summary.vaultPath === 'string' &&
    summary.vaultPath.trim().length > 0 &&
    deps.isAbsolutePath(summary.vaultPath.trim())
      ? summary.vaultPath.trim()
      : null;
  const parsedProfileKey = parseProfileKey(profileKey);
  if (!parsedProfileKey) {
    return {
      state: 'unresolved',
      profileKey,
      vaultPath,
    };
  }

  const profile = deps.getProfile(parsedProfileKey.userId, parsedProfileKey.clientWorkspaceId);
  if (!profile) {
    return {
      state: 'unresolved',
      profileKey,
      vaultPath,
    };
  }

  return {
    state: 'resolved',
    profileKey: parsedProfileKey.userId + ':' + parsedProfileKey.clientWorkspaceId,
    profile,
    vaultPath,
  };
};
