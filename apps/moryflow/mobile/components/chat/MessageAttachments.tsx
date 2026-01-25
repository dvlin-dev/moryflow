/**
 * [PROPS]: attachments
 * [POS]: 消息附件展示组件，显示在消息气泡下方（只读模式）
 */

import { View, Image } from 'react-native';
import { FileTextIcon, ImageIcon } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import type { MessageAttachment, FileRefAttachment, ImageAttachment } from './ChatInputBar/types';
import { isFileRef, isImage } from './ChatInputBar/types';

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
}

// ============================================
// 文件类型图标
// ============================================

function FileTypeIcon({ extension, size = 14 }: { extension: string; size?: number }) {
  const colors = useThemeColors();
  const iconColor = colors.iconMuted;

  // 图片类型
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
    return <Icon as={ImageIcon} size={size} color={iconColor} />;
  }

  // 默认文件图标
  return <Icon as={FileTextIcon} size={size} color={iconColor} />;
}

// ============================================
// 附件项组件
// ============================================

function FileRefItem({ attachment }: { attachment: FileRefAttachment }) {
  const colors = useThemeColors();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 2,
      }}>
      <FileTypeIcon extension={attachment.extension} />
      <Text
        style={{
          fontSize: 13,
          color: colors.textSecondary,
        }}
        numberOfLines={1}>
        {attachment.name}
      </Text>
    </View>
  );
}

function ImageItem({ attachment }: { attachment: ImageAttachment }) {
  return (
    <View style={{ marginVertical: 4 }}>
      <Image
        source={{ uri: attachment.url }}
        style={{
          width: 200,
          height: 150,
          borderRadius: 8,
        }}
        resizeMode="cover"
      />
      {attachment.alt && (
        <Text
          style={{
            fontSize: 12,
            color: '#888',
            marginTop: 4,
          }}>
          {attachment.alt}
        </Text>
      )}
    </View>
  );
}

// ============================================
// 主组件
// ============================================

/**
 * 消息附件列表
 * 显示在用户消息气泡下方，只读模式
 */
export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <View
      style={{
        marginTop: 6,
        alignItems: 'flex-end',
        gap: 2,
      }}>
      {attachments.map((attachment) => {
        if (isFileRef(attachment)) {
          return <FileRefItem key={attachment.id} attachment={attachment} />;
        }
        if (isImage(attachment)) {
          return <ImageItem key={attachment.id} attachment={attachment} />;
        }
        return null;
      })}
    </View>
  );
}
