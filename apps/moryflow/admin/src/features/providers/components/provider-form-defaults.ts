import type { CreateProviderFormData } from '@/lib/validations/provider';
import type { AiProvider, PresetProvider } from '@/types/api';

export function getProviderFormDefaultValues(
  provider: AiProvider | undefined,
  presets: PresetProvider[]
): CreateProviderFormData {
  return {
    providerType: provider?.providerType || presets[0]?.id || 'openai',
    name: provider?.name || '',
    apiKey: provider?.apiKey || '',
    baseUrl: provider?.baseUrl || '',
    enabled: provider?.enabled ?? true,
    sortOrder: provider?.sortOrder ?? 0,
  };
}
