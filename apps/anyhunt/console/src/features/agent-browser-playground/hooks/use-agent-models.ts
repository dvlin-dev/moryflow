/**
 * [PROVIDES]: useAgentModels
 * [DEPENDS]: react-query, agent-browser-playground/api
 * [POS]: Agent Browser 可用模型查询（Console）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useQuery } from '@tanstack/react-query';
import { listAgentModels } from '../agent-api';

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
