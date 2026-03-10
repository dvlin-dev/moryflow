/**
 * [PROVIDES]: useDocumentState - 文档打开/保存/Tab 管理
 * [DEPENDS]: desktopAPI.files, desktopAPI.workspace, desktopAPI.events
 * [POS]: Workspace 文档状态核心（编辑器/标签页）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';
import type {
  DesktopApi,
  PersistedDocumentSession,
  VaultTreeNode,
  VaultFsEvent,
  VaultInfo,
} from '@shared/ipc';
import { useTranslation } from '@/lib/i18n';
import type {
  ActiveDocument,
  DocumentSurface,
  RequestState,
  SaveState,
  SelectedFile,
} from '../const';

type UseDocumentStateOptions = {
  vault: VaultInfo | null;
};

type DocumentState = {
  selectedFile: SelectedFile | null;
  activeDoc: ActiveDocument | null;
  openTabs: SelectedFile[];
  documentSurface: DocumentSurface;
  docState: RequestState;
  docError: string | null;
  saveState: SaveState;
  handleSelectFile: (node: VaultTreeNode) => void;
  handleSelectTab: (tab: SelectedFile) => void;
  handleCloseTab: (path: string) => void;
  handleEditorChange: (markdown: string) => void;
  resetEditorState: () => void;
  setPendingSelectionPath: Dispatch<SetStateAction<string | null>>;
  setPendingOpenPath: Dispatch<SetStateAction<string | null>>;
  pendingSelectionPath: string | null;
  pendingOpenPath: string | null;
  loadDocument: (node: SelectedFile) => Promise<void>;
  setOpenTabs: Dispatch<SetStateAction<SelectedFile[]>>;
  setActiveDoc: Dispatch<SetStateAction<ActiveDocument | null>>;
  setSelectedFile: Dispatch<SetStateAction<SelectedFile | null>>;
};

/** 自动保存延迟时间（毫秒） */
const AUTO_SAVE_DELAY = 500;
/** 判断是否为自身保存触发的事件 */
const isSelfSaveEvent = (lastSaveTime: number): boolean => Date.now() - lastSaveTime < 3000;
/** 持久化状态的防抖延迟（毫秒） */
const PERSIST_DELAY = 300;

const stripTrailingSeparators = (value: string) => value.replace(/[\\/]+$/, '');
const isProbablyAbsolutePath = (value: string) =>
  value.startsWith('/') || /^[A-Za-z]:[\\/]/.test(value) || value.startsWith('\\\\');

const isPathWithinVault = (vaultPath: string, filePath: string) => {
  const root = stripTrailingSeparators(vaultPath);
  return filePath.startsWith(`${root}/`) || filePath.startsWith(`${root}\\`);
};

const sanitizeLastOpenedFile = (vaultPath: string, filePath: string | null): string | null => {
  if (!filePath) return null;
  if (!isProbablyAbsolutePath(filePath)) return null;
  if (!isPathWithinVault(vaultPath, filePath)) return null;
  return filePath;
};

const sanitizePersistedTabs = (vaultPath: string, tabs: SelectedFile[]): SelectedFile[] => {
  const seen = new Set<string>();
  const next: SelectedFile[] = [];

  for (const tab of tabs) {
    const path = tab?.path;
    if (typeof path !== 'string' || path.length === 0) continue;
    if (!isProbablyAbsolutePath(path)) continue;
    if (!isPathWithinVault(vaultPath, path)) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    next.push(tab);
  }

  return next;
};

const sanitizeDocumentSession = (
  vaultPath: string,
  session: PersistedDocumentSession | null | undefined
) => {
  const safeTabs = sanitizePersistedTabs(vaultPath, session?.tabs ?? []);
  const safeActivePath = sanitizeLastOpenedFile(vaultPath, session?.activePath ?? null);
  const activeTab = safeActivePath
    ? (safeTabs.find((tab) => tab.path === safeActivePath) ?? safeTabs[0] ?? null)
    : (safeTabs[0] ?? null);

  return {
    safeTabs,
    activeTab,
  };
};

const mergeRestoredTabs = (
  currentTabs: SelectedFile[],
  restoredTabs: SelectedFile[]
): SelectedFile[] => {
  const currentByPath = new Map(currentTabs.map((tab) => [tab.path, tab] as const));
  const mergedCurrent = currentTabs.map((tab) => {
    const restored = restoredTabs.find((candidate) => candidate.path === tab.path);
    if (!restored) {
      return tab;
    }
    return {
      ...restored,
      ...tab,
      pinned: Boolean(tab.pinned ?? restored.pinned),
    };
  });
  const appended = restoredTabs.filter((tab) => !currentByPath.has(tab.path));
  return [...mergedCurrent, ...appended];
};

