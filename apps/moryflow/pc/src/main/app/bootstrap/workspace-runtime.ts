type WorkspaceScope = {
  vaultPath: string;
  profileKey: string | null;
};

type StoredVault = {
  path?: string;
};

type ChatSessionSummary = {
  id: string;
};

export const createWorkspaceRuntime = (input: {
  cloudSyncEngine: { stop: () => void };
  memoryIndexingEngine: { stop: () => void };
  searchIndexService: { resetScope: () => void };
  setQuickChatSessionId: (sessionId: string | null) => void;
  getQuickChatWindowController: () => {
    setSessionId: (sessionId: string | null) => Promise<void> | void;
  };
  getStoredVault: () => Promise<StoredVault | null>;
  workspaceDocRegistry: { clearCache: (vaultPath: string) => void };
  resolveCurrentChatSessionScope: () => Promise<WorkspaceScope | null>;
  getQuickChatSessionId: () => string | null;
  chatSessionStore: {
    getSummaryInScope: (
      sessionId: string,
      currentScope: WorkspaceScope
    ) => ChatSessionSummary | null;
    create: (input: { vaultPath: string; profileKey: string | null }) => ChatSessionSummary;
  };
  ensureDefaultWorkspace: () => Promise<StoredVault | null | undefined>;
  resolveChatSessionProfileKey: (vaultPath: string) => Promise<string | null>;
}) => {
  const resetWorkspaceScopedRuntimeState = async (): Promise<void> => {
    input.cloudSyncEngine.stop();
    input.memoryIndexingEngine.stop();
    input.searchIndexService.resetScope();
    input.setQuickChatSessionId(null);
    input.getQuickChatWindowController().setSessionId(null);

    const storedVault = await input.getStoredVault();
    if (storedVault?.path) {
      input.workspaceDocRegistry.clearCache(storedVault.path);
    }
  };

  const ensureQuickChatSessionId = async (): Promise<string | null> => {
    const currentScope = await input.resolveCurrentChatSessionScope();
    const storedSessionId = input.getQuickChatSessionId();
    if (storedSessionId && currentScope) {
      try {
        const visibleSession = input.chatSessionStore.getSummaryInScope(
          storedSessionId,
          currentScope
        );
        if (visibleSession) {
          return visibleSession.id;
        }
        input.setQuickChatSessionId(null);
      } catch {
        input.setQuickChatSessionId(null);
      }
    }

    let vault = await input.getStoredVault();
    if (!vault) {
      const created = await input.ensureDefaultWorkspace();
      if (created?.path) {
        vault = { path: created.path };
      }
    }

    if (!vault?.path) {
      return null;
    }

    const profileKey =
      currentScope?.vaultPath === vault.path
        ? currentScope.profileKey
        : await input.resolveChatSessionProfileKey(vault.path);
    const session = input.chatSessionStore.create({
      vaultPath: vault.path,
      profileKey: profileKey ?? null,
    });
    input.setQuickChatSessionId(session.id);
    return session.id;
  };

  return {
    resetWorkspaceScopedRuntimeState,
    ensureQuickChatSessionId,
  };
};
