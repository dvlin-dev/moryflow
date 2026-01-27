/**
 * [PROVIDES]: useDocumentState - 文档打开/保存/Tab 管理
 * [DEPENDS]: desktopAPI.files, desktopAPI.workspace, desktopAPI.events
 * [POS]: Workspace 文档状态核心（编辑器/标签页）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { VaultTreeNode, VaultFsEvent, VaultInfo } from '@shared/ipc';
import { useTranslation } from '@/lib/i18n';
import type { ActiveDocument, RequestState, SaveState, SelectedFile } from '../const';
import { AI_TAB_ID, SITES_TAB_ID } from '../components/unified-top-bar/helper';

/** 判断是否为特殊 tab（AI 或 Sites） */
const isSpecialTab = (path: string): boolean => path === AI_TAB_ID || path === SITES_TAB_ID;

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
const isSelfSaveEvent = (lastSaveTime: number): boolean => {
  return Date.now() - lastSaveTime < 3000;
};

/** 持久化状态的防抖延迟（毫秒） */
const PERSIST_DELAY = 300;

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

  // 用于跳过自身保存触发的 fs-event
  const lastSaveTimeRef = useRef<number>(0);
  const activeDocPathRef = useRef<string | null>(null);
  const saveStateRef = useRef<SaveState>('idle');
  const vaultPathRef = useRef<string | null>(null);

  // 同步 ref
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
          const newTabs = [...tabs];
          newTabs[previewIndex] = { ...node, pinned: false };
          return newTabs;
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
      loadDocument({ id: node.id, name: node.name, path: node.path });
    },
    [loadDocument]
  );

  const handleSelectTab = useCallback(
    (tab: SelectedFile) => {
      if (selectedFile?.path === tab.path) return;

      // 特殊 tab（AI、Sites）不需要加载文档
      if (isSpecialTab(tab.path)) {
        setSelectedFile(tab);
        setActiveDoc(null);
        setDocState('idle');
        setDocError(null);
        return;
      }

      void loadDocument(tab);
    },
    [selectedFile, loadDocument]
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
    [selectedFile, loadDocument, resetEditorState]
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

  // 自动保存
  useEffect(() => {
    if (!pendingSave || !activeDoc || pendingSave.path !== activeDoc.path) return;

    const timer = setTimeout(() => {
      // 保存开始时记录时间
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
  }, [pendingSave, activeDoc]);

  // 监听外部文件变更，自动刷新
  useEffect(() => {
    if (!window.desktopAPI.events?.onVaultFsEvent) return;

    const dispose = window.desktopAPI.events.onVaultFsEvent((event: VaultFsEvent) => {
      if (event.type !== 'file-changed') return;

      const currentPath = activeDocPathRef.current;
      if (!currentPath || event.path !== currentPath) return;

      // 跳过自身保存或正在保存时的事件
      const currentSaveState = saveStateRef.current;
      if (isSelfSaveEvent(lastSaveTimeRef.current) || currentSaveState === 'saving') return;

      // 只在空闲状态下自动刷新
      if (currentSaveState === 'idle') {
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
      }
    });

    return () => dispose();
  }, []);

  // Vault 变化时恢复之前保存的状态
  useEffect(() => {
    const vaultPath = vault?.path;
    const prevVaultPath = vaultPathRef.current;

    // 更新 ref
    vaultPathRef.current = vaultPath ?? null;

    // Vault 没变或没有 vault，不处理
    if (!vaultPath || vaultPath === prevVaultPath) return;

    // 清空当前状态
    setActiveDoc(null);
    setSelectedFile(null);
    setDocState('idle');
    setDocError(null);
    setSaveState('idle');
    setPendingSave(null);

    // 从存储中恢复
    setIsRestoring(true);
    void (async () => {
      try {
        const [savedTabs, lastFile] = await Promise.all([
          window.desktopAPI.workspace.getOpenTabs(vaultPath),
          window.desktopAPI.workspace.getLastOpenedFile(vaultPath),
        ]);

        // 恢复标签页
        if (savedTabs.length > 0) {
          setOpenTabs(savedTabs);

          // 恢复最后打开的文件
          if (lastFile) {
            const targetTab = savedTabs.find((tab) => tab.path === lastFile);
            if (targetTab) {
              // 直接加载文档
              setSelectedFile(targetTab);
              setDocState('loading');
              try {
                const response = await window.desktopAPI.files.read(targetTab.path);
                setActiveDoc({ ...targetTab, content: response.content, mtime: response.mtime });
                setDocState('idle');
              } catch {
                // 文件可能已被删除，从 tabs 中移除
                setOpenTabs((tabs) => tabs.filter((t) => t.path !== lastFile));
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
  }, [vault?.path]);

  // 持久化 openTabs（防抖）
  useEffect(() => {
    const vaultPath = vault?.path;
    if (!vaultPath || isRestoring) return;

    const timer = setTimeout(() => {
      void window.desktopAPI.workspace.setOpenTabs(vaultPath, openTabs);
    }, PERSIST_DELAY);

    return () => clearTimeout(timer);
  }, [vault?.path, openTabs, isRestoring]);

  // 持久化 lastOpenedFile（防抖）
  useEffect(() => {
    const vaultPath = vault?.path;
    if (!vaultPath || isRestoring) return;

    const timer = setTimeout(() => {
      void window.desktopAPI.workspace.setLastOpenedFile(vaultPath, selectedFile?.path ?? null);
    }, PERSIST_DELAY);

    return () => clearTimeout(timer);
  }, [vault?.path, selectedFile?.path, isRestoring]);

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
