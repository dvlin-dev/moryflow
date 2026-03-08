/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser Streaming 预览页
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
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
  const { apiKey, sessionId, setSessionId } = useOutletContext<AgentBrowserOutletContext>();

  if (!apiKey) {
    return <AgentBrowserEmptyState description="Select an API key to preview streaming." />;
  }

  return (
    <BrowserSessionPanel
      apiKey={apiKey}
      sessionId={sessionId}
      onSessionChange={setSessionId}
      sections={streamingSections}
      title="Streaming"
      description="Preview the live browser stream and send input events."
    />
  );
}
