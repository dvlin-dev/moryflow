import { Stack } from 'expo-router';

/**
 * 编辑器路由布局
 *
 * 约束：
 * - 只使用自定义悬浮返回按钮（液态玻璃 BackButton）
 * - 禁止使用原生 header 返回按钮，避免返回栈异常/点击命中不一致
 */
export default function EditorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}
