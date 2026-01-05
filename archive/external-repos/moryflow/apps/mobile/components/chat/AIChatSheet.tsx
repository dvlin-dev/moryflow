/**
 * AI 聊天底部抽屉
 * 
 * 使用 @gorhom/bottom-sheet 实现高性能原生底部抽屉
 * - 流畅的 60fps 手势动画
 * - 多个 Snap 点支持
 * - 键盘自动避让
 */

import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { View } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/lib/hooks/use-theme';
import { useThemeColors } from '@/lib/theme';
import { ChatScreen } from './ChatScreen';

interface AIChatSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AIChatSheet({ visible, onClose }: AIChatSheetProps) {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const { colorScheme } = useTheme();
  const colors = useThemeColors();
  const isDark = colorScheme === 'dark';

  // Snap 点：92% 屏幕高度
  const snapPoints = useMemo(() => ['92%'], []);

  // 每次打开时递增 key，强制 ChatScreen 重新挂载
  const [mountKey, setMountKey] = useState(0);
  const prevVisibleRef = useRef(visible);

  // 控制显示/隐藏
  useEffect(() => {
    if (visible) {
      // visible 从 false 变为 true 时，递增 key 触发重新挂载
      if (!prevVisibleRef.current) {
        setMountKey(prev => prev + 1);
      }
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
    prevVisibleRef.current = visible;
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

  // 深色背景色（与 ChatScreen 保持一致）
  const sheetBackground = isDark ? 'rgb(10, 10, 12)' : colors.background;

  // 自定义背景组件（用于圆角）
  const renderBackground = useCallback(() => (
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
  ), [sheetBackground]);

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
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      style={{
        // iOS 风格阴影
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
        <ChatScreen key={mountKey} showHeader={true} isInSheet={true} onClose={onClose} />
      </View>
    </BottomSheetModal>
  );
}