type LegacyWorkspacePersistenceApi = {
  getLastOpenedFile?: (vaultPath: string) => Promise<string | null>;
  setLastOpenedFile?: (vaultPath: string, filePath: string | null) => Promise<void>;
  getOpenTabs?: (vaultPath: string) => Promise<SelectedFile[]>;
  setOpenTabs?: (vaultPath: string, tabs: SelectedFile[]) => Promise<void>;
};

type WorkspacePersistenceApi = DesktopApi['workspace'] & LegacyWorkspacePersistenceApi;

const getWorkspacePersistenceApi = (): WorkspacePersistenceApi =>
  window.desktopAPI.workspace as WorkspacePersistenceApi;

const readPersistedDocumentSession = async (
  vaultPath: string
): Promise<PersistedDocumentSession> => {
  const workspace = getWorkspacePersistenceApi();

  if (typeof workspace.getDocumentSession === 'function') {
    return workspace.getDocumentSession(vaultPath);
  }

  const [tabs, activePath] = await Promise.all([
    typeof workspace.getOpenTabs === 'function'
      ? workspace.getOpenTabs(vaultPath)
      : Promise.resolve([]),
    typeof workspace.getLastOpenedFile === 'function'
      ? workspace.getLastOpenedFile(vaultPath)
      : Promise.resolve<string | null>(null),
  ]);

  const migrated = {
    tabs,
    activePath,
  } satisfies PersistedDocumentSession;

  if (typeof workspace.setDocumentSession === 'function') {
    void workspace.setDocumentSession(vaultPath, migrated).catch(() => undefined);
  }

  return migrated;
};

const writePersistedDocumentSession = async (
  vaultPath: string,
  session: PersistedDocumentSession
): Promise<void> => {
  const workspace = getWorkspacePersistenceApi();

  if (typeof workspace.setDocumentSession === 'function') {
    await workspace.setDocumentSession(vaultPath, session);
    return;
  }

  await Promise.all([
    typeof workspace.setOpenTabs === 'function'
      ? workspace.setOpenTabs(vaultPath, session.tabs)
      : Promise.resolve(),
    typeof workspace.setLastOpenedFile === 'function'
      ? workspace.setLastOpenedFile(vaultPath, session.activePath)
      : Promise.resolve(),
  ]);
};

type UseDocumentAutoSaveOptions = {
  pendingSave: { path: string; content: string } | null;
  activeDoc: ActiveDocument | null;
  writePendingSaveSnapshot: (input: {
    path: string;
    content: string;
    mtime: number | null;
  }) => Promise<void>;
};

