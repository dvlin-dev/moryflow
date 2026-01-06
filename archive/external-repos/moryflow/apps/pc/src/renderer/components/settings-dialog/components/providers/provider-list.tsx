import { cn } from '@/lib/utils'
import { Switch } from '@moryflow/ui/components/switch'
import { Button } from '@moryflow/ui/components/button'
import { Separator } from '@moryflow/ui/components/separator'
import { Plus } from 'lucide-react'
import { getSortedProviders, getProviderById } from '@shared/model-registry'
import type { SettingsDialogState } from '../../use-settings-dialog'
import { useAuth, MEMBERSHIP_PROVIDER_ID } from '@/lib/server'
import { useTranslation } from '@/lib/i18n'

export { MEMBERSHIP_PROVIDER_ID }

type ProviderListProps = {
  providers: SettingsDialogState['providers']
  form: SettingsDialogState['form']
}

/**
 * 预设服务商列表
 * 显示所有预设服务商，点击可选中编辑
 */
export const ProviderList = ({ providers, form }: ProviderListProps) => {
  const { t } = useTranslation('settings')
  const {
    providerValues,
    customProviderValues,
    activeProviderId,
    setActiveProviderId,
    handleAddCustomProvider,
  } = providers
  const { setValue } = form
  const { isAuthenticated, user, membershipEnabled, setMembershipEnabled } = useAuth()

  const sortedPresets = getSortedProviders()
  const isMembershipActive = activeProviderId === MEMBERSHIP_PROVIDER_ID

  // 获取服务商是否启用和已配置
  const getProviderStatus = (providerId: string) => {
    const config = providerValues.find((p) => p.providerId === providerId)
    return {
      enabled: config?.enabled ?? false,
      configured: Boolean(config?.apiKey?.trim()),
    }
  }

  // 切换预设服务商启用状态
  const handleToggleProvider = (providerId: string, enabled: boolean) => {
    const index = providerValues.findIndex((p) => p.providerId === providerId)
    if (index >= 0) {
      setValue(`providers.${index}.enabled`, enabled)
    } else {
      // 如果还没有配置，添加新配置
      const currentProviders = form.getValues('providers')
      setValue('providers', [
        ...currentProviders,
        {
          providerId,
          enabled,
          apiKey: '',
          baseUrl: '',
          models: [],
          defaultModelId: null,
        },
      ])
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* 服务商列表 */}
      <div className="flex-1 overflow-y-auto">
        {/* 会员模型（登录后显示） */}
        {isAuthenticated && user && (
          <>
            <div className="p-2">
              <div
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2 cursor-pointer transition-colors',
                  isMembershipActive ? 'bg-accent' : 'hover:bg-accent/50'
                )}
                onClick={() => setActiveProviderId(MEMBERSHIP_PROVIDER_ID)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium">{t('membershipModel')}</span>
                </div>
                <Switch
                  checked={membershipEnabled}
                  onCheckedChange={setMembershipEnabled}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            <div className="px-3">
              <Separator />
            </div>
          </>
        )}

        {/* 预设服务商 */}
        <div className="space-y-1 p-2">
          {sortedPresets.map((preset) => {
            const status = getProviderStatus(preset.id)
            const isActive = activeProviderId === preset.id

            return (
              <div
                key={preset.id}
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2 cursor-pointer transition-colors',
                  isActive ? 'bg-accent' : 'hover:bg-accent/50'
                )}
                onClick={() => setActiveProviderId(preset.id)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{preset.name}</span>
                  {status.configured && (
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  )}
                </div>
                <Switch
                  checked={status.enabled}
                  onCheckedChange={(checked) => handleToggleProvider(preset.id, checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )
          })}
        </div>

        {/* 自定义服务商 */}
        {customProviderValues.length > 0 && (
          <>
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground">{t('customProviderSection')}</div>
            <div className="space-y-1 px-2">
              {customProviderValues.map((config, index) => {
                const isActive = activeProviderId === config.providerId

                return (
                  <div
                    key={config.providerId}
                    className={cn(
                      'flex items-center justify-between rounded-md px-3 py-2 cursor-pointer transition-colors',
                      isActive ? 'bg-accent' : 'hover:bg-accent/50'
                    )}
                    onClick={() => setActiveProviderId(config.providerId)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{config.name}</span>
                      {config.apiKey && (
                        <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      )}
                    </div>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(checked) => {
                        setValue(`customProviders.${index}.enabled`, checked)
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* 添加自定义服务商按钮 */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleAddCustomProvider}
        >
          <Plus className="h-4 w-4" />
          {t('addCustomProvider')}
        </Button>
      </div>
    </div>
  )
}
