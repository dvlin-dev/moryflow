/**
 * [PROPS]: DiffOutputProps
 * [POS]: Mobile 端 Diff 结果展示
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import * as React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import type { DiffResult } from './const';
import { useTranslation } from '@/lib/i18n';

interface DiffOutputProps {
  result: DiffResult;
}

export function DiffOutput({ result }: DiffOutputProps) {
  const { t } = useTranslation('chat');

  return (
    <View className="border-border/60 bg-muted/30 gap-3 rounded-lg border p-3">
      {/* 目标文件 */}
      {result.path && (
        <Text className="text-muted-foreground text-xs">
          {t('targetFile')}: <Text className="font-mono">{result.path}</Text>
        </Text>
      )}

      {/* 修改说明 */}
      {result.rationale && <Text className="text-sm">{result.rationale}</Text>}

      {/* Patch 内容 */}
      {result.patch && <DiffBlock content={result.patch} />}

      {/* Preview 内容 */}
      {result.preview && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="border-border/60 bg-background rounded-lg border">
          <View className="p-2">
            <Text className="font-mono text-xs">{result.preview}</Text>
          </View>
        </ScrollView>
      )}

      {/* 截断提示 */}
      {result.truncated && (
        <Text className="text-muted-foreground text-xs">{t('contentTooLong')}</Text>
      )}
    </View>
  );
}

interface DiffBlockProps {
  content: string;
}

function DiffBlock({ content }: DiffBlockProps) {
  const lines = content.split('\n');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="border-border/60 bg-background rounded-lg border">
      <View className="p-2">
        {lines.map((line, index) => (
          <DiffLine key={index} line={line} />
        ))}
      </View>
    </ScrollView>
  );
}

interface DiffLineProps {
  line: string;
}

function DiffLine({ line }: DiffLineProps) {
  let className = 'font-mono text-xs';

  if (line.startsWith('+') && !line.startsWith('+++')) {
    className += ' text-success';
  } else if (line.startsWith('-') && !line.startsWith('---')) {
    className += ' text-destructive';
  } else if (line.startsWith('@@')) {
    className += ' text-blue-500';
  }

  return <Text className={className}>{line}</Text>;
}
