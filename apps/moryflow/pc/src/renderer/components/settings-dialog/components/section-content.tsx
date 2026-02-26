/**
 * [PROPS]: SectionContentProps - 设置页分区渲染参数
 * [EMITS]: none
 * [POS]: Settings Dialog 分区内容渲染（含 System Prompt 设置）
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import type { UseFieldArrayReturn } from 'react-hook-form';
import type { ReactNode } from 'react';
import type { FormValues, SettingsSection } from '../const';
import type { SettingsDialogState } from '../use-settings-dialog';
import { AccountSection } from './account-section';
import { GeneralSection } from './general-section';
import { SystemPromptSection } from './system-prompt-section';
import { ProvidersSection } from './providers-section';
import { McpSection } from './mcp-section';
import { CloudSyncSection } from './cloud-sync-section';
import { AboutSection } from './about-section';
import { LoadingHint } from './shared';

type SectionContentProps = {
  section: SettingsSection;
  meta: {
    isLoading: boolean;
    appVersion: string | null;
  };
  form: SettingsDialogState['form'];
  setValue: SettingsDialogState['form']['setValue'];
  providers: SettingsDialogState['providers'];
  mcp: {
    stdioArray: UseFieldArrayReturn<FormValues, 'mcp.stdio'>;
    httpArray: UseFieldArrayReturn<FormValues, 'mcp.streamableHttp'>;
  };
  vaultPath?: string | null;
};

/**
 * 按当前选项渲染具体的设置区域。
 */
export const SectionContent = ({
  section,
  meta,
  form,
  providers,
  mcp,
  vaultPath,
  setValue,
}: SectionContentProps) => {
  const renderSettingsGuard = (content: ReactNode) => {
    if (meta.isLoading) {
      return <LoadingHint text="Loading settings..." />;
    }
    return content;
  };

  switch (section) {
    case 'account':
      return <AccountSection />;
    case 'general':
      return renderSettingsGuard(<GeneralSection control={form.control} />);
    case 'system-prompt':
      return renderSettingsGuard(<SystemPromptSection control={form.control} setValue={setValue} />);
    case 'providers':
      return <ProvidersSection providers={providers} form={form} isLoading={meta.isLoading} />;
    case 'mcp':
      return (
        <McpSection
          control={form.control}
          register={form.register}
          errors={form.errors}
          stdioArray={mcp.stdioArray}
          httpArray={mcp.httpArray}
          setValue={form.setValue}
          isLoading={meta.isLoading}
        />
      );
    case 'cloud-sync':
      return <CloudSyncSection vaultPath={vaultPath} />;
    default:
      return <AboutSection appVersion={meta.appVersion} />;
  }
};
