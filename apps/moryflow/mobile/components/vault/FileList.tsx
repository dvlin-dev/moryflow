/**
 * 文件列表组件
 *
 * 展示 Vault 中的文件和目录，支持文件夹展开/收起（懒加载）。
 * 类似 PC 端左侧文件系统的行为：
 * - 点击文件夹 → 懒加载子项并展开/收起
 * - 点击文件 → 打开编辑器
 * - 长按文件/文件夹 → 显示操作菜单（重命名、修改图标、删除）
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/lib/theme';
import { useTranslation } from '@aiget/i18n';
import {
  FileIcon,
  FolderIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  FileTextIcon,
  ImageIcon,
  FileCodeIcon,
  PlusIcon,
} from 'lucide-react-native';
import * as ZeegoContextMenu from 'zeego/context-menu';
import type { VaultTreeNode } from '@/lib/vault';
import { readTree, onVaultChange, moveFile, deleteFile } from '@/lib/vault';
import { getFileExtension } from '@/lib/utils/format';

// iOS 原生组件
let ContextMenu: any = null;
let Host: any = null;
let Button: any = null;

if (Platform.OS === 'ios') {
  try {
    const swiftUI = require('@expo/ui/swift-ui');
    ContextMenu = swiftUI.ContextMenu;
    Host = swiftUI.Host;
    Button = swiftUI.Button;
  } catch (error) {
    console.warn('[@expo/ui/swift-ui] ContextMenu failed to load');
  }
}

// ============ 类型定义 ============

interface FileListProps {
  /** 根级文件列表 */
  items: VaultTreeNode[];
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 是否正在刷新 */
  isRefreshing?: boolean;
  /** 点击文件回调 */
  onFilePress?: (item: VaultTreeNode) => void;
  /** 长按项目回调（保留兼容性） */
  onItemLongPress?: (item: VaultTreeNode) => void;
  /** 下拉刷新回调 */
  onRefresh?: () => void;
  /** 空状态文本 */
  emptyText?: string;
  /** 在指定目录新建文件（返回 Promise 以便刷新） */
  onCreateFile?: (parentPath: string) => Promise<void>;
  /** 在指定目录新建文件夹（返回 Promise 以便刷新） */
  onCreateFolder?: (parentPath: string) => Promise<void>;
  /** 禁用内置 ScrollView，用于嵌套在外部 ScrollView 中 */
  disableScrollView?: boolean;
}

// ============ 工具函数 ============

/**
 * 获取文件图标组件
 */
function getFileIconComponent(item: VaultTreeNode) {
  const ext = getFileExtension(item.name);

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext)) {
    return ImageIcon;
  }
  if (['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'py', 'go', 'rs'].includes(ext)) {
    return FileCodeIcon;
  }
  if (['md', 'txt', 'mdx', 'markdown'].includes(ext)) {
    return FileTextIcon;
  }
  return FileIcon;
}

/**
 * 移除文件后缀名
 */
function getDisplayName(item: VaultTreeNode): string {
  if (item.type === 'directory') {
    return item.name;
  }
  return item.name.replace(/\.md$/, '');
}

/**
 * 排序节点：目录优先，按名称排序
 */
function sortNodes(nodes: VaultTreeNode[]): VaultTreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// ============ 子组件 ============

interface FileItemProps {
  item: VaultTreeNode;
  depth: number;
  isExpanded: boolean;
  isLoading: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onCreateFile?: (parentPath: string) => Promise<void>;
  onCreateFolder?: (parentPath: string) => Promise<void>;
  onRename?: (item: VaultTreeNode, newName: string) => Promise<void>;
  onDelete?: (item: VaultTreeNode) => Promise<void>;
  onChangeIcon?: (item: VaultTreeNode) => void;
}

/**
 * 单个文件项
 */
