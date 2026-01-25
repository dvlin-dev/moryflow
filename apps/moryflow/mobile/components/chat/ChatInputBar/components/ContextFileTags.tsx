/**
 * [PROPS]: files, onRemove
 * [EMITS]: onRemove(fileId)
 * [POS]: 已选文件 Chip 列表，显示在输入框上方，支持删除
 *        样式参考 PC 端 context-file-tags
 */

import { View, Pressable, ScrollView } from 'react-native';
import { XIcon, FileTextIcon } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import type { FileRefAttachment } from '../types';

interface ContextFileTagsProps {
  /** 已选中的文件列表 */
  files: FileRefAttachment[];
  /** 移除文件回调 */
  onRemove: (fileId: string) => void;
}

/** 单个文件 Chip - 参考 PC 端样式 */
function FileChip({ file, onRemove }: { file: FileRefAttachment; onRemove: () => void }) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 28,
        backgroundColor: colors.muted,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        paddingLeft: 8,
        paddingRight: 4,
        gap: 6,
      }}>
      {/* 文件图标 */}
      <Icon as={FileTextIcon} size={14} color={colors.mutedForeground} />

      {/* 文件名 */}
      <Text
        style={{
          fontSize: 12,
          fontWeight: '500',
          color: colors.foreground,
          maxWidth: 120,
        }}
        numberOfLines={1}>
        {file.name}
      </Text>

      {/* 删除按钮 - 无背景，icon 使用更深的颜色确保可见 */}
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        style={({ pressed }) => ({
          width: 20,
          height: 20,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? colors.mutedForeground + '30' : 'transparent',
        })}>
        <Icon as={XIcon} size={12} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

/**
 * 已选文件标签列表
 */
export function ContextFileTags({ files, onRemove }: ContextFileTagsProps) {
  if (files.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 6,
        flexDirection: 'row',
      }}
      style={{
        maxHeight: 36,
      }}>
      {files.map((file) => (
        <FileChip key={file.id} file={file} onRemove={() => onRemove(file.id)} />
      ))}
    </ScrollView>
  );
}
