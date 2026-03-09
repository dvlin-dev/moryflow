import { useEffect, useMemo, useState } from 'react';
import type { Locale } from '@/lib/i18n';
import { WorkspaceDemoChat } from './WorkspaceDemoChat';
import { WorkspaceDemoEditor } from './WorkspaceDemoEditor';
import { WorkspaceDemoSidebar } from './WorkspaceDemoSidebar';
import {
  getWorkspaceDemoContent,
  type WorkspaceDemoMessage,
  type WorkspaceDemoSidebarMode,
} from './mock-data';

type WorkspaceDemoShellProps = {
  locale: Locale;
};

export function WorkspaceDemoShell({ locale }: WorkspaceDemoShellProps) {
  const content = useMemo(() => getWorkspaceDemoContent(locale), [locale]);
  const [mode, setMode] = useState<WorkspaceDemoSidebarMode>('home');
  const [selectedFileId, setSelectedFileId] = useState(content.sidebarFiles[0]?.id ?? '');
  const [documentBody, setDocumentBody] = useState(content.documentBody);
  const [chatInput, setChatInput] = useState('');
  const [followUpMessages, setFollowUpMessages] = useState<WorkspaceDemoMessage[]>([]);

  const messages = useMemo(
    () => [...content.defaultMessages, ...followUpMessages],
    [content, followUpMessages]
  );

  useEffect(() => {
    setSelectedFileId(content.sidebarFiles[0]?.id ?? '');
    setDocumentBody(content.documentBody);
    setChatInput('');
    setFollowUpMessages([]);
    setMode('home');
  }, [content]);

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
        content: content.followUpReply,
      },
    ]);
    setChatInput('');
  };

  return (
    <div className="overflow-hidden rounded-[32px] border border-mory-border bg-mory-paper shadow-[0_28px_80px_rgba(0,0,0,0.10)]">
      <div className="grid min-h-[720px] grid-cols-[260px_minmax(0,1.4fr)_minmax(340px,0.9fr)]">
        <WorkspaceDemoSidebar
          content={content}
          mode={mode}
          onModeChange={setMode}
          selectedFileId={selectedFileId}
          onSelectFile={setSelectedFileId}
        />
        <WorkspaceDemoEditor
          content={content}
          title={content.documentTitle}
          body={documentBody}
          onBodyChange={setDocumentBody}
        />
        <WorkspaceDemoChat
          content={content}
          messages={messages}
          inputValue={chatInput}
          onInputChange={setChatInput}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
