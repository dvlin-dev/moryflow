/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser 网络相关页
 *
 * [PROTOCOL]: 本文件变更时，需同步更新所属目录 CLAUDE.md
 */

import { useOutletContext } from 'react-router-dom';
import {
  BrowserSessionPanel,
  type BrowserSessionSection,
} from '@/features/agent-browser-playground';
import type { AgentBrowserOutletContext } from './AgentBrowserLayoutPage';
import { AgentBrowserEmptyState } from './AgentBrowserEmptyState';

const networkSections: BrowserSessionSection[] = ['session', 'intercept', 'headers', 'network'];

export default function AgentBrowserNetworkPage() {
  const { apiKey, sessionId, setSessionId } = useOutletContext<AgentBrowserOutletContext>();

  if (!apiKey) {
    return <AgentBrowserEmptyState description="Select an API key to manage network settings." />;
  }

  return (
    <BrowserSessionPanel
      apiKey={apiKey}
      sessionId={sessionId}
      onSessionChange={setSessionId}
      sections={networkSections}
      title="Network"
      description="Configure headers, intercept rules, and inspect network history."
    />
  );
}