const FileItem = React.memo(function FileItem({
  item,
  depth,
  isExpanded,
  isLoading,
  onPress,
  onLongPress,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onChangeIcon,
}: FileItemProps) {
  const colors = useThemeColors();
  const { t } = useTranslation('common');
  const isDirectory = item.type === 'directory';

  // 文件类型图标
  const IconComponent = isDirectory ? FolderIcon : getFileIconComponent(item);
  // 展开/收起箭头图标（仅文件夹）
  const ChevronIcon = isExpanded ? ChevronDownIcon : ChevronRightIcon;

  // 缩进
  const paddingLeft = 16 + depth * 20;

  // 处理新建文件
  const handleCreateFile = useCallback(() => {
    onCreateFile?.(item.path);
  }, [item.path, onCreateFile]);

  // 处理新建文件夹
  const handleCreateFolder = useCallback(() => {
    onCreateFolder?.(item.path);
  }, [item.path, onCreateFolder]);

  // 处理重命名
  const handleRename = useCallback(() => {
    const currentName = item.name.replace(/\.md$/, '');
    Alert.prompt(
      t('renameTitle'),
      t('renamePrompt'),
      async (newName) => {
        if (!newName?.trim() || newName.trim() === currentName) return;
        const finalName = isDirectory ? newName.trim() : `${newName.trim()}.md`;
        await onRename?.(item, finalName);
      },
      'plain-text',
      currentName,
      'default'
    );
  }, [item, isDirectory, onRename, t]);

  // 处理删除
  const handleDelete = useCallback(() => {
    const typeName = isDirectory ? t('folder') : t('file');
    Alert.alert(
      t('deleteTitle', { type: typeName }),
      t('deleteFileConfirm', { name: item.name }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => onDelete?.(item),
        },
      ]
    );
  }, [item, isDirectory, onDelete, t]);

  // 处理修改图标（占位）
  const handleChangeIcon = useCallback(() => {
    onChangeIcon?.(item);
  }, [item, onChangeIcon]);

  // 渲染加号按钮（仅文件夹）
  const renderPlusButton = () => {
    if (!isDirectory) return null;

    const stopPropagation = (e: any) => {
      e?.stopPropagation?.();
    };

    if (Platform.OS === 'ios' && ContextMenu && Host && Button) {
      return (
        <Pressable onPress={stopPropagation}>
          <Host style={{ width: 40, height: 40 }}>
            <ContextMenu>
              <ContextMenu.Items>
                <Button systemImage="doc.badge.plus" onPress={handleCreateFile}>
                  {t('newFile')}
                </Button>
                <Button systemImage="folder.badge.plus" onPress={handleCreateFolder}>
                  {t('newFolder')}
                </Button>
              </ContextMenu.Items>
              <ContextMenu.Trigger>
                <View className="w-10 h-10 items-center justify-center">
                  <PlusIcon size={22} color={colors.iconMuted} />
                </View>
              </ContextMenu.Trigger>
            </ContextMenu>
          </Host>
        </Pressable>
      );
    }

    return (
      <Pressable
        className="w-10 h-10 items-center justify-center"
        onPress={(e) => {
          stopPropagation(e);
          handleCreateFile();
        }}
      >
        <PlusIcon size={22} color={colors.iconMuted} />
      </Pressable>
    );
  };

  // 文件项内容
  const itemContent = (
    // paddingLeft 是动态计算的（依赖 depth），需保留 style
    <View className="flex-row items-center pr-3 py-3" style={{ paddingLeft }}>
      {/* 展开/收起箭头（仅文件夹） */}
      {isDirectory ? (
        <View className="mr-1">
          <ChevronIcon size={18} color={colors.textTertiary} />
        </View>
      ) : (
        <View className="w-[22px]" />
      )}

      {/* 类型图标 */}
      <IconComponent
        size={22}
        color={isDirectory ? colors.textSecondary : colors.textTertiary}
      />

      {/* 文件名 */}
      <Text className="flex-1 ml-2.5 text-[17px] text-foreground" numberOfLines={1}>
        {getDisplayName(item)}
      </Text>

      {/* 加号按钮（仅文件夹） */}
      {renderPlusButton()}
    </View>
  );

  // 使用 Zeego ContextMenu 包裹文件项（长按触发原生菜单）
  return (
    <ZeegoContextMenu.Root>
      <ZeegoContextMenu.Trigger>
        <Pressable onPress={onPress}>
          {itemContent}
        </Pressable>
      </ZeegoContextMenu.Trigger>
      <ZeegoContextMenu.Content>
        <ZeegoContextMenu.Item key="rename" onSelect={handleRename}>
          <ZeegoContextMenu.ItemIcon
            ios={{ name: 'pencil' }}
            androidIconName="ic_menu_edit"
          />
          <ZeegoContextMenu.ItemTitle>{t('rename')}</ZeegoContextMenu.ItemTitle>
        </ZeegoContextMenu.Item>
        <ZeegoContextMenu.Item key="change-icon" onSelect={handleChangeIcon}>
          <ZeegoContextMenu.ItemIcon
            ios={{ name: 'face.smiling' }}
            androidIconName="ic_menu_emoticons"
          />
          <ZeegoContextMenu.ItemTitle>{t('changeIcon')}</ZeegoContextMenu.ItemTitle>
        </ZeegoContextMenu.Item>
        <ZeegoContextMenu.Item key="delete" destructive onSelect={handleDelete}>
          <ZeegoContextMenu.ItemIcon
            ios={{ name: 'trash' }}
            androidIconName="ic_menu_delete"
          />
          <ZeegoContextMenu.ItemTitle>{t('delete')}</ZeegoContextMenu.ItemTitle>
        </ZeegoContextMenu.Item>
      </ZeegoContextMenu.Content>
    </ZeegoContextMenu.Root>
  );
});

