import '@/polyfills';
import 'react-native-gesture-handler';
import 'react-native-reanimated';
import '@/global.css';
import 'react-native-get-random-values';

import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { NAV_THEME } from '@/lib/theme';
import { MembershipProvider } from '@/lib/server';
import { ModelProvider } from '@/lib/models';
import { AuthProvider, useAuth } from '@/lib/contexts/auth.context';
import { AuthGuardProvider } from '@/lib/contexts/auth-guard.context';
import { ChatSheetProvider, useChatSheet } from '@/lib/contexts/chat-sheet.context';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Uniwind, useUniwind } from 'uniwind';
import * as React from 'react';
import { useAppLifecycle } from '@/lib/hooks/use-app-lifecycle';
import { useEffect } from 'react';
import { globalStreamManager } from '@/lib/utils/global-stream-manager';
import { ToastProvider } from '@/lib/contexts/toast.context';
import { ToastContainer } from '@/components/ui/toast-container';
import { I18nProvider } from '@/lib/i18n';
import { AIChatSheet } from '@/components/chat/AIChatSheet';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootLayoutContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutContent() {
  // uniwind: useUniwind() 返回 { theme, hasAdaptiveThemes }
  const { theme } = useUniwind();
  // 确保 colorScheme 是 'light' 或 'dark' 类型
  const colorScheme = (theme === 'dark' ? 'dark' : 'light') as 'light' | 'dark';
  const insets = useSafeAreaInsets();

  // uniwind: 同步 safe area insets 以支持 p-safe、m-safe 等 className
  useEffect(() => {
    Uniwind.updateInsets(insets);
  }, [insets]);

  // 初始化应用生命周期监听（进入后台不关闭流，仅记录状态，预留扩展）
  useAppLifecycle();
  // 页面卸载/热重载时，清理所有流（安全兜底）
  useEffect(() => {
    return () => {
      globalStreamManager.cleanupAll();
    };
  }, []);

  return (
    <KeyboardProvider>
      <I18nProvider>
        <MembershipProvider>
          <ModelProvider>
            <AuthProvider>
              <AuthGuardProvider>
                <ToastProvider>
                  <ChatSheetProvider>
                    <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
                      <BottomSheetModalProvider>
                        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
                        <Routes />
                        <PortalHost />
                        <ToastContainer />
                      </BottomSheetModalProvider>
                    </ThemeProvider>
                  </ChatSheetProvider>
                </ToastProvider>
              </AuthGuardProvider>
            </AuthProvider>
          </ModelProvider>
        </MembershipProvider>
      </I18nProvider>
    </KeyboardProvider>
  );
}

SplashScreen.preventAutoHideAsync();

function Routes() {
  const { isLoaded } = useAuth();
  const { isChatOpen, closeChat } = useChatSheet();

  React.useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  if (!isLoaded) {
    return null;
  }

  // 延迟鉴权模式：所有页面默认可访问，关键操作时再触发登录
  return (
    <View style={{ flex: 1 }}>
      <Stack>
        {/* 根路由重定向到 tabs */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* 主要页面 - 自定义底部导航 */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* 编辑器页面 */}
        <Stack.Screen
          name="(editor)"
          options={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        />

        {/* 认证相关页面 */}
        <Stack.Screen name="(auth)/sign-in" options={SIGN_IN_SCREEN_OPTIONS} />
        <Stack.Screen name="(auth)/sign-up" options={SIGN_UP_SCREEN_OPTIONS} />
        <Stack.Screen name="(auth)/forgot-password" options={DEFAULT_AUTH_SCREEN_OPTIONS} />
        <Stack.Screen name="(auth)/verify-email" options={DEFAULT_AUTH_SCREEN_OPTIONS} />

        {/* 设置页面 - Modal 呈现 */}
        <Stack.Screen name="(settings)" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>

      {/* AI 聊天底部抽屉 */}
      <AIChatSheet visible={isChatOpen} onClose={closeChat} />
    </View>
  );
}

const SIGN_IN_SCREEN_OPTIONS = {
  headerShown: false,
  title: 'Sign in',
};

const SIGN_UP_SCREEN_OPTIONS = {
  presentation: 'modal',
  title: '',
  headerTransparent: true,
  gestureEnabled: false,
} as const;

const DEFAULT_AUTH_SCREEN_OPTIONS = {
  title: '',
  headerShadowVisible: false,
  headerTransparent: true,
};
