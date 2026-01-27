/**
 * [PROPS]: { open, onOpenChange, onSelect, currentVaultPath, currentTree }
 * [EMITS]: onSelect(paths) - 选择文件后回调
 * [POS]: Sites CMS 的文件选择对话框，支持多工作区选择（Lucide 图标）
 *
 * 混合模式：
 * - 当前工作区：使用传入的 currentTree（已验证可用）
 * - 其他工作区：展开时调用 readTree 加载
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 AGENTS.md
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowDown, ArrowRight, File, Folder, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@anyhunt/ui/components/dialog';
import { Button } from '@anyhunt/ui/components/button';
import { Checkbox } from '@anyhunt/ui/components/checkbox';
import { ScrollArea } from '@anyhunt/ui/components/scroll-area';
import { Skeleton } from '@anyhunt/ui/components/skeleton';
import type { VaultTreeNode, VaultItem } from '../../../../shared/ipc/vault';
import { SKELETON_PLACEHOLDER_COUNT } from './const';

/** 生成骨架屏占位符序列 */
const SKELETON_PLACEHOLDERS = Array.from({ length: SKELETON_PLACEHOLDER_COUNT }, (_, i) => i);

interface FilePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (paths: string[]) => void;
  /** 当前工作区路径 */
  currentVaultPath: string;
  /** 当前工作区文件树（已加载） */
  currentTree: VaultTreeNode[];
}

/** 工作区及其文件树 */
interface VaultWithTree {
  vault: VaultItem;
  tree: VaultTreeNode[];
  loading: boolean;
  loaded: boolean;
}

/** 递归获取文件夹下所有 .md 文件路径 */
function getMarkdownFiles(node: VaultTreeNode): string[] {
  if (node.type === 'file') {
    return node.path.endsWith('.md') ? [node.path] : [];
  }
  return node.children?.flatMap(getMarkdownFiles) ?? [];
}

/** 递归获取树下所有 .md 文件路径 */
function getAllMarkdownFiles(nodes: VaultTreeNode[]): string[] {
  return nodes.flatMap(getMarkdownFiles);
}

/** 排序节点：文件夹在前，按名称排序 */
function sortNodes(nodes: VaultTreeNode[]): VaultTreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

/** 文件节点组件 */
function FileNode({
  node,
  selected,
  onToggle,
}: {
  node: VaultTreeNode;
  selected: boolean;
  onToggle: (path: string) => void;
}) {
  const isMd = node.path.endsWith('.md');
  if (!isMd) return null;

  return (
    <div
      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
      onClick={() => onToggle(node.path)}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle(node.path)}
        onClick={(e) => e.stopPropagation()}
      />
      <File className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate text-sm">{node.name.replace(/\.md$/, '')}</span>
    </div>
  );
}

