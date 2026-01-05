import React from 'react';
import { TextProps, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { cn } from '@/lib/utils';

export interface TextShimmerProps extends TextProps {
  children: string;
  className?: string;
  duration?: number;
}

// 创建一个扫光效果，通过单个渐变文字实现
function TextShimmerComponent({
  children,
  className,
  duration = 2000,
  style,
  ...props
}: TextShimmerProps) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    // 创建一个从 -1 到 2 的动画，让高亮从左扫到右
    progress.value = withRepeat(
      withTiming(2, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [duration, progress]);

  // 创建三层文字：底层、中层高亮、顶层遮罩
  const baseAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: 0.5, // 基础透明度
    };
  });

  const highlightAnimatedStyle = useAnimatedStyle(() => {
    // 创建一个移动的高亮区域
    const position = progress.value;
    
    // 通过改变透明度创建扫光效果
    // 当 position 在 0-1 之间时显示高亮
    const opacity = interpolate(
      position,
      [-0.3, 0, 1, 1.3],
      [0, 1, 1, 0]
    );
    
    return {
      opacity,
    };
  });

  return (
    <View className="relative flex-row">
      {/* 底层半透明文字 */}
      <Animated.Text 
        className={cn('text-base', className)} 
        style={[style, baseAnimatedStyle]} 
        {...props}>
        {children}
      </Animated.Text>
      
      {/* 高亮扫光层 */}
      <Animated.Text 
        className={cn('text-base absolute top-0 left-0', className)} 
        style={[style, highlightAnimatedStyle]} 
        {...props}>
        {children}
      </Animated.Text>
    </View>
  );
}

// 波浪效果版本 - 每个字符独立动画
const WaveTextShimmer: React.FC<TextShimmerProps> = ({ 
  children, 
  className, 
  duration = 2000,
  style,
  ...props 
}) => {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [duration, progress]);

  // 预先拆分字符
  const characters = children.split('');
  
  // 为每个字符创建动画样式 - 必须在顶层调用所有 hooks
  const animatedStyle0 = useAnimatedStyle(() => {
    const charProgress = (progress.value + 1) % 1;
    return { opacity: interpolate(charProgress, [0, 0.15, 0.3, 0.45, 1], [0.3, 1, 1, 0.3, 0.3]) };
  });
  
  const animatedStyle1 = useAnimatedStyle(() => {
    const charProgress = (progress.value - 0.15 + 1) % 1;
    return { opacity: interpolate(charProgress, [0, 0.15, 0.3, 0.45, 1], [0.3, 1, 1, 0.3, 0.3]) };
  });
  
  const animatedStyle2 = useAnimatedStyle(() => {
    const charProgress = (progress.value - 0.3 + 1) % 1;
    return { opacity: interpolate(charProgress, [0, 0.15, 0.3, 0.45, 1], [0.3, 1, 1, 0.3, 0.3]) };
  });
  
  const animatedStyle3 = useAnimatedStyle(() => {
    const charProgress = (progress.value - 0.45 + 1) % 1;
    return { opacity: interpolate(charProgress, [0, 0.15, 0.3, 0.45, 1], [0.3, 1, 1, 0.3, 0.3]) };
  });
  
  const animatedStyle4 = useAnimatedStyle(() => {
    const charProgress = (progress.value - 0.6 + 1) % 1;
    return { opacity: interpolate(charProgress, [0, 0.15, 0.3, 0.45, 1], [0.3, 1, 1, 0.3, 0.3]) };
  });
  
  const animatedStyle5 = useAnimatedStyle(() => {
    const charProgress = (progress.value - 0.75 + 1) % 1;
    return { opacity: interpolate(charProgress, [0, 0.15, 0.3, 0.45, 1], [0.3, 1, 1, 0.3, 0.3]) };
  });
  
  const animatedStyle6 = useAnimatedStyle(() => {
    const charProgress = (progress.value - 0.9 + 1) % 1;
    return { opacity: interpolate(charProgress, [0, 0.15, 0.3, 0.45, 1], [0.3, 1, 1, 0.3, 0.3]) };
  });
  
  const animatedStyle7 = useAnimatedStyle(() => {
    const charProgress = (progress.value - 1.05 + 1) % 1;
    return { opacity: interpolate(charProgress, [0, 0.15, 0.3, 0.45, 1], [0.3, 1, 1, 0.3, 0.3]) };
  });
  
  const animatedStyle8 = useAnimatedStyle(() => {
    const charProgress = (progress.value - 1.2 + 1) % 1;
    return { opacity: interpolate(charProgress, [0, 0.15, 0.3, 0.45, 1], [0.3, 1, 1, 0.3, 0.3]) };
  });
  
  const animatedStyle9 = useAnimatedStyle(() => {
    const charProgress = (progress.value - 1.35 + 1) % 1;
    return { opacity: interpolate(charProgress, [0, 0.15, 0.3, 0.45, 1], [0.3, 1, 1, 0.3, 0.3]) };
  });
  
  const animatedStyle10 = useAnimatedStyle(() => {
    const charProgress = (progress.value - 1.5 + 1) % 1;
    return { opacity: interpolate(charProgress, [0, 0.15, 0.3, 0.45, 1], [0.3, 1, 1, 0.3, 0.3]) };
  });
  
  // 创建样式数组
  const animatedStyles = [
    animatedStyle0, animatedStyle1, animatedStyle2, animatedStyle3, animatedStyle4,
    animatedStyle5, animatedStyle6, animatedStyle7, animatedStyle8, animatedStyle9,
    animatedStyle10
  ];

  return (
    <View className="flex-row">
      {characters.map((char, index) => (
        <Animated.Text
          key={`${index}`}
          className={cn('text-base', className)}
          style={[style, animatedStyles[index % animatedStyles.length]]}
          {...props}>
          {char === ' ' ? '\u00A0' : char}
        </Animated.Text>
      ))}
    </View>
  );
};

// 导出扫光版本作为默认
export const TextShimmer = React.memo(TextShimmerComponent);

// 导出波浪版本作为可选
export const TextShimmerWave = React.memo(WaveTextShimmer);

// 兼容旧的 ThinkingDots 组件
export function ThinkingDots({ className }: { className?: string }) {
  return (
    <TextShimmer 
      className={cn('text-sm text-muted-foreground', className)} 
      duration={1500}>
      thinking...
    </TextShimmer>
  );
}