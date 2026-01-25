/**
 * [PROPS]: disabled
 * [EMITS]: onPhotoLibrary, onCamera, onFileSelect
 * [POS]: 附件按钮，iOS 使用 ContextMenu，其他平台使用 Pressable
 */

import { View, Pressable, Platform, type StyleProp, type ViewStyle } from 'react-native';
import type React from 'react';
import { PaperclipIcon } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';

// iOS SwiftUI ContextMenu 动态加载
type SwiftUIContextMenuComponent = React.ComponentType<React.PropsWithChildren> & {
  Items: React.ComponentType<React.PropsWithChildren>;
  Trigger: React.ComponentType<React.PropsWithChildren>;
};
type SwiftUIHostComponent = React.ComponentType<{
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}>;
type SwiftUIButtonComponent = React.ComponentType<{
  systemImage?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}>;

let ContextMenu: SwiftUIContextMenuComponent | null = null;
let Host: SwiftUIHostComponent | null = null;
let Button: SwiftUIButtonComponent | null = null;

if (Platform.OS === 'ios') {
  try {
    const swiftUI = require('@expo/ui/swift-ui');
    ContextMenu = swiftUI.ContextMenu;
    Host = swiftUI.Host;
    Button = swiftUI.Button;
  } catch {
    // ContextMenu 不可用
  }
}

interface AttachmentButtonProps {
  disabled?: boolean;
  onPhotoLibrary?: () => void;
  onCamera?: () => void;
  onFileSelect?: () => void;
}

export function AttachmentButton({
  disabled,
  onPhotoLibrary,
  onCamera,
  onFileSelect,
}: AttachmentButtonProps) {
  const colors = useThemeColors();

  // iOS 使用原生 ContextMenu
  if (Platform.OS === 'ios' && ContextMenu && Host && Button) {
    return (
      <Host
        style={{
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <ContextMenu>
          <ContextMenu.Items>
            <Button systemImage="photo.on.rectangle" onPress={onPhotoLibrary}>
              照片图库
            </Button>
            <Button systemImage="camera" onPress={onCamera}>
              拍照
            </Button>
            <Button systemImage="doc" onPress={onFileSelect}>
              选取文件
            </Button>
          </ContextMenu.Items>
          <ContextMenu.Trigger>
            <View
              style={{
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon as={PaperclipIcon} size={20} color={colors.iconMuted} />
            </View>
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
    );
  }

  // 其他平台使用 Pressable
  return (
    <Pressable
      style={{
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPress={onFileSelect}
      disabled={disabled}>
      <Icon as={PaperclipIcon} size={20} color={colors.iconMuted} />
    </Pressable>
  );
}
