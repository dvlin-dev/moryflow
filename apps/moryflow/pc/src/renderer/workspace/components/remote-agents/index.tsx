/**
 * [PROPS]: -
 * [EMITS]: -
 * [POS]: Home Modules 的 Remote Agents 一级页面（当前承载 Telegram 远程入口）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useTranslation } from '@/lib/i18n';
import { RemoteAgentSection } from './remote-agent-section';
import { TelegramSection } from './telegram-section';

export const RemoteAgentsPage = () => {
  const { t } = useTranslation('workspace');

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border/60 px-6 py-4">
        <h1 className="text-xl font-semibold text-foreground">{t('remoteAgentsTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('remoteAgentsSubtitle')}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4">
        <div className="mx-auto max-w-2xl pb-8">
          <RemoteAgentSection
            title={t('remoteAgentsTelegramTitle')}
            description={t('remoteAgentsTelegramDescription')}
          >
            <TelegramSection />
          </RemoteAgentSection>
        </div>
      </div>
    </div>
  );
};
