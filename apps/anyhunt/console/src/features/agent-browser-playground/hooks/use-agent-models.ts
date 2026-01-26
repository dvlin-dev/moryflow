/**
 * [PROVIDES]: useAgentModels
 * [DEPENDS]: react-query, agent-browser-playground/api
 * [POS]: Agent Browser 可用模型查询（Console）
 *
 * [PROTOCOL]: 本文件变更时，必须更新 src/features/CLAUDE.md
 */

import { useQuery } from '@tanstack/react-query';
import { listAgentModels } from '../api';

export function useAgentModels(apiKeyId?: string) {
  return useQuery({
    queryKey: ['agent-browser', 'models', apiKeyId],
    queryFn: () => {
      if (!apiKeyId) {
        throw new Error('API key is required');
      }
      return listAgentModels(apiKeyId);
    },
    enabled: Boolean(apiKeyId),
  });
}
