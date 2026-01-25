/**
 * [PROPS]: models, currentModel, onModelChange
 * [EMITS]: onModelChange(modelId)
 * [POS]: 模型选择器，iOS 使用 ContextMenu，其他平台显示静态文本
 */

import { View, Platform, type StyleProp, type ViewStyle } from 'react-native';
import type React from 'react';
import { ChevronDownIcon } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import type { ModelOption } from '../const';

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

interface ModelSelectorProps {
  models?: ModelOption[];
  currentModel?: string;
  onModelChange?: (modelId: string) => void;
}

export function ModelSelector({ models = [], currentModel, onModelChange }: ModelSelectorProps) {
  const colors = useThemeColors();

  const handleModelSelect = (index: number) => {
    if (models[index] && onModelChange) {
      onModelChange(models[index].id);
    }
  };

  // iOS 使用原生 ContextMenu
  if (Platform.OS === 'ios' && ContextMenu && Host && Button && models.length > 0) {
    return (
      <Host style={{ height: 36, justifyContent: 'center' }}>
        <ContextMenu>
          <ContextMenu.Items>
            {models.map((model, index) => (
              <Button key={model.id} onPress={() => handleModelSelect(index)}>
                {model.name}
              </Button>
            ))}
          </ContextMenu.Items>
          <ContextMenu.Trigger>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 4,
                paddingVertical: 6,
                gap: 2,
              }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '400',
                  maxWidth: 120,
                  color: colors.iconMuted,
                }}
                numberOfLines={1}>
                {currentModel || '选择模型'}
              </Text>
              <Icon as={ChevronDownIcon} size={14} color={colors.iconMuted} />
            </View>
          </ContextMenu.Trigger>
        </ContextMenu>
      </Host>
    );
  }

  // 其他平台显示静态文本
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 6,
        gap: 2,
      }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '400',
          maxWidth: 120,
          color: colors.iconMuted,
        }}
        numberOfLines={1}>
        {currentModel || '选择模型'}
      </Text>
      <Icon as={ChevronDownIcon} size={14} color={colors.iconMuted} />
    </View>
  );
}
