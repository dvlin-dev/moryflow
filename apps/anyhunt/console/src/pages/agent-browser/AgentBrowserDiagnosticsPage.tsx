/**
 * [PROPS]: None
 * [EMITS]: None
 * [POS]: Agent Browser 诊断与观测页
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

const diagnosticsSections: BrowserSessionSection[] = ['session', 'diagnostics'];

export default function AgentBrowserDiagnosticsPage() {
  const { apiKeyId, sessionId, setSessionId } = useOutletContext<AgentBrowserOutletContext>();

  if (!apiKeyId) {
    return <AgentBrowserEmptyState description="Select an API key to view diagnostics." />;
  }

  return (
    <BrowserSessionPanel
      apiKeyId={apiKeyId}
      sessionId={sessionId}
      onSessionChange={setSessionId}
      sections={diagnosticsSections}
      title="Diagnostics"
      description="Inspect console logs, errors, traces, and HAR recordings."
    />
  );
}
