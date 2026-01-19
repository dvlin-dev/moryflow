/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser 存储管理页
 */

import { useOutletContext } from 'react-router-dom';
import {
  BrowserSessionPanel,
  type BrowserSessionSection,
} from '@/features/agent-browser-playground';
import type { AgentBrowserOutletContext } from './AgentBrowserLayoutPage';
import { AgentBrowserEmptyState } from './AgentBrowserEmptyState';

const storageSections: BrowserSessionSection[] = ['session', 'storage'];

export default function AgentBrowserStoragePage() {
  const { apiKeyId, sessionId, setSessionId } = useOutletContext<AgentBrowserOutletContext>();

  if (!apiKeyId) {
    return <AgentBrowserEmptyState description="Select an API key to manage browser storage." />;
  }

  return (
    <BrowserSessionPanel
      apiKeyId={apiKeyId}
      sessionId={sessionId}
      onSessionChange={setSessionId}
      sections={storageSections}
      title="Storage"
      description="Export, import, and clear browser storage data."
    />
  );
}
