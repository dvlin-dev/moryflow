/**
 * [PROPS]: visible, files, selectedIds, query, onQueryChange, onFileSelect
 * [EMITS]: onQueryChange, onFileSelect
 * [POS]: @ 文件选择面板，支持模糊搜索，使用液态玻璃或 BlurView 渲染
 */

import { useMemo, useRef, useEffect } from 'react';
import { View, Pressable, Platform, TextInput, FlatList } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { FileTextIcon, SearchIcon, CheckIcon } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useTheme } from '@/lib/hooks/use-theme';
import { useThemeColors } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import type { FlatFile } from '../hooks';

interface FilePanelProps {
  /** 是否显示 */
  visible: boolean;
  /** 文件列表（已过滤） */
  files: FlatFile[];
  /** 已选中的文件 ID 集合 */
  selectedIds: Set<string>;
  /** 搜索关键词 */
  query: string;
  /** 搜索关键词变更回调 */
  onQueryChange: (query: string) => void;
  /** 选择文件回调 */
  onFileSelect: (file: FlatFile) => void;
}

/** 最大显示文件数 */
const MAX_DISPLAY_FILES = 50;
/** 搜索框高度 */
const SEARCH_HEIGHT = 44;
/** 单个文件项高度 */
const ITEM_HEIGHT = 48;
/** 空状态高度 */
const EMPTY_HEIGHT = 80;
/** 提示栏高度 */
const FOOTER_HEIGHT = 32;
/** 最大列表高度 */
const MAX_LIST_HEIGHT = 260;

/** 单个文件项 */
function FileItem({
  file,
  isSelected,
  onPress,
}: {
  file: FlatFile;
  isSelected: boolean;
  onPress: () => void;
}) {
  const colors = useThemeColors();

  return (
    <Pressable
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: ITEM_HEIGHT,
        gap: 12,
        backgroundColor: pressed ? colors.muted : 'transparent',
      })}
      onPress={onPress}>
      <Icon as={FileTextIcon} size={18} color={colors.iconMuted} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, color: colors.textPrimary }} numberOfLines={1}>
          {file.name}
        </Text>
        {file.path !== file.name && (
          <Text
            style={{ fontSize: 12, color: colors.textTertiary, marginTop: 2 }}
            numberOfLines={1}>
            {file.path}
          </Text>
        )}
      </View>
      {isSelected && <Icon as={CheckIcon} size={18} color={colors.primary} />}
    </Pressable>
  );
}

/** 空状态 */
function EmptyState({ query }: { query: string }) {
  const colors = useThemeColors();

  return (
    <View style={{ height: EMPTY_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 14, color: colors.textTertiary }}>
        {query ? '未找到匹配的文件' : '工作区暂无文件'}
      </Text>
    </View>
  );
}

export function FilePanel({
  visible,
  files,
  selectedIds,
  query,
  onQueryChange,
  onFileSelect,
}: FilePanelProps) {
  const { colorScheme } = useTheme();
  const colors = useThemeColors();
  const isDark = colorScheme === 'dark';
  const inputRef = useRef<TextInput>(null);

  // 检测液态玻璃是否可用
  const glassAvailable = useMemo(() => {
    try {
      return Platform.OS === 'ios' && isLiquidGlassAvailable();
    } catch {
      return false;
    }
  }, []);

  // 面板打开时聚焦搜索框
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // 限制显示数量
  const displayFiles = useMemo(() => files.slice(0, MAX_DISPLAY_FILES), [files]);

  // 动态计算列表高度
  const listHeight = useMemo(() => {
    if (displayFiles.length === 0) return EMPTY_HEIGHT;
    const contentHeight = displayFiles.length * ITEM_HEIGHT;
    return Math.min(contentHeight, MAX_LIST_HEIGHT);
  }, [displayFiles.length]);

  // 是否显示更多提示
  const showFooter = files.length > MAX_DISPLAY_FILES;

  if (!visible) return null;

  // 面板内容
  const panelContent = (
    <View>
      {/* 搜索框 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          height: SEARCH_HEIGHT,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: 8,
        }}>
        <Icon as={SearchIcon} size={16} color={colors.iconMuted} />
        <TextInput
          ref={inputRef}
          style={{
            flex: 1,
            fontSize: 15,
            color: colors.textPrimary,
            padding: 4,
          }}
          placeholder="搜索文件..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={onQueryChange}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (displayFiles.length > 0) {
              onFileSelect(displayFiles[0]);
            }
          }}
        />
      </View>

      {/* 文件列表 */}
      {displayFiles.length === 0 ? (
        <EmptyState query={query} />
      ) : (
        <FlatList
          data={displayFiles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FileItem
              file={item}
              isSelected={selectedIds.has(item.id)}
              onPress={() => onFileSelect(item)}
            />
          )}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ height: listHeight }}
          getItemLayout={(_, index) => ({
            length: ITEM_HEIGHT,
            offset: ITEM_HEIGHT * index,
            index,
          })}
        />
      )}

      {/* 提示 */}
      {showFooter && (
        <View
          style={{
            height: FOOTER_HEIGHT,
            justifyContent: 'center',
            alignItems: 'center',
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}>
          <Text style={{ fontSize: 12, color: colors.textTertiary }}>
            还有 {files.length - MAX_DISPLAY_FILES} 个文件，请搜索查找
          </Text>
        </View>
      )}
    </View>
  );

  // 容器样式
  const containerStyle = {
    borderRadius: 16,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 12,
  };

  // 液态玻璃效果
  if (glassAvailable) {
    return (
      <View style={containerStyle}>
        <GlassView
          style={{ borderRadius: 16 }}
          glassEffectStyle="regular"
          isInteractive={false}
          tintColor={isDark ? 'rgba(20, 20, 22, 0.7)' : undefined}>
          {panelContent}
        </GlassView>
      </View>
    );
  }

  // Fallback: BlurView
  const panelOverlayColor = isDark ? 'rgba(20, 20, 22, 0.92)' : 'rgba(255, 255, 255, 0.9)';

  return (
    <View style={containerStyle}>
      <BlurView
        intensity={isDark ? 70 : 80}
        tint={isDark ? 'dark' : 'light'}
        style={{ borderRadius: 16 }}>
        <View style={{ borderRadius: 16, backgroundColor: panelOverlayColor }}>{panelContent}</View>
      </BlurView>
    </View>
  );
}
