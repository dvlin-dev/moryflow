/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser CDP 连接页
 */

import { useOutletContext } from 'react-router-dom';
import {
  BrowserSessionPanel,
  type BrowserSessionSection,
} from '@/features/agent-browser-playground';
import type { AgentBrowserOutletContext } from './AgentBrowserLayoutPage';
import { AgentBrowserEmptyState } from './AgentBrowserEmptyState';

const cdpSections: BrowserSessionSection[] = ['session', 'cdp'];

export default function AgentBrowserCdpPage() {
  const { apiKeyId, sessionId, setSessionId } = useOutletContext<AgentBrowserOutletContext>();

  if (!apiKeyId) {
    return <AgentBrowserEmptyState description="Select an API key to connect CDP." />;
  }

  return (
    <BrowserSessionPanel
      apiKeyId={apiKeyId}
      sessionId={sessionId}
      onSessionChange={setSessionId}
      sections={cdpSections}
      title="CDP"
      description="Connect to an existing Chrome DevTools Protocol endpoint."
    />
  );
}