interface TreeNodeProps {
  node: VaultTreeNode;
  depth: number;
  expandedPaths: Set<string>;
  loadingPaths: Set<string>;
  childrenMap: Map<string, VaultTreeNode[]>;
  onToggleExpand: (path: string) => void;
  onFilePress: (item: VaultTreeNode) => void;
  onItemLongPress?: (item: VaultTreeNode) => void;
  onCreateFile?: (parentPath: string) => Promise<void>;
  onCreateFolder?: (parentPath: string) => Promise<void>;
  onRename?: (item: VaultTreeNode, newName: string) => Promise<void>;
  onDelete?: (item: VaultTreeNode) => Promise<void>;
  onChangeIcon?: (item: VaultTreeNode) => void;
}

/**
 * 递归渲染树节点
 */
const TreeNode = React.memo(function TreeNode({
  node,
  depth,
  expandedPaths,
  loadingPaths,
  childrenMap,
  onToggleExpand,
  onFilePress,
  onItemLongPress,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  onChangeIcon,
}: TreeNodeProps) {
  const isDirectory = node.type === 'directory';
  const isExpanded = expandedPaths.has(node.path);
  const isLoading = loadingPaths.has(node.path);
  const children = childrenMap.get(node.path);

  const handlePress = useCallback(() => {
    if (isDirectory) {
      onToggleExpand(node.path);
    } else {
      onFilePress(node);
    }
  }, [isDirectory, node, onToggleExpand, onFilePress]);

  const handleLongPress = useCallback(() => {
    onItemLongPress?.(node);
  }, [node, onItemLongPress]);

  const sortedChildren = useMemo(() => {
    if (!children) return [];
    return sortNodes(children);
  }, [children]);

  return (
    <>
      <FileItem
        item={node}
        depth={depth}
        isExpanded={isExpanded}
        isLoading={isLoading}
        onPress={handlePress}
        onLongPress={handleLongPress}
        onCreateFile={onCreateFile}
        onCreateFolder={onCreateFolder}
        onRename={onRename}
        onDelete={onDelete}
        onChangeIcon={onChangeIcon}
      />
      {isDirectory && isExpanded && sortedChildren.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          depth={depth + 1}
          expandedPaths={expandedPaths}
          loadingPaths={loadingPaths}
          childrenMap={childrenMap}
          onToggleExpand={onToggleExpand}
          onFilePress={onFilePress}
          onItemLongPress={onItemLongPress}
          onCreateFile={onCreateFile}
          onCreateFolder={onCreateFolder}
          onRename={onRename}
          onDelete={onDelete}
          onChangeIcon={onChangeIcon}
        />
      ))}
    </>
  );
});

/**
 * 空状态组件
 */
function EmptyState({ text }: { text: string }) {
  const colors = useThemeColors();
  return (
    <View className="flex-1 items-center justify-center py-20">
      <FolderIcon size={64} color={colors.textTertiary} opacity={0.3} />
      <Text className="text-muted-foreground mt-4">{text}</Text>
    </View>
  );
}

/**
 * 加载状态组件
 */
function LoadingState() {
  const colors = useThemeColors();
  const { t } = useTranslation('common');
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color={colors.spinner} />
      <Text className="text-muted-foreground mt-4">{t('loading')}</Text>
    </View>
  );
}

// ============ 主组件 ============

/**
 * 文件列表组件（懒加载展开/收起）
 */
