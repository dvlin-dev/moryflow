/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser 浏览器能力页
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
  'screenshot',
  'tabs',
  'windows',
];

export default function AgentBrowserBrowserPage() {
  const { apiKeyId, sessionId, setSessionId } = useOutletContext<AgentBrowserOutletContext>();

  if (!apiKeyId) {
    return <AgentBrowserEmptyState />;
  }

  return (
    <BrowserSessionPanel
      apiKeyId={apiKeyId}
      sessionId={sessionId}
      onSessionChange={setSessionId}
      sections={browserSections}
      title="Browser"
      description="Create sessions, open pages, and run browser actions."
    />
  );
}
