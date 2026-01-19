/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser 网络相关页
 */

import { useOutletContext } from 'react-router-dom';
import {
  BrowserSessionPanel,
  type BrowserSessionSection,
} from '@/features/agent-browser-playground';
import type { AgentBrowserOutletContext } from './AgentBrowserLayoutPage';
import { AgentBrowserEmptyState } from './AgentBrowserEmptyState';

const networkSections: BrowserSessionSection[] = ['session', 'intercept', 'network'];

export default function AgentBrowserNetworkPage() {
  const { apiKeyId, sessionId, setSessionId } = useOutletContext<AgentBrowserOutletContext>();

  if (!apiKeyId) {
    return <AgentBrowserEmptyState description="Select an API key to manage network settings." />;
  }

  return (
    <BrowserSessionPanel
      apiKeyId={apiKeyId}
      sessionId={sessionId}
      onSessionChange={setSessionId}
      sections={networkSections}
      title="Network"
      description="Configure intercept rules and inspect network history."
    />
  );
}
