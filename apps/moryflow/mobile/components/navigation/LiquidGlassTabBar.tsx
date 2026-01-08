/**
 * 液态玻璃导航栏组件
 *
 * 使用 expo-glass-effect 实现 iOS 26 原生液态玻璃效果
 * - 左侧：3个导航按钮组（首页、搜索、草稿）- 液态玻璃背景
 * - 右侧：AI 按钮 - 液态玻璃 + 主色调
 *
 * 降级处理：iOS 26- 或其他平台使用 BlurView fallback
 */

import React, { useMemo } from 'react';
import { View, Pressable, Platform } from 'react-native';
import { useRouter, usePathname, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { GlassView, GlassContainer, isLiquidGlassAvailable } from 'expo-glass-effect';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/lib/hooks/use-theme';
import { useThemeColors } from '@/lib/theme';
import { GlassButtonContainer } from '@/components/ui/glass-button-container';
import { HomeIcon, SearchIcon, SquarePenIcon, SparklesIcon, LucideIcon } from 'lucide-react-native';

interface TabItem {
  name: string;
  route: Href;
  icon: LucideIcon;
}

const TAB_ITEMS: TabItem[] = [
  { name: 'index', route: '/(tabs)', icon: HomeIcon },
  { name: 'search', route: '/(tabs)/search', icon: SearchIcon },
  { name: 'drafts', route: '/(tabs)/drafts', icon: SquarePenIcon },
];

interface LiquidGlassTabBarProps {
  /** 控制显示/隐藏 */
  visible?: boolean;
  /** 点击 AI 按钮的回调 */
  onAIPress?: () => void;
}

export function LiquidGlassTabBar({ visible = true, onAIPress }: LiquidGlassTabBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colorScheme } = useTheme();
  const colors = useThemeColors();

  const isDark = colorScheme === 'dark';

  // 检测液态玻璃是否可用
  const glassAvailable = useMemo(() => {
    try {
      return Platform.OS === 'ios' && isLiquidGlassAvailable();
    } catch {
      return false;
    }
  }, []);

  // 动画：显示/隐藏（柔和的 ease-out 过渡）
  const translateY = useSharedValue(0);
  React.useEffect(() => {
    translateY.value = withTiming(visible ? 0 : 140, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const getIsActive = (route: string) => {
    if (route === '/(tabs)') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/index';
    }
    return pathname.includes(route.replace('/(tabs)', ''));
  };

  const handleTabPress = (route: Href) => {
    router.push(route);
  };

  const handleAIPress = () => {
    onAIPress?.();
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
      {TAB_ITEMS.map((tab) => {
        const isActive = getIsActive(tab.route);
        const IconComponent = tab.icon;
        return (
          <Pressable
            key={tab.name}
            onPress={() => handleTabPress(tab.route)}
            style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
            <IconComponent
              size={24}
              color={isActive ? colors.icon : colors.iconMuted}
              strokeWidth={isActive ? 2.5 : 1.5}
            />
          </Pressable>
        );
      })}
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
          <GlassView
            style={{ borderRadius: 9999 }}
            glassEffectStyle="regular"
            isInteractive={false}>
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
    <Pressable onPress={handleAIPress}>
      <GlassButtonContainer
        size={48}
        tintColor={colors.glassAiButton}
        fallbackColor={colors.glassAiButton}>
        <SparklesIcon size={20} color={colors.glassAiButtonIcon} strokeWidth={2} />
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
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 12,
        },
        animatedStyle,
      ]}>
      {renderContent()}
    </Animated.View>
  );
}
