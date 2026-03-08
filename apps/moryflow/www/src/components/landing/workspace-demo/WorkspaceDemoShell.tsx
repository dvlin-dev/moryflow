import { useMemo, useState } from 'react';
import { WorkspaceDemoChat } from './WorkspaceDemoChat';
import { WorkspaceDemoEditor } from './WorkspaceDemoEditor';
import { WorkspaceDemoSidebar } from './WorkspaceDemoSidebar';
import {
  WORKSPACE_DEMO_DEFAULT_MESSAGES,
  WORKSPACE_DEMO_DOCUMENT_BODY,
  WORKSPACE_DEMO_DOCUMENT_TITLE,
  WORKSPACE_DEMO_FOLLOW_UP_REPLY,
  WORKSPACE_DEMO_SIDEBAR_FILES,
  type WorkspaceDemoMessage,
  type WorkspaceDemoSidebarMode,
} from './mock-data';

export function WorkspaceDemoShell() {
  const [mode, setMode] = useState<WorkspaceDemoSidebarMode>('home');
  const [selectedFileId, setSelectedFileId] = useState(WORKSPACE_DEMO_SIDEBAR_FILES[0]?.id ?? '');
  const [documentBody, setDocumentBody] = useState(WORKSPACE_DEMO_DOCUMENT_BODY);
  const [chatInput, setChatInput] = useState('');
  const [followUpMessages, setFollowUpMessages] = useState<WorkspaceDemoMessage[]>([]);

  const messages = useMemo(
    () => [...WORKSPACE_DEMO_DEFAULT_MESSAGES, ...followUpMessages],
    [followUpMessages]
  );

  const handleSubmit = () => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    setFollowUpMessages((current) => [
      ...current,
      {
        id: `user-follow-up-${current.length + 1}`,
        role: 'user',
        kind: 'text',
        content: trimmed,
      },
      {
        id: `assistant-follow-up-${current.length + 1}`,
        role: 'assistant',
        kind: 'text',
        content: WORKSPACE_DEMO_FOLLOW_UP_REPLY,
      },
    ]);
    setChatInput('');
  };

  return (
    <div className="overflow-hidden rounded-[32px] border border-mory-border bg-mory-paper shadow-[0_28px_80px_rgba(0,0,0,0.10)]">
      <div className="grid min-h-[720px] grid-cols-[260px_minmax(0,1.4fr)_minmax(340px,0.9fr)]">
        <WorkspaceDemoSidebar
          mode={mode}
          onModeChange={setMode}
          selectedFileId={selectedFileId}
          onSelectFile={setSelectedFileId}
        />
        <WorkspaceDemoEditor
          title={WORKSPACE_DEMO_DOCUMENT_TITLE}
          body={documentBody}
          onBodyChange={setDocumentBody}
        />
        <WorkspaceDemoChat
          messages={messages}
          inputValue={chatInput}
          onInputChange={setChatInput}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
