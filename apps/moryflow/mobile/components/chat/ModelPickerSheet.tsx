import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { XIcon, CheckIcon, SparklesIcon, LockIcon } from 'lucide-react-native';
import type { UnifiedModel } from '@/lib/models';

interface ModelPickerSheetProps {
  /** 模型列表（统一格式） */
  models: UnifiedModel[];
  /** 当前选中的模型 ID */
  currentModelId?: string;
  /** 选择模型回调 */
  onSelect: (modelId: string) => void;
  /** 关闭回调 */
  onClose: () => void;
  /** 点击锁定模型时的回调（升级提示） */
  onLockedModelPress?: (model: UnifiedModel) => void;
}

/**
 * 模型选择抽屉组件
 * 显示可用模型列表，支持切换模型
 */
export function ModelPickerSheet({
  models,
  currentModelId,
  onSelect,
  onClose,
  onLockedModelPress,
}: ModelPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const handleModelPress = (model: UnifiedModel) => {
    if (!model.available) {
      // 锁定模型，触发升级提示
      onLockedModelPress?.(model);
      return;
    }
    onSelect(model.id);
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header - 使用 style 处理动态 insets */}
      <View style={{ paddingTop: insets.top + 12 }}>
        <View className="flex-row items-center justify-between px-4 pb-3">
          <Text className="text-[17px] font-semibold text-foreground">选择模型</Text>
          <Pressable className="w-10 h-10 items-center justify-center" onPress={onClose}>
            <XIcon size={22} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      {/* List */}
      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {models.length === 0 ? (
          <View className="items-center justify-center py-[60px] gap-2">
            <SparklesIcon size={48} color={colors.mutedForeground} />
            <Text className="text-[15px] mt-2 text-muted-foreground">暂无可用模型</Text>
            <Text className="text-[13px] text-muted-foreground">请登录以查看会员模型</Text>
          </View>
        ) : (
          models.map((model) => {
            const isSelected = model.id === currentModelId;
            const isLocked = !model.available;
            return (
              <Pressable
                key={model.id}
                className={cn(
                  'flex-row items-center justify-between py-[14px] px-4 rounded-xl mb-2',
                  isSelected && 'bg-accent',
                  isLocked && 'opacity-70'
                )}
                onPress={() => handleModelPress(model)}
              >
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center">
                    <Text
                      className={cn(
                        'text-base font-medium mb-0.5',
                        isLocked ? 'text-muted-foreground' : 'text-foreground'
                      )}
                      numberOfLines={1}
                    >
                      {model.name}
                    </Text>
                    {isLocked && (
                      <View className="ml-1.5">
                        <LockIcon size={14} color={colors.mutedForeground} />
                      </View>
                    )}
                  </View>
                  {model.provider && (
                    <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
                      {model.provider}
                    </Text>
                  )}
                </View>
                {isSelected && !isLocked && <CheckIcon size={20} color={colors.primary} />}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
