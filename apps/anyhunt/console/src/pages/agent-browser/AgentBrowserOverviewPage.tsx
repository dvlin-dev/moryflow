/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser 闭环流程页
 */

import { useOutletContext } from 'react-router-dom';
import { FlowRunner } from '@/features/agent-browser-playground';
import type { AgentBrowserOutletContext } from './AgentBrowserLayoutPage';
import { AgentBrowserEmptyState } from './AgentBrowserEmptyState';

export default function AgentBrowserOverviewPage() {
  const { apiKeyId, setSessionId } = useOutletContext<AgentBrowserOutletContext>();

  if (!apiKeyId) {
    return <AgentBrowserEmptyState />;
  }

  return <FlowRunner apiKeyId={apiKeyId} onSessionChange={setSessionId} />;
}
