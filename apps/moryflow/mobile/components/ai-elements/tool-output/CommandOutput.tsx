/**
 * [PROPS]: CommandOutputProps
 * [POS]: Mobile 端命令执行结果展示
 * [UPDATE]: 2026-03-02 - 元信息与流标签文案接入 i18n（chat 命名空间）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Terminal, FileText } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useTranslation } from '@/lib/i18n';
import { useThemeColors } from '@/lib/theme';
import type { CommandResult } from './const';

interface CommandOutputProps {
  result: CommandResult;
}

export function CommandOutput({ result }: CommandOutputProps) {
  const colors = useThemeColors();
  const { t } = useTranslation('chat');

  return (
    <View className="border-border/60 bg-muted/30 gap-3 rounded-lg border p-3">
      {/* 元信息 */}
      <CommandMeta result={result} />

      {/* stdout */}
      {result.stdout && (
        <StreamSection
          icon={<Icon as={Terminal} size={14} color={colors.textSecondary} />}
          label={t('stdoutLabel')}
          content={result.stdout}
        />
      )}

      {/* stderr */}
      {result.stderr && (
        <StreamSection
          icon={<Icon as={FileText} size={14} color={colors.textSecondary} />}
          label={t('stderrLabel')}
          content={result.stderr}
          muted
        />
      )}
    </View>
  );
}

interface CommandMetaProps {
  result: CommandResult;
}

function CommandMeta({ result }: CommandMetaProps) {
  const { t } = useTranslation('chat');
  const items: Array<{ label: string; value: string }> = [];

  if (result.command) {
    const fullCommand = [result.command, ...(result.args ?? [])].join(' ');
    items.push({ label: t('commandLabel'), value: fullCommand });
  }
  if (result.cwd) {
    items.push({ label: t('cwdLabel'), value: result.cwd });
  }
  if (typeof result.exitCode === 'number') {
    items.push({ label: t('exitLabel'), value: String(result.exitCode) });
  }
  if (typeof result.durationMs === 'number') {
    items.push({ label: t('durationLabel'), value: `${result.durationMs} ms` });
  }

  if (items.length === 0) return null;

  return (
    <View className="flex-row flex-wrap gap-3">
      {items.map((item) => (
        <View key={item.label} className="flex-row items-center gap-1">
          <Text className="text-muted-foreground text-xs font-medium">{item.label}:</Text>
          <Text className="font-mono text-xs">{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

interface StreamSectionProps {
  icon: React.ReactNode;
  label: string;
  content: string;
  muted?: boolean;
}

function StreamSection({ icon, label, content, muted }: StreamSectionProps) {
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-1">
        {icon}
        <Text className="text-muted-foreground text-xs font-medium uppercase">{label}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className={`border-border/60 bg-background rounded-lg border ${muted ? 'opacity-80' : ''}`}>
        <View className="p-2">
          <Text className="font-mono text-xs">{content}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
