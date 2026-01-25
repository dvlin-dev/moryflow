import { Pressable, Alert, Platform, type StyleProp, type ViewStyle } from 'react-native';
import type React from 'react';
import { MoreHorizontalIcon } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import { GlassButtonContainer } from './GlassButtonContainer';
import { FLOATING_BUTTON_SIZE } from '../const';

// iOS 原生组件
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
  role?: 'destructive';
  onPress?: () => void;
  children?: React.ReactNode;
}>;

let ContextMenu: SwiftUIContextMenuComponent | null = null;
let Host: SwiftUIHostComponent | null = null;
let SwiftButton: SwiftUIButtonComponent | null = null;

if (Platform.OS === 'ios') {
  try {
    const swiftUI = require('@expo/ui/swift-ui');
    ContextMenu = swiftUI.ContextMenu;
    Host = swiftUI.Host;
    SwiftButton = swiftUI.Button;
  } catch (error) {
    console.warn('[@expo/ui/swift-ui] ContextMenu 加载失败:', error);
  }
}

interface MoreButtonProps {
  onSave: () => void;
  onDelete: () => void;
}

/**
 * 更多按钮
 * iOS 使用 SwiftUI ContextMenu，Android 使用 Alert
 */
export function MoreButton({ onSave, onDelete }: MoreButtonProps) {
  const colors = useThemeColors();

  const glassButton = (
    <GlassButtonContainer>
      <Icon as={MoreHorizontalIcon} size={20} color={colors.textPrimary} />
    </GlassButtonContainer>
  );

  // iOS: SwiftUI ContextMenu
  if (Platform.OS === 'ios' && ContextMenu && Host && SwiftButton) {
    return (
      <Host style={{ width: FLOATING_BUTTON_SIZE, height: FLOATING_BUTTON_SIZE }}>
        <ContextMenu>
          <ContextMenu.Items>
            <SwiftButton systemImage="checkmark.circle" onPress={onSave}>
              完成
            </SwiftButton>
            <SwiftButton systemImage="trash" role="destructive" onPress={onDelete}>
              删除
            </SwiftButton>
          </ContextMenu.Items>
          <ContextMenu.Trigger>{glassButton}</ContextMenu.Trigger>
        </ContextMenu>
      </Host>
    );
  }

  // Android/Fallback: Alert
  const handlePress = () => {
    Alert.alert('操作', undefined, [
      { text: '完成', onPress: onSave },
      { text: '删除', style: 'destructive', onPress: onDelete },
      { text: '取消', style: 'cancel' },
    ]);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{ width: FLOATING_BUTTON_SIZE, height: FLOATING_BUTTON_SIZE }}>
      {glassButton}
    </Pressable>
  );
}
