/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser 浏览器能力页
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

const browserSections: BrowserSessionSection[] = [
  'session',
  'open',
  'snapshot',
  'delta',
  'action',
  'actionBatch',
  'screenshot',
  'tabs',
  'windows',
];

export default function AgentBrowserBrowserPage() {
  const { apiKey, sessionId, setSessionId } = useOutletContext<AgentBrowserOutletContext>();

  if (!apiKey) {
    return <AgentBrowserEmptyState />;
  }

  return (
    <BrowserSessionPanel
      apiKey={apiKey}
      sessionId={sessionId}
      onSessionChange={setSessionId}
      sections={browserSections}
      title="Browser"
      description="Create sessions, open pages, and run browser actions or batches."
    />
  );
}
