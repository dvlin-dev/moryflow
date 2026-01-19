/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser 任务运行页
 */

import { useOutletContext } from 'react-router-dom';
import { AgentRunPanel } from '@/features/agent-browser-playground';
import type { AgentBrowserOutletContext } from './AgentBrowserLayoutPage';
import { AgentBrowserEmptyState } from './AgentBrowserEmptyState';

export default function AgentBrowserAgentPage() {
  const { apiKeyId } = useOutletContext<AgentBrowserOutletContext>();

  if (!apiKeyId) {
    return <AgentBrowserEmptyState description="Select an API key to run agent tasks." />;
  }

  return <AgentRunPanel apiKeyId={apiKeyId} />;
}
