import type { SettingsDialogState } from '../use-settings-dialog';
import { ProviderList } from './providers/provider-list';
import { ProviderDetails } from './providers/provider-details';

type ProvidersSectionProps = {
  providers: SettingsDialogState['providers'];
  form: SettingsDialogState['form'];
  isLoading: boolean;
};

export const ProvidersSection = ({ providers, form, isLoading }: ProvidersSectionProps) => (
  <div className="flex h-full gap-4">
    {/* 左侧服务商列表 */}
    <div className="w-64 shrink-0 rounded-xl border bg-muted/30">
      <ProviderList providers={providers} form={form} isLoading={isLoading} />
    </div>

    {/* 右侧详情面板 */}
    <div className="min-w-0 flex-1 overflow-hidden rounded-xl border bg-background">
      <ProviderDetails providers={providers} form={form} />
    </div>
  </div>
);