export function FileList({
  items,
  isLoading = false,
  isRefreshing = false,
  onFilePress,
  onItemLongPress,
  onRefresh,
  emptyText,
  onCreateFile,
  onCreateFolder,
  disableScrollView = false,
}: FileListProps) {
  const colors = useThemeColors();
  const { t } = useTranslation('common');
  const displayEmptyText = emptyText ?? t('noFiles');

  // 展开状态
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  // 正在加载的路径
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  // 已加载的子节点（缓存）
  const [childrenMap, setChildrenMap] = useState<Map<string, VaultTreeNode[]>>(new Map());

  // 切换展开状态
  const handleToggleExpand = useCallback(async (path: string) => {
    if (expandedPaths.has(path)) {
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    } else {
      if (!childrenMap.has(path)) {
        setLoadingPaths((prev) => new Set(prev).add(path));
        try {
          const children = await readTree(path);
          setChildrenMap((prev) => new Map(prev).set(path, children));
        } catch (error) {
          console.error('[FileList] Failed to load children:', error);
        } finally {
          setLoadingPaths((prev) => {
            const next = new Set(prev);
            next.delete(path);
            return next;
          });
        }
      }
      setExpandedPaths((prev) => new Set(prev).add(path));
    }
  }, [expandedPaths, childrenMap]);

  // 处理文件点击
  const handleFilePress = useCallback(
    (item: VaultTreeNode) => {
      onFilePress?.(item);
    },
    [onFilePress]
  );

  // 排序根节点
  const sortedItems = useMemo(() => sortNodes(items), [items]);

  // 刷新指定目录的子节点
  const reloadFolder = useCallback(async (path: string) => {
    try {
      const children = await readTree(path);
      setChildrenMap((prev) => new Map(prev).set(path, children));
    } catch (error) {
      console.error('[FileList] Failed to reload folder:', error);
    }
  }, []);

  // 监听 Vault 变更
  React.useEffect(() => {
    const unsubscribe = onVaultChange((event) => {
      const getParentPath = (filePath: string) => {
        const parts = filePath.split('/');
        return parts.slice(0, -1).join('/');
      };

      const parentPath = getParentPath(event.path);
      
      if (childrenMap.has(parentPath)) {
        reloadFolder(parentPath);
      }

      if (event.type === 'renamed' && event.oldPath) {
        const oldParentPath = getParentPath(event.oldPath);
        if (oldParentPath !== parentPath && childrenMap.has(oldParentPath)) {
          reloadFolder(oldParentPath);
        }
      }
    });

    return unsubscribe;
  }, [childrenMap, reloadFolder]);

  // 包装创建文件回调
  const handleCreateFile = useCallback(async (parentPath: string) => {
    await onCreateFile?.(parentPath);
    await reloadFolder(parentPath);
    if (!expandedPaths.has(parentPath)) {
      setExpandedPaths((prev) => new Set(prev).add(parentPath));
    }
  }, [onCreateFile, reloadFolder, expandedPaths]);

  // 包装创建文件夹回调
  const handleCreateFolder = useCallback(async (parentPath: string) => {
    await onCreateFolder?.(parentPath);
    await reloadFolder(parentPath);
    if (!expandedPaths.has(parentPath)) {
      setExpandedPaths((prev) => new Set(prev).add(parentPath));
    }
  }, [onCreateFolder, reloadFolder, expandedPaths]);

  // 重命名处理
  const handleRename = useCallback(async (item: VaultTreeNode, newName: string) => {
    try {
      const parentPath = item.path.split('/').slice(0, -1).join('/');
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;
      await moveFile(item.path, newPath);
      onRefresh?.();
    } catch (error) {
      console.error('[FileList] Failed to rename:', error);
      Alert.alert(t('renameFailed'), t('renameFailedMessage'));
    }
  }, [onRefresh, t]);

  // 删除处理
  const handleDelete = useCallback(async (item: VaultTreeNode) => {
    try {
      await deleteFile(item.path);
      onRefresh?.();
    } catch (error) {
      console.error('[FileList] Failed to delete:', error);
      Alert.alert(t('deleteFailed'), t('deleteFailedMessage'));
    }
  }, [onRefresh, t]);

  // 修改图标（占位 - 功能开发中）
  const handleChangeIcon = useCallback((item: VaultTreeNode) => {
    Alert.alert(t('featureDeveloping'), t('iconPickerComingSoon'));
  }, [t]);

  // 刷新时清除缓存
  const handleRefresh = useCallback(() => {
    setChildrenMap(new Map());
    onRefresh?.();
  }, [onRefresh]);

  if (isLoading && items.length === 0) {
    return <LoadingState />;
  }

  if (!isLoading && items.length === 0) {
    return <EmptyState text={displayEmptyText} />;
  }

  // 树节点列表
  const treeContent = sortedItems.map((node) => (
    <TreeNode
      key={node.path}
      node={node}
      depth={0}
      expandedPaths={expandedPaths}
      loadingPaths={loadingPaths}
      childrenMap={childrenMap}
      onToggleExpand={handleToggleExpand}
      onFilePress={handleFilePress}
      onItemLongPress={onItemLongPress}
      onCreateFile={handleCreateFile}
      onCreateFolder={handleCreateFolder}
      onRename={handleRename}
      onDelete={handleDelete}
      onChangeIcon={handleChangeIcon}
    />
  ));

  // 禁用内置 ScrollView 时直接返回内容
  if (disableScrollView) {
    return <View>{treeContent}</View>;
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 20 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.spinner}
          />
        ) : undefined
      }
    >
      {treeContent}
    </ScrollView>
  );
}
