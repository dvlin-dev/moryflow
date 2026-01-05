import { Text } from '@/components/ui/text';
import * as React from 'react';
import { View } from 'react-native';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
}

// 密码强度配置
interface StrengthConfig {
  score: number;
  label: string;
  bgClass: string;
  textClass: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { t } = useTranslation('auth');

  const getPasswordStrength = React.useCallback(
    (pwd: string): StrengthConfig | null => {
      if (!pwd) return null;

      let score = 0;

      if (pwd.length >= 6) score++;
      if (pwd.length >= 8) score++;
      if (pwd.length >= 12) score++;
      if (/[a-z]/.test(pwd)) score++;
      if (/[A-Z]/.test(pwd)) score++;
      if (/[0-9]/.test(pwd)) score++;
      if (/[^A-Za-z0-9]/.test(pwd)) score++;

      // 使用 className 替代动态 color
      if (score <= 2) return { score: 1, label: t('weak'), bgClass: 'bg-destructive', textClass: 'text-destructive' };
      if (score <= 4) return { score: 2, label: t('medium'), bgClass: 'bg-warning', textClass: 'text-warning' };
      if (score <= 6) return { score: 3, label: t('strong'), bgClass: 'bg-success', textClass: 'text-success' };
      return { score: 4, label: t('veryStrong'), bgClass: 'bg-success', textClass: 'text-success' };
    },
    [t]
  );

  const strength = getPasswordStrength(password);

  if (!strength) return null;

  return (
    <View className="mt-2">
      <View className="flex-row gap-1 mb-1">
        {[1, 2, 3, 4].map((level) => (
          <View
            key={level}
            className={cn('flex-1 h-1 rounded-full', level <= strength.score ? strength.bgClass : 'bg-muted')}
          />
        ))}
      </View>
      <Text className={cn('text-xs', strength.textClass)}>
        {t('passwordStrength')}：{strength.label}
      </Text>
    </View>
  );
}
