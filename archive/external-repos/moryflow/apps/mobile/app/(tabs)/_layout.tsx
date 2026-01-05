import { Stack } from 'expo-router';

/**
 * Tabs 路由布局
 * 
 * 使用普通 Stack 布局，底部导航栏由根布局的 LiquidGlassTabBar 提供
 */
export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="search" />
      <Stack.Screen name="drafts" />
    </Stack>
  );
}
