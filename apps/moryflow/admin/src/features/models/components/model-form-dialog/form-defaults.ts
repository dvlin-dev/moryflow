import type { CreateModelFormData } from '@/lib/validations/model';
import type { AiModel, AiProvider, UserTier } from '@/types/api';
import { parseCapabilities } from '../../utils';

export function getModelFormDefaultValues(
  model: AiModel | undefined,
  providers: AiProvider[]
): CreateModelFormData {
  const caps = model ? parseCapabilities(model.capabilitiesJson) : null;

  return {
    providerId: model?.providerId || providers[0]?.id || '',
    modelId: model?.modelId || '',
    upstreamId: model?.upstreamId || '',
    displayName: model?.displayName || '',
    enabled: model?.enabled ?? true,
    inputTokenPrice: model?.inputTokenPrice ?? 0,
    outputTokenPrice: model?.outputTokenPrice ?? 0,
    minTier: (model?.minTier as UserTier) || 'free',
    maxContextTokens: model?.maxContextTokens ?? 128000,
    maxOutputTokens: model?.maxOutputTokens ?? 4096,
    capabilities: {
      vision: caps?.vision ?? false,
      tools: caps?.tools ?? false,
      json: caps?.json ?? false,
    },
    reasoning: caps?.reasoning ?? { enabled: false, effort: 'medium' },
    sortOrder: model?.sortOrder ?? 0,
  };
}

export function getInitialRawConfigText(model?: AiModel): string {
  if (!model) {
    return '';
  }
  const caps = parseCapabilities(model.capabilitiesJson);
  const rawConfig = caps.reasoning?.rawConfig;
  return rawConfig ? JSON.stringify(rawConfig, null, 2) : '';
}
