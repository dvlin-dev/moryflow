import { FileText, MessageSquarePlus, Search } from 'lucide-react';
import type { WorkspaceDemoContent, WorkspaceDemoSidebarMode } from './mock-data';

type WorkspaceDemoSidebarProps = {
  content: WorkspaceDemoContent;
  mode: WorkspaceDemoSidebarMode;
  onModeChange: (mode: WorkspaceDemoSidebarMode) => void;
  selectedFileId: string;
  onSelectFile: (fileId: string) => void;
};

export function WorkspaceDemoSidebar({
  content,
  mode,
  onModeChange,
  selectedFileId,
  onSelectFile,
}: WorkspaceDemoSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-mory-border bg-[#f6f5f1]">
      <div className="flex items-center justify-between gap-3 border-b border-mory-border px-4 py-3">
        <div className="rounded-full bg-white p-1 shadow-sm">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-[#efede6] p-1 text-xs font-medium text-mory-text-secondary">
            {(['home', 'chat'] as const).map((item) => {
              const active = mode === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onModeChange(item)}
                  aria-pressed={active}
                  className={`rounded-full px-3 py-1.5 transition ${
                    active
                      ? 'bg-white text-mory-text-primary shadow-sm'
                      : 'hover:text-mory-text-primary'
                  }`}
                >
                  {item === 'home' ? content.homeLabel : content.chatLabel}
                </button>
              );
            })}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="flex size-9 items-center justify-center rounded-xl border border-mory-border bg-white text-mory-text-secondary shadow-sm transition hover:text-mory-text-primary"
        >
          <Search size={16} />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
        <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-mory-text-tertiary">
          {content.documentsLabel}
        </div>
        <div className="space-y-2">
          {content.sidebarFiles.map((file) => {
            const active = file.id === selectedFileId;
            return (
              <button
                key={file.id}
                type="button"
                onClick={() => onSelectFile(file.id)}
                className={`flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                  active
                    ? 'border-mory-orange/40 bg-white text-mory-text-primary shadow-sm'
                    : 'border-transparent text-mory-text-secondary hover:border-mory-border hover:bg-white/80'
                }`}
              >
                <div
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${
                    active
                      ? 'bg-mory-orange/12 text-mory-orange'
                      : 'bg-white text-mory-text-secondary'
                  }`}
                >
                  <FileText size={15} />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{file.title}</div>
                  <div className="mt-1 truncate text-xs text-mory-text-tertiary">
                    {file.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-mory-border p-3">
        <div
          aria-hidden="true"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-mory-text-primary px-4 py-3 text-sm font-medium text-white"
        >
          <MessageSquarePlus size={16} />
          {content.newChatLabel}
        </div>
      </div>
    </aside>
  );
}
