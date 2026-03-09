/**
 * [PROPS]: PreThreadViewProps - 预对话欢迎页布局配置
 * [EMITS]: 通过共享 ChatComposer 触发提交、设置、模式切换
 * [POS]: ChatPane 在未选中 session 时的右侧/主区欢迎界面
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ChatComposer } from './chat-composer';
import type { ChatPromptSuggestion } from './chat-prompt-input/const';

type PreThreadViewProps = {
  variant?: 'panel' | 'mode';
  submitMode?: 'default' | 'new-thread';
};

export const PreThreadView = ({ variant = 'mode', submitMode = 'default' }: PreThreadViewProps) => {
  const { t } = useTranslation('chat');

  const suggestions = useMemo<ChatPromptSuggestion[]>(
    () => [
      {
        id: 'summarize-note',
        title: t('preThreadSuggestionSummarizeTitle'),
        prompt: t('preThreadSuggestionSummarizePrompt'),
      },
      {
        id: 'execution-plan',
        title: t('preThreadSuggestionPlanTitle'),
        prompt: t('preThreadSuggestionPlanPrompt'),
      },
      {
        id: 'next-actions',
        title: t('preThreadSuggestionActionsTitle'),
        prompt: t('preThreadSuggestionActionsPrompt'),
      },
      {
        id: 'publish-outline',
        title: t('preThreadSuggestionPublishTitle'),
        prompt: t('preThreadSuggestionPublishPrompt'),
      },
    ],
    [t]
  );

  const shellClassName =
    variant === 'panel'
      ? 'mx-auto w-full max-w-[34rem] px-6 py-10'
      : 'mx-auto w-full max-w-[46rem] px-8 py-12';

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,rgba(86,123,255,0.14),transparent_65%)]" />
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
        <div className={cn('relative space-y-8', shellClassName)}>
          <div className="space-y-4">
            <div className="inline-flex rounded-full border border-border/70 bg-background/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              {t('preThreadEyebrow')}
            </div>
            <div className="space-y-3">
              <h1
                className={cn(
                  'max-w-[12ch] text-balance font-medium tracking-tight text-foreground',
                  variant === 'panel' ? 'text-[2rem] leading-[1.05]' : 'text-[3rem] leading-[0.98]'
                )}
              >
                {t('preThreadTitle')}
              </h1>
              <p className="max-w-[46ch] text-[15px] leading-7 text-muted-foreground">
                {t('preThreadDescription')}
              </p>
            </div>
          </div>

          <ChatComposer variant="prethread" submitMode={submitMode} suggestions={suggestions} />
        </div>
      </div>
    </div>
  );
};
