import { cn } from '@/lib/utils';
import { Switch } from '@anyhunt/ui/components/switch';
import { Button } from '@anyhunt/ui/components/button';
import { Separator } from '@anyhunt/ui/components/separator';
import { Add01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@anyhunt/ui/components/icon';
import { getSortedProviders } from '@shared/model-registry';
import type { SettingsDialogState } from '../../use-settings-dialog';
import { useAuth, MEMBERSHIP_PROVIDER_ID } from '@/lib/server';
import { useTranslation } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildProviderOrder } from './provider-order';

export { MEMBERSHIP_PROVIDER_ID };

type ProviderListProps = {
  providers: SettingsDialogState['providers'];
  form: SettingsDialogState['form'];
  isLoading: boolean;
};

/**
 * Providers 列表
 * 显示会员模型 +（预设服务商与自定义服务商合并）列表，启用的排在上方。
 */
export const ProviderList = ({ providers, form, isLoading }: ProviderListProps) => {
  const { t } = useTranslation('settings');
  const {
    providerValues,
    customProviderValues,
    activeProviderId,
    setActiveProviderId,
    handleAddCustomProvider,
  } = providers;
  const { setValue } = form;
  const { isAuthenticated, user, membershipEnabled, setMembershipEnabled } = useAuth();

  const sortedPresets = useMemo(() => getSortedProviders(), []);
  const isMembershipActive = activeProviderId === MEMBERSHIP_PROVIDER_ID;

  const presetProviderIds = useMemo(() => sortedPresets.map((p) => p.id), [sortedPresets]);
  const customProviderIds = useMemo(
    () => customProviderValues.map((p) => p.providerId),
    [customProviderValues]
  );

  // 切换预设服务商启用状态
  const handleToggleProvider = (providerId: string, enabled: boolean) => {
    const index = providerValues.findIndex((p) => p.providerId === providerId);
    if (index >= 0) {
      setValue(`providers.${index}.enabled`, enabled);
    } else {
      // 如果还没有配置，添加新配置
      const currentProviders = form.getValues('providers');
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
      ]);
    }
  };

  const isProviderEnabled = useCallback(
    (providerId: string) => {
      if (providerId.startsWith('custom-')) {
        return customProviderValues.find((p) => p.providerId === providerId)?.enabled ?? false;
      }
      return providerValues.find((p) => p.providerId === providerId)?.enabled ?? false;
    },
    [customProviderValues, providerValues]
  );

  const desiredOrder = useMemo(() => {
    return buildProviderOrder({
      presetProviderIds,
      customProviderIds,
      isEnabled: (providerId) => isProviderEnabled(providerId),
    });
  }, [presetProviderIds, customProviderIds, isProviderEnabled]);

  const desiredOrderRef = useRef<string[]>([]);
  desiredOrderRef.current = desiredOrder;

  // 仅维护顺序（不缓存 enabled/configured 等状态），避免编辑时列表跳动
  const [providerOrder, setProviderOrder] = useState<string[]>(() => desiredOrder);
  const lastCountRef = useRef<number>(presetProviderIds.length + customProviderIds.length);

  // 初始化/增删 provider 时刷新顺序
  useEffect(() => {
    const count = presetProviderIds.length + customProviderIds.length;
    if (lastCountRef.current !== count) {
      setProviderOrder(desiredOrderRef.current);
      lastCountRef.current = count;
    }
  }, [presetProviderIds.length, customProviderIds.length]);

  // 延迟重排：仅当用户切换 active provider 时才刷新顺序（避免输入/自动启用导致跳动）
  useEffect(() => {
    if (!activeProviderId) return;
    const count = presetProviderIds.length + customProviderIds.length;
    setProviderOrder(desiredOrderRef.current);
    lastCountRef.current = count;
  }, [activeProviderId, presetProviderIds.length, customProviderIds.length]);

  const presetById = useMemo(() => {
    const map = new Map(sortedPresets.map((p) => [p.id, p]));
    return map;
  }, [sortedPresets]);

  const customById = useMemo(() => {
    const map = new Map(
      customProviderValues.map((p, index) => [p.providerId, { config: p, index }])
    );
    return map;
  }, [customProviderValues]);

  const presetConfigById = useMemo(() => {
    return new Map(providerValues.map((p) => [p.providerId, p]));
  }, [providerValues]);

  // 设置加载完成后刷新一次顺序，确保首次进入就满足“启用在上”的规则。
  // 用户编辑过程中（包括自动启用）不跟随 enabled 变化重排，避免列表跳动。
  const prevIsLoadingRef = useRef<boolean>(isLoading);
  useEffect(() => {
    const prev = prevIsLoadingRef.current;
    prevIsLoadingRef.current = isLoading;
    if (prev && !isLoading) {
      setProviderOrder(desiredOrderRef.current);
    }
  }, [isLoading]);

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

        {/* Providers（预设 + 自定义合并，启用的排前面） */}
        <div className="space-y-1 p-2">
          {providerOrder.map((providerId) => {
            const isCustom = providerId.startsWith('custom-');
            const custom = isCustom ? customById.get(providerId) : undefined;
            const preset = !isCustom ? presetById.get(providerId) : undefined;
            if (!isCustom && !preset) return null;
            if (isCustom && !custom) return null;

            const isActive = activeProviderId === providerId;
            const presetConfig = !isCustom ? presetConfigById.get(providerId) : undefined;
            const enabled = isCustom
              ? Boolean(custom?.config.enabled)
              : Boolean(presetConfig?.enabled);

            const configured = isCustom
              ? Boolean(custom?.config.apiKey?.trim())
              : Boolean(presetConfig?.apiKey?.trim());

            const name = isCustom ? custom!.config.name : preset!.name;

            return (
              <div
                key={providerId}
                className={cn(
                  'flex items-center justify-between rounded-md px-3 py-2 cursor-pointer transition-colors',
                  isActive ? 'bg-accent' : 'hover:bg-accent/50'
                )}
                onClick={() => setActiveProviderId(providerId)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{name}</span>
                  {configured && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => {
                    if (isCustom) {
                      setValue(`customProviders.${custom!.index}.enabled`, checked);
                      return;
                    }
                    handleToggleProvider(providerId, checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* 添加自定义服务商按钮 */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleAddCustomProvider}
        >
          <Icon icon={Add01Icon} className="h-4 w-4" />
          {t('addCustomProvider')}
        </Button>
      </div>
    </div>
  );
};