const useDocumentAutoSave = ({
  pendingSave,
  activeDoc,
  writePendingSaveSnapshot,
}: UseDocumentAutoSaveOptions) => {
  useEffect(() => {
    if (!pendingSave || !activeDoc || pendingSave.path !== activeDoc.path) return;

    const snapshot = {
      path: pendingSave.path,
      content: pendingSave.content,
      mtime: activeDoc.mtime ?? null,
    };
    const timer = setTimeout(() => {
      void writePendingSaveSnapshot(snapshot);
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timer);
  }, [activeDoc, pendingSave, writePendingSaveSnapshot]);
};

type UseDocumentFsSyncOptions = {
  activeDocPathRef: MutableRefObject<string | null>;
  saveStateRef: MutableRefObject<SaveState>;
  lastSaveTimeRef: MutableRefObject<number>;
  setActiveDoc: Dispatch<SetStateAction<ActiveDocument | null>>;
};

const useDocumentFsSync = ({
  activeDocPathRef,
  saveStateRef,
  lastSaveTimeRef,
  setActiveDoc,
}: UseDocumentFsSyncOptions) => {
  useEffect(() => {
    if (!window.desktopAPI.events?.onVaultFsEvent) return;

    const dispose = window.desktopAPI.events.onVaultFsEvent((event: VaultFsEvent) => {
      if (event.type !== 'file-changed') return;

      const currentPath = activeDocPathRef.current;
      if (!currentPath || event.path !== currentPath) return;

      const currentSaveState = saveStateRef.current;
      if (isSelfSaveEvent(lastSaveTimeRef.current) || currentSaveState === 'saving') return;
      if (currentSaveState !== 'idle') return;

      void (async () => {
        try {
          const response = await window.desktopAPI.files.read(currentPath);
          setActiveDoc((prev) =>
            prev && prev.path === currentPath
              ? { ...prev, content: response.content, mtime: response.mtime }
              : prev
          );
        } catch (error) {
          console.error('[document] auto-reload failed', error);
        }
      })();
    });

    return () => dispose();
  }, [activeDocPathRef, saveStateRef, lastSaveTimeRef, setActiveDoc]);
};

type UseDocumentVaultRestoreOptions = {
  vaultPath: string | undefined;
  vaultPathRef: MutableRefObject<string | null>;
  restoreVersionRef: MutableRefObject<number>;
  interactionVersionRef: MutableRefObject<number>;
  openTabsRef: MutableRefObject<SelectedFile[]>;
  selectedFileRef: MutableRefObject<SelectedFile | null>;
  activeDocRef: MutableRefObject<ActiveDocument | null>;
  setOpenTabs: Dispatch<SetStateAction<SelectedFile[]>>;
  setSelectedFile: Dispatch<SetStateAction<SelectedFile | null>>;
  setActiveDoc: Dispatch<SetStateAction<ActiveDocument | null>>;
  setDocState: Dispatch<SetStateAction<RequestState>>;
  setDocError: Dispatch<SetStateAction<string | null>>;
  setSaveState: Dispatch<SetStateAction<SaveState>>;
  setPendingSave: Dispatch<SetStateAction<{ path: string; content: string } | null>>;
  setPendingSelectionPath: Dispatch<SetStateAction<string | null>>;
  setPendingOpenPath: Dispatch<SetStateAction<string | null>>;
  setIsRestoring: Dispatch<SetStateAction<boolean>>;
  flushPendingSave: () => Promise<void>;
  createDocumentLoadGuard: (vaultPath: string | null) => () => boolean;
  invalidateDocumentLoads: () => void;
};

const useDocumentVaultRestore = ({
  vaultPath,
  vaultPathRef,
  restoreVersionRef,
  interactionVersionRef,
  openTabsRef,
  selectedFileRef,
  activeDocRef,
  setOpenTabs,
  setSelectedFile,
  setActiveDoc,
  setDocState,
  setDocError,
  setSaveState,
  setPendingSave,
  setPendingSelectionPath,
  setPendingOpenPath,
  setIsRestoring,
  flushPendingSave,
  createDocumentLoadGuard,
  invalidateDocumentLoads,
}: UseDocumentVaultRestoreOptions) => {
  useEffect(() => {
    const prevVaultPath = vaultPathRef.current;
    const nextVaultPath = vaultPath ?? null;
    vaultPathRef.current = nextVaultPath;

    const resetDocumentState = () => {
      setOpenTabs([]);
      setActiveDoc(null);
      setSelectedFile(null);
      setDocState('idle');
      setDocError(null);
      setSaveState('idle');
      setPendingSave(null);
      setPendingSelectionPath(null);
      setPendingOpenPath(null);
      invalidateDocumentLoads();
    };

    if (!vaultPath) {
      restoreVersionRef.current += 1;
      if (prevVaultPath !== null) {
        void flushPendingSave().catch(() => undefined);
        resetDocumentState();
      }
      setIsRestoring(false);
      return;
    }

    if (vaultPath === prevVaultPath) return;

    restoreVersionRef.current += 1;
    const restoreVersion = restoreVersionRef.current;
    const isStaleRestore = () =>
      restoreVersionRef.current !== restoreVersion || vaultPathRef.current !== vaultPath;
    const restoreInteractionVersion = interactionVersionRef.current;

    void flushPendingSave().catch(() => undefined);
    resetDocumentState();

    setIsRestoring(true);
    void (async () => {
      try {
        const savedSession = await readPersistedDocumentSession(vaultPath);
        if (isStaleRestore()) return;
        const { safeTabs, activeTab } = sanitizeDocumentSession(vaultPath, savedSession);
        const interactedDuringRestore = interactionVersionRef.current !== restoreInteractionVersion;

        if (interactedDuringRestore) {
          const hasUserState =
            openTabsRef.current.length > 0 ||
            selectedFileRef.current !== null ||
            activeDocRef.current !== null;
          if (safeTabs.length > 0 && hasUserState) {
            setOpenTabs((current) => mergeRestoredTabs(current, safeTabs));
          }
          return;
        }

        if (safeTabs.length > 0) {
          const isCurrentRestoreRead = createDocumentLoadGuard(vaultPath);
          const restoreQueue = activeTab
            ? [activeTab, ...safeTabs.filter((tab) => tab.path !== activeTab.path)]
            : safeTabs;
          let remainingTabs = [...safeTabs];
          let restored = false;

          setOpenTabs(remainingTabs);
          setSelectedFile(null);
          setActiveDoc(null);

          for (const tab of restoreQueue) {
            setSelectedFile(tab);
            setDocState('loading');
            try {
              const response = await window.desktopAPI.files.read(tab.path);
              if (isStaleRestore() || !isCurrentRestoreRead()) return;
              setSelectedFile(tab);
              setActiveDoc({ ...tab, content: response.content, mtime: response.mtime });
              setOpenTabs(remainingTabs);
              setDocState('idle');
              restored = true;
              break;
            } catch {
              if (isStaleRestore() || !isCurrentRestoreRead()) return;
              remainingTabs = remainingTabs.filter((candidate) => candidate.path !== tab.path);
              setOpenTabs(remainingTabs);
              setSelectedFile(null);
              setActiveDoc(null);
            }
          }

          if (!restored) {
            if (remainingTabs.length === 0) {
              setOpenTabs([]);
            }
            setDocState('idle');
          }
        } else {
          setOpenTabs([]);
          setSelectedFile(null);
          setActiveDoc(null);
        }
      } catch (error) {
        if (isStaleRestore()) return;
        console.error('[document] restore state failed', error);
        setOpenTabs([]);
        setSelectedFile(null);
        setActiveDoc(null);
      } finally {
        if (!isStaleRestore()) {
          setIsRestoring(false);
        }
      }
    })();
  }, [
    vaultPath,
    vaultPathRef,
    restoreVersionRef,
    interactionVersionRef,
    openTabsRef,
    selectedFileRef,
    activeDocRef,
    setOpenTabs,
    setSelectedFile,
    setActiveDoc,
    setDocState,
    setDocError,
    setSaveState,
    setPendingSave,
    setPendingSelectionPath,
    setPendingOpenPath,
    setIsRestoring,
    flushPendingSave,
    createDocumentLoadGuard,
    invalidateDocumentLoads,
  ]);
};

type UseDocumentPersistenceOptions = {
  vaultPath: string | undefined;
  isRestoring: boolean;
  openTabs: SelectedFile[];
  selectedFilePath: string | undefined;
};

const useDocumentPersistence = ({
  vaultPath,
  isRestoring,
  openTabs,
  selectedFilePath,
}: UseDocumentPersistenceOptions) => {
  useEffect(() => {
    if (!vaultPath || isRestoring) return;

    const timer = setTimeout(() => {
      void writePersistedDocumentSession(vaultPath, {
        tabs: openTabs,
        activePath: selectedFilePath ?? null,
      }).catch((error) => {
        console.error('[document] persist state failed', error);
      });
    }, PERSIST_DELAY);

    return () => clearTimeout(timer);
  }, [vaultPath, isRestoring, openTabs, selectedFilePath]);
};

export const useDocumentState = ({ vault }: UseDocumentStateOptions): DocumentState => {
  const { t } = useTranslation('workspace');
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [activeDoc, setActiveDoc] = useState<ActiveDocument | null>(null);
  const [docState, setDocState] = useState<RequestState>('idle');
  const [docError, setDocError] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<SelectedFile[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [pendingSave, setPendingSave] = useState<{ path: string; content: string } | null>(null);
  const [pendingSelectionPath, setPendingSelectionPath] = useState<string | null>(null);
  const [pendingOpenPath, setPendingOpenPath] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const lastSaveTimeRef = useRef<number>(0);
  const activeDocPathRef = useRef<string | null>(null);
  const saveStateRef = useRef<SaveState>('idle');
  const vaultPathRef = useRef<string | null>(null);
  const activeDocRef = useRef<ActiveDocument | null>(null);
  const selectedFileRef = useRef<SelectedFile | null>(null);
  const openTabsRef = useRef<SelectedFile[]>([]);
  const pendingSaveRef = useRef<{ path: string; content: string } | null>(null);
  const restoreVersionRef = useRef<number>(0);
  const documentLoadVersionRef = useRef<number>(0);
  const interactionVersionRef = useRef<number>(0);
  const savePromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    activeDocPathRef.current = activeDoc?.path ?? null;
    activeDocRef.current = activeDoc;
  }, [activeDoc?.path]);

  useEffect(() => {
    activeDocRef.current = activeDoc;
  }, [activeDoc]);

  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);

  useEffect(() => {
    openTabsRef.current = openTabs;
  }, [openTabs]);

  useEffect(() => {
    pendingSaveRef.current = pendingSave;
  }, [pendingSave]);

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  const invalidateDocumentLoads = useCallback(() => {
    documentLoadVersionRef.current += 1;
  }, []);

  const markUserInteraction = useCallback(() => {
    interactionVersionRef.current += 1;
    invalidateDocumentLoads();
  }, [invalidateDocumentLoads]);

  const createDocumentLoadGuard = useCallback((requestVaultPath: string | null) => {
    const loadVersion = documentLoadVersionRef.current + 1;
    documentLoadVersionRef.current = loadVersion;
    return () =>
      documentLoadVersionRef.current === loadVersion && vaultPathRef.current === requestVaultPath;
  }, []);

  const persistDocumentSnapshot = useCallback(
    async (
      snapshot: { path: string; content: string; mtime: number | null },
      options?: { restorePendingOnError?: boolean }
    ) => {
      lastSaveTimeRef.current = Date.now();
      setSaveState('saving');

      const writeTask = window.desktopAPI.files
        .write({
          path: snapshot.path,
          content: snapshot.content,
          clientMtime: snapshot.mtime ?? undefined,
        })
        .then((result) => {
          setActiveDoc((prev) =>
            prev && prev.path === snapshot.path ? { ...prev, mtime: result.mtime } : prev
          );

          const latestPending = pendingSaveRef.current;
          const hasNewerPending =
            latestPending !== null &&
            (latestPending.path !== snapshot.path || latestPending.content !== snapshot.content);

          if (!hasNewerPending) {
            setPendingSave(null);
          }
          setSaveState(hasNewerPending ? 'dirty' : 'idle');
        })
        .catch((error) => {
          if (options?.restorePendingOnError) {
            setPendingSave(
              (current) => current ?? { path: snapshot.path, content: snapshot.content }
            );
          }
          setSaveState('error');
          throw error;
        });

      savePromiseRef.current = writeTask.then(() => undefined).catch(() => undefined);
      await writeTask;
    },
    []
  );

  const flushPendingSave = useCallback(async () => {
    const inFlightWrite = savePromiseRef.current;
    if (inFlightWrite) {
      await inFlightWrite;
    }

    const pending = pendingSaveRef.current;
    const currentDoc = activeDocRef.current;
    if (!pending || !currentDoc || pending.path !== currentDoc.path) {
      return;
    }

    setPendingSave((current) =>
      current && current.path === pending.path && current.content === pending.content
        ? null
        : current
    );

    await persistDocumentSnapshot(
      {
        path: pending.path,
        content: pending.content,
        mtime: currentDoc.mtime ?? null,
      },
      { restorePendingOnError: true }
    );
  }, [persistDocumentSnapshot]);

  const resetEditorState = useCallback(() => {
    markUserInteraction();
    setActiveDoc(null);
    setSelectedFile(null);
    setDocState('idle');
    setDocError(null);
    setSaveState('idle');
    setPendingSave(null);
  }, [markUserInteraction]);

  const loadDocument = useCallback(
    async (node: SelectedFile) => {
      if (selectedFileRef.current?.path === node.path && activeDocRef.current?.path === node.path) {
        return;
      }

      try {
        await flushPendingSave();
      } catch {
        return;
      }

      markUserInteraction();
      const requestVaultPath = vaultPathRef.current;
      const isCurrentLoad = createDocumentLoadGuard(requestVaultPath);
      setSelectedFile(node);
      setDocState('loading');
      setDocError(null);
      setActiveDoc(null);
      setSaveState('idle');
      setPendingSave(null);

      setOpenTabs((tabs) => {
        const existingIndex = tabs.findIndex((tab) => tab.path === node.path);
        if (existingIndex !== -1) {
          return tabs.map((tab) =>
            tab.path === node.path ? { ...node, pinned: tab.pinned } : tab
          );
        }

        const previewIndex = tabs.findIndex((tab) => !tab.pinned);
        if (previewIndex !== -1) {
          const nextTabs = [...tabs];
          nextTabs[previewIndex] = { ...node, pinned: false };
          return nextTabs;
        }

        return [...tabs, { ...node, pinned: false }];
      });

      try {
        const response = await window.desktopAPI.files.read(node.path);
        if (!isCurrentLoad()) return;
        setActiveDoc({ ...node, content: response.content, mtime: response.mtime });
        setDocState('idle');
        if (requestVaultPath) {
          void window.desktopAPI.workspace.recordRecentFile(requestVaultPath, node.path);
        }
      } catch (error) {
        if (!isCurrentLoad()) return;
        setDocState('error');
        setDocError(error instanceof Error ? error.message : t('loadNoteFailed'));
      }
    },
    [createDocumentLoadGuard, flushPendingSave, markUserInteraction, t]
  );

  const handleSelectFile = useCallback(
    (node: VaultTreeNode) => {
      void loadDocument({ id: node.id, name: node.name, path: node.path });
    },
    [loadDocument]
  );

  const handleSelectTab = useCallback(
    (tab: SelectedFile) => {
      if (selectedFile?.path === tab.path) return;
      void loadDocument(tab);
    },
    [selectedFile?.path, loadDocument]
  );

  const handleCloseTab = useCallback(
    (path: string) => {
      if (!openTabsRef.current.some((tab) => tab.path === path)) {
        return;
      }

      void (async () => {
        if (selectedFileRef.current?.path === path) {
          try {
            await flushPendingSave();
          } catch {
            return;
          }
        }

        const latestTabs = openTabsRef.current;
        const nextTabs = latestTabs.filter((tab) => tab.path !== path);
        if (nextTabs.length === latestTabs.length) {
          return;
        }

        const isClosingSelected = selectedFileRef.current?.path === path;
        const fallback = isClosingSelected ? (nextTabs[nextTabs.length - 1] ?? null) : null;

        setOpenTabs((current) => current.filter((tab) => tab.path !== path));

        if (!isClosingSelected) {
          return;
        }

        if (fallback) {
          await loadDocument(fallback);
          return;
        }

        resetEditorState();
      })();
    },
    [flushPendingSave, loadDocument, resetEditorState]
  );

  const handleEditorChange = useCallback(
    (markdown: string) => {
      if (!activeDoc) return;

      setActiveDoc((prev) =>
        prev && prev.id === activeDoc.id ? { ...prev, content: markdown } : prev
      );
      setSaveState('dirty');
      setPendingSave({ path: activeDoc.path, content: markdown });

      setOpenTabs((tabs) =>
        tabs.map((tab) => (tab.path === activeDoc.path ? { ...tab, pinned: true } : tab))
      );
    },
    [activeDoc]
  );

  useDocumentAutoSave({
    pendingSave,
    activeDoc,
    writePendingSaveSnapshot: persistDocumentSnapshot,
  });

  useDocumentFsSync({
    activeDocPathRef,
    saveStateRef,
    lastSaveTimeRef,
    setActiveDoc,
  });

  useDocumentVaultRestore({
    vaultPath: vault?.path,
    vaultPathRef,
    restoreVersionRef,
    interactionVersionRef,
    openTabsRef,
    selectedFileRef,
    activeDocRef,
    setOpenTabs,
    setSelectedFile,
    setActiveDoc,
    setDocState,
    setDocError,
    setSaveState,
    setPendingSave,
    setPendingSelectionPath,
    setPendingOpenPath,
    setIsRestoring,
    flushPendingSave,
    createDocumentLoadGuard,
    invalidateDocumentLoads,
  });

  useDocumentPersistence({
    vaultPath: vault?.path,
    isRestoring,
    openTabs,
    selectedFilePath: selectedFile?.path,
  });

  const hasVisibleEditorState =
    activeDoc !== null || selectedFile !== null || (!isRestoring && openTabs.length > 0);
  const documentSurface: DocumentSurface = hasVisibleEditorState
    ? 'editor'
    : isRestoring
      ? 'restoring'
      : 'empty';

  return {
    selectedFile,
    activeDoc,
    openTabs,
    documentSurface,
    docState,
    docError,
    saveState,
    handleSelectFile,
    handleSelectTab,
    handleCloseTab,
    handleEditorChange,
    resetEditorState,
    setPendingSelectionPath,
    setPendingOpenPath,
    pendingSelectionPath,
    pendingOpenPath,
    loadDocument,
    setOpenTabs,
    setActiveDoc,
    setSelectedFile,
  };
};
