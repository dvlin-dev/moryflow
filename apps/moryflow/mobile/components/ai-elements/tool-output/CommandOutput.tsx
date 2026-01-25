/**
 * 命令执行输出组件
 */

import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Terminal, FileText } from '@/components/ui/icons';
import { Icon } from '@/components/ui/icon';
import { useThemeColors } from '@/lib/theme';
import type { CommandResult } from './const';

interface CommandOutputProps {
  result: CommandResult;
}

export function CommandOutput({ result }: CommandOutputProps) {
  const colors = useThemeColors();

  return (
    <View className="border-border/60 bg-muted/30 gap-3 rounded-lg border p-3">
      {/* 元信息 */}
      <CommandMeta result={result} />

      {/* stdout */}
      {result.stdout && (
        <StreamSection
          icon={<Icon as={Terminal} size={14} color={colors.textSecondary} />}
          label="stdout"
          content={result.stdout}
        />
      )}

      {/* stderr */}
      {result.stderr && (
        <StreamSection
          icon={<Icon as={FileText} size={14} color={colors.textSecondary} />}
          label="stderr"
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
  const items: Array<{ label: string; value: string }> = [];

  if (result.command) {
    const fullCommand = [result.command, ...(result.args ?? [])].join(' ');
    items.push({ label: 'Command', value: fullCommand });
  }
  if (result.cwd) {
    items.push({ label: 'cwd', value: result.cwd });
  }
  if (typeof result.exitCode === 'number') {
    items.push({ label: 'Exit', value: String(result.exitCode) });
  }
  if (typeof result.durationMs === 'number') {
    items.push({ label: 'Duration', value: `${result.durationMs} ms` });
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