/** 文件夹节点组件 */
function FolderNode({
  node,
  selectedPaths,
  expandedPaths,
  onToggleSelect,
  onToggleExpand,
}: {
  node: VaultTreeNode;
  selectedPaths: Set<string>;
  expandedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
  onToggleExpand: (path: string) => void;
}) {
  const expanded = expandedPaths.has(node.path);
  const mdFiles = useMemo(() => getMarkdownFiles(node), [node]);
  const selectedCount = mdFiles.filter((p) => selectedPaths.has(p)).length;
  const allSelected = mdFiles.length > 0 && selectedCount === mdFiles.length;
  const someSelected = selectedCount > 0 && selectedCount < mdFiles.length;

  const handleFolderClick = () => {
    onToggleExpand(node.path);
  };

  const handleCheckboxChange = () => {
    if (allSelected) {
      mdFiles.forEach((p) => {
        if (selectedPaths.has(p)) onToggleSelect(p);
      });
    } else {
      mdFiles.forEach((p) => {
        if (!selectedPaths.has(p)) onToggleSelect(p);
      });
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer"
        onClick={handleFolderClick}
      >
        <Checkbox
          checked={allSelected}
          // @ts-expect-error - indeterminate is valid
          indeterminate={someSelected}
          onCheckedChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          disabled={mdFiles.length === 0}
        />
        {expanded ? (
          <ArrowDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{node.name}</span>
        {selectedCount > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{selectedCount}</span>
        )}
      </div>
      {expanded && node.children && (
        <div className="ml-4 border-l border-border pl-2">
          {sortNodes(node.children).map((child) =>
            child.type === 'folder' ? (
              <FolderNode
                key={child.id}
                node={child}
                selectedPaths={selectedPaths}
                expandedPaths={expandedPaths}
                onToggleSelect={onToggleSelect}
                onToggleExpand={onToggleExpand}
              />
            ) : (
              <FileNode
                key={child.id}
                node={child}
                selected={selectedPaths.has(child.path)}
                onToggle={onToggleSelect}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

/** 工作区节点组件 */
function VaultNode({
  vaultData,
  isCurrentVault,
  selectedPaths,
  expandedPaths,
  onToggleSelect,
  onSelectFiles,
  onToggleExpand,
  onExpandVault,
}: {
  vaultData: VaultWithTree;
  isCurrentVault: boolean;
  selectedPaths: Set<string>;
  expandedPaths: Set<string>;
  onToggleSelect: (path: string) => void;
  onSelectFiles: (paths: string[]) => void;
  onToggleExpand: (path: string) => void;
  onExpandVault: (vaultPath: string) => void;
}) {
  const { vault, tree, loading, loaded } = vaultData;
  const vaultKey = `vault:${vault.path}`;
  const expanded = expandedPaths.has(vaultKey);
  const selectAfterLoadRef = useRef(false);

  const allMdFiles = useMemo(() => getAllMarkdownFiles(tree), [tree]);
  const selectedCount = allMdFiles.filter((p) => selectedPaths.has(p)).length;
  const allSelected = allMdFiles.length > 0 && selectedCount === allMdFiles.length;
  const someSelected = selectedCount > 0 && selectedCount < allMdFiles.length;

  const handleVaultClick = () => {
    // 非当前工作区且未加载时，需要加载文件树
    if (!isCurrentVault && !loaded && !loading) {
      onExpandVault(vault.path);
    }
    onToggleExpand(vaultKey);
  };

  const handleCheckboxChange = () => {
    // 非当前工作区且未加载时，先加载再选中
    if (!isCurrentVault && !loaded && !loading) {
      selectAfterLoadRef.current = true;
      onExpandVault(vault.path);
      return;
    }
    // 切换选中状态
    if (allSelected) {
      allMdFiles.forEach((p) => {
        if (selectedPaths.has(p)) onToggleSelect(p);
      });
    } else {
      allMdFiles.forEach((p) => {
        if (!selectedPaths.has(p)) onToggleSelect(p);
      });
    }
  };

  // 加载完成后自动选中
  useEffect(() => {
    if (loaded && selectAfterLoadRef.current) {
      selectAfterLoadRef.current = false;
      // 使用批量选择，避免多次触发状态更新
      onSelectFiles(allMdFiles);
    }
  }, [loaded, allMdFiles, onSelectFiles]);

  const sortedTree = useMemo(() => sortNodes(tree), [tree]);

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent cursor-pointer"
        onClick={handleVaultClick}
      >
        <Checkbox
          checked={allSelected}
          // @ts-expect-error - indeterminate is valid
          indeterminate={someSelected}
          onCheckedChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
          disabled={loading}
        />
        {expanded ? (
          <ArrowDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
          <FolderOpen className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">
            {vault.name}
            {isCurrentVault && (
              <span className="ml-2 text-xs text-muted-foreground">(current)</span>
            )}
          </div>
        </div>
        {selectedCount > 0 && (
          <span className="text-xs text-muted-foreground">{selectedCount}</span>
        )}
      </div>

      {expanded && (
        <div className="ml-4 border-l border-border pl-2">
          {loading ? (
            <div className="space-y-1 py-1">
              {SKELETON_PLACEHOLDERS.map((i) => (
                <Skeleton key={i} className="h-7 w-full" />
              ))}
            </div>
          ) : tree.length === 0 ? (
            <div className="py-2 pl-2 text-xs text-muted-foreground">No markdown files</div>
          ) : (
            sortedTree.map((node) =>
              node.type === 'folder' ? (
                <FolderNode
                  key={node.id}
                  node={node}
                  selectedPaths={selectedPaths}
                  expandedPaths={expandedPaths}
                  onToggleSelect={onToggleSelect}
                  onToggleExpand={onToggleExpand}
                />
              ) : (
                <FileNode
                  key={node.id}
                  node={node}
                  selected={selectedPaths.has(node.path)}
                  onToggle={onToggleSelect}
                />
              )
            )
          )}
        </div>
      )}
    </div>
  );
}

export function FilePickerDialog({
  open,
  onOpenChange,
  onSelect,
  currentVaultPath,
  currentTree,
}: FilePickerDialogProps) {
  const [vaultsData, setVaultsData] = useState<VaultWithTree[]>([]);
  const [vaultsLoading, setVaultsLoading] = useState(true);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // 加载工作区列表
  useEffect(() => {
    if (!open) return;

    const loadVaults = async () => {
      setVaultsLoading(true);
      try {
        const list = await window.desktopAPI.vault.getVaults();
        setVaultsData(
          list.map((vault) => ({
            vault,
            // 当前工作区直接使用传入的 tree，其他工作区需要懒加载
            tree: vault.path === currentVaultPath ? currentTree : [],
            loading: false,
            loaded: vault.path === currentVaultPath, // 当前工作区已加载
          }))
        );
      } catch {
        setVaultsData([]);
      } finally {
        setVaultsLoading(false);
      }
    };
    loadVaults();
  }, [open, currentVaultPath, currentTree]);

  // 重置状态
  useEffect(() => {
    if (!open) {
      setSelectedPaths(new Set());
      setExpandedPaths(new Set());
    }
  }, [open]);

  // 展开其他工作区时加载文件树（使用 readTree）
  const handleExpandVault = useCallback(async (vaultPath: string) => {
    setVaultsData((prev) =>
      prev.map((v) => (v.vault.path === vaultPath ? { ...v, loading: true } : v))
    );

    try {
      // 使用 readTree 获取完整嵌套的文件树
      const nodes = await window.desktopAPI.vault.readTree(vaultPath);
      setVaultsData((prev) =>
        prev.map((v) =>
          v.vault.path === vaultPath ? { ...v, tree: nodes, loading: false, loaded: true } : v
        )
      );
    } catch {
      setVaultsData((prev) =>
        prev.map((v) =>
          v.vault.path === vaultPath ? { ...v, tree: [], loading: false, loaded: true } : v
        )
      );
    }
  }, []);

  const handleToggleSelect = useCallback((path: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // 批量添加文件到选中集合
  const handleSelectFiles = useCallback((paths: string[]) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      paths.forEach((p) => next.add(p));
      return next;
    });
  }, []);

  const handleToggleExpand = useCallback((path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedPaths.size === 0) return;
    onSelect(Array.from(selectedPaths));
    onOpenChange(false);
  }, [selectedPaths, onSelect, onOpenChange]);

  const renderContent = () => {
    if (vaultsLoading) {
      return (
        <div className="space-y-2">
          {SKELETON_PLACEHOLDERS.map((i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      );
    }

    if (vaultsData.length === 0) {
      return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No workspaces found
        </div>
      );
    }

    return (
      <div className="space-y-0.5">
        {vaultsData.map((vaultData) => (
          <VaultNode
            key={vaultData.vault.id}
            vaultData={vaultData}
            isCurrentVault={vaultData.vault.path === currentVaultPath}
            selectedPaths={selectedPaths}
            expandedPaths={expandedPaths}
            onToggleSelect={handleToggleSelect}
            onSelectFiles={handleSelectFiles}
            onToggleExpand={handleToggleExpand}
            onExpandVault={handleExpandVault}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select files to publish</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">{renderContent()}</ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selectedPaths.size === 0}>
            Publish {selectedPaths.size > 0 && `(${selectedPaths.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
