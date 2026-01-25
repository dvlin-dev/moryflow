/**
 * [PROVIDES]: LiquidGlassTabBar - 自定义底部导航栏（液态玻璃 + Tabs）
 * [DEPENDS]: Expo Router Tabs, @react-navigation/bottom-tabs, expo-glass-effect, expo-blur
 * [POS]: Moryflow Mobile 全局底部导航栏（仅在 Tabs 组内渲染），第三个按钮为「快速创建草稿」动作
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { useMemo } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { GlassView, GlassContainer, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@/lib/hooks/use-theme';
import { useThemeColors } from '@/lib/theme';
import { GlassButtonContainer } from '@/components/ui/glass-button-container';
import {
  HomeIcon,
  SearchIcon,
  SquarePenIcon,
  SparklesIcon,
  type AppIcon,
} from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';

const TAB_ITEM_DEFS = {
  index: { icon: HomeIcon, accessibilityLabel: 'Home' },
  search: { icon: SearchIcon, accessibilityLabel: 'Search' },
} satisfies Record<string, { icon: AppIcon; accessibilityLabel: string }>;

type TabKey = keyof typeof TAB_ITEM_DEFS;

const isRouteGroupSegment = (segment: string): boolean =>
  segment.startsWith('(') && segment.endsWith(')');

const getTabRouteKey = (routeName: string): string => {
  // 例：
  // - "index" -> "index"
  // - "search" -> "search"
  // - "(tabs)/search/index" -> "search"
  const parts = routeName
    .split('/')
    .filter(Boolean)
    .filter((segment) => !isRouteGroupSegment(segment));

  if (parts.length >= 2 && parts[parts.length - 1] === 'index') {
    parts.pop();
  }

  return parts[0] ?? routeName;
};

interface LiquidGlassTabBarProps extends BottomTabBarProps {
  /** 点击 AI 按钮的回调 */
  onAIPress?: () => void;
  /** 点击「快速创建草稿」的回调（不属于 tabs 路由） */
  onQuickCreatePress?: () => void;
}

export function LiquidGlassTabBar({
  state,
  navigation,
  onAIPress,
  onQuickCreatePress,
}: LiquidGlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = useThemeColors();

  const isDark = colorScheme === 'dark';
  const activeRouteKey = state.routes[state.index]?.key;

  // 检测液态玻璃是否可用
  const glassAvailable = useMemo(() => {
    try {
      return Platform.OS === 'ios' && isLiquidGlassAvailable();
    } catch {
      return false;
    }
  }, []);

  const handleTabPress = (targetKey: string, routeName: string) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: targetKey,
      canPreventDefault: true,
    });

    if (event.defaultPrevented) return;
    navigation.navigate(routeName as never);
  };

  const handleTabLongPress = (targetKey: string) => {
    navigation.emit({ type: 'tabLongPress', target: targetKey });
  };

  const handleAIPress = () => {
    onAIPress?.();
  };

  const handleQuickCreatePress = () => {
    onQuickCreatePress?.();
  };

  // 渲染导航组的玻璃背景
  const renderNavGlassContent = () => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        gap: 6,
      }}>
      {state.routes.flatMap((route) => {
        const tabKey = getTabRouteKey(route.name);
        const def = TAB_ITEM_DEFS[tabKey as TabKey];
        if (!def) return [];

        const isActive = route.key === activeRouteKey;
        const IconComponent = def.icon;
        return (
          <Pressable
            key={route.key}
            onPress={() => handleTabPress(route.key, route.name)}
            onLongPress={() => handleTabLongPress(route.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={def.accessibilityLabel}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <IconComponent
              size={24}
              color={isActive ? colors.icon : colors.iconMuted}
              strokeWidth={isActive ? 2.5 : 1.5}
            />
          </Pressable>
        );
      })}

      {/* 第三个按钮：快速创建草稿（动作按钮，不参与 tabs 选中态） */}
      <Pressable
        onPress={handleQuickCreatePress}
        accessibilityRole="button"
        accessibilityLabel="Quick create draft"
        style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
        <Icon as={SquarePenIcon} size={24} color={colors.iconMuted} strokeWidth={1.5} />
      </Pressable>
    </View>
  );

  // 渲染导航组玻璃背景
  const renderNavGlass = () => {
    if (glassAvailable) {
      return (
        <View
          style={{
            borderRadius: 9999,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.glassNavBorder,
          }}>
          <GlassView style={{ borderRadius: 9999 }} glassEffectStyle="regular" isInteractive>
            {renderNavGlassContent()}
          </GlassView>
        </View>
      );
    }

    // Fallback: 使用 BlurView
    return (
      <View
        style={{
          borderRadius: 9999,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.glassNavBorder,
        }}>
        <BlurView
          intensity={isDark ? 40 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={{ borderRadius: 9999, overflow: 'hidden' }}>
          <View style={{ borderRadius: 9999, backgroundColor: colors.glassNavBackground }}>
            {renderNavGlassContent()}
          </View>
        </BlurView>
      </View>
    );
  };

  // 渲染 AI 按钮
  const renderAIButton = () => (
    <Pressable onPress={handleAIPress} accessibilityRole="button" accessibilityLabel="AI">
      <GlassButtonContainer
        size={48}
        tintColor={colors.glassAiButton}
        fallbackColor={colors.glassAiButton}>
        <Icon as={SparklesIcon} size={20} color={colors.glassAiButtonIcon} strokeWidth={2} />
      </GlassButtonContainer>
    </Pressable>
  );

  // 使用 GlassContainer 让两个玻璃元素融合
  const renderContent = () => {
    if (glassAvailable) {
      return (
        <GlassContainer spacing={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {renderNavGlass()}
          {renderAIButton()}
        </GlassContainer>
      );
    }

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {renderNavGlass()}
        {renderAIButton()}
      </View>
    );
  };

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 12,
      }}>
      {renderContent()}
    </View>
  );
}
