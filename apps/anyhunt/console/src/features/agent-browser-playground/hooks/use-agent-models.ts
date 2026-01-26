/**
 * [PROVIDES]: useAgentModels
 * [DEPENDS]: react-query, agent-browser-playground/api
 * [POS]: Agent Browser 可用模型查询（Console）
 *
 * [PROTOCOL]: 本文件变更时，必须更新 src/features/CLAUDE.md
 */

import { useQuery } from '@tanstack/react-query';
import { listAgentModels } from '../api';

export function useAgentModels(apiKey?: string) {
  return useQuery({
    queryKey: ['agent-browser', 'models', apiKey],
    queryFn: () => {
      if (!apiKey) {
        throw new Error('API key is required');
      }
      return listAgentModels(apiKey);
    },
    enabled: Boolean(apiKey),
  });
}
