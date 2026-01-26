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
  const { apiKey, setSessionId } = useOutletContext<AgentBrowserOutletContext>();

  if (!apiKey) {
    return <AgentBrowserEmptyState />;
  }

  return <FlowRunner apiKey={apiKey} onSessionChange={setSessionId} />;
}
