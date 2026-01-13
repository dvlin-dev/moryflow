import { Tabs, router } from 'expo-router';
import { LiquidGlassTabBar } from '@/components/navigation/LiquidGlassTabBar';
import { useChatSheet } from '@/lib/contexts/chat-sheet.context';

/**
 * Tabs 路由布局
 *
 * 最佳实践：
 * - 使用真实 Tabs（避免 push 堆栈导致返回行为异常）
 * - 第三个按钮是「快速创建草稿」动作，不对应路由
 */
export default function TabLayout() {
  const { openChat } = useChatSheet();

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <LiquidGlassTabBar
          {...props}
          onAIPress={openChat}
          onQuickCreatePress={() => router.push('/(editor)/new-draft')}
        />
      )}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
    </Tabs>
  );
}
