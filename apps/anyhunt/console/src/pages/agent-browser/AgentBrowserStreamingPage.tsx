/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser Streaming 预览页
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

const streamingSections: BrowserSessionSection[] = ['session', 'stream'];

export default function AgentBrowserStreamingPage() {
  const { apiKeyId, sessionId, setSessionId } = useOutletContext<AgentBrowserOutletContext>();

  if (!apiKeyId) {
    return <AgentBrowserEmptyState description="Select an API key to preview streaming." />;
  }

  return (
    <BrowserSessionPanel
      apiKeyId={apiKeyId}
      sessionId={sessionId}
      onSessionChange={setSessionId}
      sections={streamingSections}
      title="Streaming"
      description="Preview the live browser stream and send input events."
    />
  );
}
