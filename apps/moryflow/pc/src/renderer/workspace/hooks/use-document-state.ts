/**
 * [PROVIDES]: useDocumentState - 文档打开/保存/Tab 管理
 * [DEPENDS]: desktopAPI.files, desktopAPI.workspace, desktopAPI.events
 * [POS]: Workspace 文档状态核心（编辑器/标签页）
 * [UPDATE]: 2026-02-09 - 恢复 tabs 时过滤非法/旧版特殊 tab，避免误读不存在路径
 * [UPDATE]: 2026-02-26 - 副作用拆分为 tabs/load + auto-save + vault-restore + persistence 四段
 * [UPDATE]: 2026-02-26 - 切换 vault 时重置 pendingSelectionPath/pendingOpenPath，避免跨 vault 残留意图触发
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
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
import type { VaultTreeNode, VaultFsEvent, VaultInfo } from '@shared/ipc';
import { useTranslation } from '@/lib/i18n';
import type { ActiveDocument, RequestState, SaveState, SelectedFile } from '../const';

type UseDocumentStateOptions = {
  vault: VaultInfo | null;
};

type DocumentState = {
  selectedFile: SelectedFile | null;
  activeDoc: ActiveDocument | null;
  openTabs: SelectedFile[];
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

type UseDocumentAutoSaveOptions = {
  pendingSave: { path: string; content: string } | null;
  activeDoc: ActiveDocument | null;
  setActiveDoc: Dispatch<SetStateAction<ActiveDocument | null>>;
  setSaveState: Dispatch<SetStateAction<SaveState>>;
  setPendingSave: Dispatch<SetStateAction<{ path: string; content: string } | null>>;
  lastSaveTimeRef: MutableRefObject<number>;
};

const useDocumentAutoSave = ({
  pendingSave,
  activeDoc,
  setActiveDoc,
  setSaveState,
  setPendingSave,
  lastSaveTimeRef,
}: UseDocumentAutoSaveOptions) => {
  useEffect(() => {
    if (!pendingSave || !activeDoc || pendingSave.path !== activeDoc.path) return;

    const timer = setTimeout(() => {
      lastSaveTimeRef.current = Date.now();
      setSaveState('saving');

      void window.desktopAPI.files
        .write({
          path: pendingSave.path,
          content: pendingSave.content,
          clientMtime: activeDoc.mtime ?? undefined,
        })
        .then((result) => {
          setActiveDoc((prev) =>
            prev && prev.path === pendingSave.path ? { ...prev, mtime: result.mtime } : prev
          );
          setSaveState('idle');
          setPendingSave(null);
        })
        .catch(() => {
          setSaveState('error');
        });
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timer);
  }, [pendingSave, activeDoc, lastSaveTimeRef, setActiveDoc, setPendingSave, setSaveState]);
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
};

const useDocumentVaultRestore = ({
  vaultPath,
  vaultPathRef,
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
}: UseDocumentVaultRestoreOptions) => {
  useEffect(() => {
    const prevVaultPath = vaultPathRef.current;
    vaultPathRef.current = vaultPath ?? null;
    if (!vaultPath || vaultPath === prevVaultPath) return;

    setActiveDoc(null);
    setSelectedFile(null);
    setDocState('idle');
    setDocError(null);
    setSaveState('idle');
    setPendingSave(null);
    setPendingSelectionPath(null);
    setPendingOpenPath(null);

    setIsRestoring(true);
    void (async () => {
      try {
        const [savedTabs, lastFile] = await Promise.all([
          window.desktopAPI.workspace.getOpenTabs(vaultPath),
          window.desktopAPI.workspace.getLastOpenedFile(vaultPath),
        ]);

        const safeTabs = sanitizePersistedTabs(vaultPath, savedTabs);
        const safeLastFile = sanitizeLastOpenedFile(vaultPath, lastFile);

        if (safeTabs.length > 0) {
          setOpenTabs(safeTabs);

          if (safeLastFile) {
            const targetTab = safeTabs.find((tab) => tab.path === safeLastFile);
            if (targetTab) {
              setSelectedFile(targetTab);
              setDocState('loading');
              try {
                const response = await window.desktopAPI.files.read(targetTab.path);
                setActiveDoc({ ...targetTab, content: response.content, mtime: response.mtime });
                setDocState('idle');
              } catch {
                setOpenTabs((tabs) => tabs.filter((tab) => tab.path !== safeLastFile));
                setSelectedFile(null);
                setDocState('idle');
              }
            }
          }
        } else {
          setOpenTabs([]);
        }
      } catch (error) {
        console.error('[document] restore state failed', error);
        setOpenTabs([]);
      } finally {
        setIsRestoring(false);
      }
    })();
  }, [
    vaultPath,
    vaultPathRef,
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
      void window.desktopAPI.workspace.setOpenTabs(vaultPath, openTabs);
    }, PERSIST_DELAY);

    return () => clearTimeout(timer);
  }, [vaultPath, openTabs, isRestoring]);

  useEffect(() => {
    if (!vaultPath || isRestoring) return;

    const timer = setTimeout(() => {
      void window.desktopAPI.workspace.setLastOpenedFile(vaultPath, selectedFilePath ?? null);
    }, PERSIST_DELAY);

    return () => clearTimeout(timer);
  }, [vaultPath, selectedFilePath, isRestoring]);
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

  useEffect(() => {
    activeDocPathRef.current = activeDoc?.path ?? null;
  }, [activeDoc?.path]);

  useEffect(() => {
    saveStateRef.current = saveState;
  }, [saveState]);

  const resetEditorState = useCallback(() => {
    setActiveDoc(null);
    setSelectedFile(null);
    setDocState('idle');
    setDocError(null);
    setSaveState('idle');
    setPendingSave(null);
  }, []);

  const loadDocument = useCallback(
    async (node: SelectedFile) => {
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
        setActiveDoc({ ...node, content: response.content, mtime: response.mtime });
        setDocState('idle');
        if (vault?.path) {
          void window.desktopAPI.workspace.recordRecentFile(vault.path, node.path);
        }
      } catch (error) {
        setDocState('error');
        setDocError(error instanceof Error ? error.message : t('loadNoteFailed'));
      }
    },
    [t, vault?.path]
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
      setOpenTabs((tabs) => {
        const filtered = tabs.filter((tab) => tab.path !== path);
        if (filtered.length === tabs.length) return tabs;

        if (selectedFile?.path === path) {
          const fallback = filtered[filtered.length - 1];
          setTimeout(() => {
            if (fallback) {
              void loadDocument(fallback);
            } else {
              resetEditorState();
            }
          }, 0);
        }
        return filtered;
      });
    },
    [selectedFile?.path, loadDocument, resetEditorState]
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
    setActiveDoc,
    setSaveState,
    setPendingSave,
    lastSaveTimeRef,
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
  });

  useDocumentPersistence({
    vaultPath: vault?.path,
    isRestoring,
    openTabs,
    selectedFilePath: selectedFile?.path,
  });

  return {
    selectedFile,
    activeDoc,
    openTabs,
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
