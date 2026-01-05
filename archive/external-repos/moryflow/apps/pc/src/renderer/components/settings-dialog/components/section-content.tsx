import type { UseFieldArrayReturn } from 'react-hook-form'
import type { FormValues, SettingsSection } from '../const'
import type { SettingsDialogState } from '../use-settings-dialog'
import { AccountSection } from './account-section'
import { GeneralSection } from './general-section'
import { ProvidersSection } from './providers-section'
import { McpSection } from './mcp-section'
import { CloudSyncSection } from './cloud-sync-section'
import { AboutSection } from './about-section'
import { LoadingHint } from './shared'

type SectionContentProps = {
  section: SettingsSection
  meta: {
    isLoading: boolean
    appVersion: string | null
  }
  form: SettingsDialogState['form']
  providers: SettingsDialogState['providers']
  mcp: {
    stdioArray: UseFieldArrayReturn<FormValues, 'mcp.stdio'>
    httpArray: UseFieldArrayReturn<FormValues, 'mcp.streamableHttp'>
  }
  vaultPath?: string | null
}

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
}: SectionContentProps) => {
  if (section === 'account') {
    return <AccountSection />
  }
  if (section === 'general') {
    return meta.isLoading ? (
      <LoadingHint text="正在加载配置…" />
    ) : (
      <GeneralSection control={form.control} />
    )
  }
  if (section === 'providers') {
    return <ProvidersSection providers={providers} form={form} />
  }
  if (section === 'mcp') {
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
    )
  }
  if (section === 'cloud-sync') {
    return <CloudSyncSection vaultPath={vaultPath} />
  }
  return <AboutSection appVersion={meta.appVersion} />
}
