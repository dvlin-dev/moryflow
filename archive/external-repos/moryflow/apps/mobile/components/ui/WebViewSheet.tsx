/**
 * WebView BottomSheet 组件
 *
 * 用于在底部抽屉中显示网页内容（如反馈、关于我们页面）
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, ActivityIndicator, Platform, Pressable } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/hooks/use-theme';
import { useThemeColors } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import { XIcon } from 'lucide-react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';

interface WebViewSheetProps {
  /** 是否显示 */
  visible: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 网页 URL */
  url: string;
  /** 标题 */
  title?: string;
}

export function WebViewSheet({ visible, onClose, url, title }: WebViewSheetProps) {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const { colorScheme } = useTheme();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  // Snap 点：90% 屏幕高度
  const snapPoints = useMemo(() => ['90%'], []);

  // 检测液态玻璃是否可用
  const glassAvailable = useMemo(() => {
    try {
      return Platform.OS === 'ios' && isLiquidGlassAvailable();
    } catch {
      return false;
    }
  }, []);

  // 控制显示/隐藏
  useEffect(() => {
    if (visible) {
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [visible]);

  // 关闭回调
  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  // 自定义背景遮罩
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={isDark ? 0.6 : 0.4}
        pressBehavior="close"
      />
    ),
    [isDark]
  );

  // 背景色
  const sheetBackground = isDark ? 'rgb(20, 20, 22)' : colors.background;

  // 自定义背景组件
  const renderBackground = useCallback(
    () => (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: sheetBackground,
        }}
      />
    ),
    [sheetBackground]
  );

  // 渲染 Header
  const renderHeader = () => {
    const headerContent = (
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        <View style={{ width: 32 }} />
        {title && (
          <Text
            style={{ flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.textPrimary }}
            numberOfLines={1}
          >
            {title}
          </Text>
        )}
        <Pressable onPress={onClose} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <XIcon size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    );

    if (glassAvailable) {
      return (
        <View style={{ borderBottomWidth: 0.5, borderBottomColor: colors.glassBorder }}>
          <GlassView style={{ height: 48 }} glassEffectStyle="regular" isInteractive={false}>
            {headerContent}
          </GlassView>
        </View>
      );
    }

    // Fallback: BlurView
    return (
      <View style={{ borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        <BlurView intensity={isDark ? 60 : 80} tint={isDark ? 'dark' : 'light'} style={{ height: 48 }}>
          <View
            style={{ flex: 1, backgroundColor: isDark ? 'rgba(20, 20, 22, 0.9)' : 'rgba(255, 255, 255, 0.9)' }}
          >
            {headerContent}
          </View>
        </BlurView>
      </View>
    );
  };

  // WebView 加载指示器
  const renderLoading = () => (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={colors.spinner} />
    </View>
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      snapPoints={snapPoints}
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundComponent={renderBackground}
      handleComponent={null}
      enablePanDownToClose={true}
      enableDynamicSizing={false}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 20,
      }}
    >
      <View
        style={{
          flex: 1,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          overflow: 'hidden',
          backgroundColor: sheetBackground,
        }}
      >
        {renderHeader()}
        <WebView
          source={{ uri: url }}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          startInLoadingState={true}
          renderLoading={renderLoading}
          scalesPageToFit={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          // 适配暗色模式
          injectedJavaScript={
            isDark
              ? `
            (function() {
              document.documentElement.style.colorScheme = 'dark';
            })();
          `
              : ''
          }
        />
        {/* 底部安全区域 */}
        <View style={{ height: insets.bottom, backgroundColor: sheetBackground }} />
      </View>
    </BottomSheetModal>
  );
}
