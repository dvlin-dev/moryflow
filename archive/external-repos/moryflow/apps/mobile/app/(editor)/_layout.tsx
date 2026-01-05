import { Stack, router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ChevronLeftIcon } from 'lucide-react-native';

/**
 * 编辑器路由布局
 * 使用原生导航栏
 */
export default function EditorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: '',
        headerBackTitle: '',
        headerTransparent: true,
        headerBlurEffect: 'regular',
        headerShadowVisible: false,
        animation: 'slide_from_right',
        headerLeft: () => (
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <Icon as={ChevronLeftIcon} className="size-6 text-foreground" />
          </Button>
        ),
      }}
    />
  );
}
