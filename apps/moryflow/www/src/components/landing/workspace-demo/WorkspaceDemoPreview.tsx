import { Bot, FileText, Search, Sparkles } from 'lucide-react';
import {
  WORKSPACE_DEMO_DEFAULT_MESSAGES,
  WORKSPACE_DEMO_DOCUMENT_BODY,
  WORKSPACE_DEMO_DOCUMENT_TITLE,
  WORKSPACE_DEMO_SIDEBAR_FILES,
} from './mock-data';

export function WorkspaceDemoPreview() {
  return (
    <div className="overflow-hidden rounded-[32px] border border-mory-border bg-mory-paper shadow-[0_28px_80px_rgba(0,0,0,0.10)]">
      <div className="grid min-h-[720px] grid-cols-[260px_minmax(0,1.4fr)_minmax(340px,0.9fr)]">
        <aside className="flex h-full min-h-0 flex-col border-r border-mory-border bg-[#f6f5f1]">
          <div className="flex items-center justify-between gap-3 border-b border-mory-border px-4 py-3">
            <div className="rounded-full bg-white p-1 shadow-sm">
              <div className="grid grid-cols-2 gap-1 rounded-full bg-[#efede6] p-1 text-xs font-medium text-mory-text-secondary">
                <div className="rounded-full bg-white px-3 py-1.5 text-mory-text-primary shadow-sm">
                  Home
                </div>
                <div className="rounded-full px-3 py-1.5">Chat</div>
              </div>
            </div>
            <div className="flex size-9 items-center justify-center rounded-xl border border-mory-border bg-white text-mory-text-secondary shadow-sm">
              <Search size={16} />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-3 py-4">
            <div className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-mory-text-tertiary">
              Home documents
            </div>
            <div className="space-y-2">
              {WORKSPACE_DEMO_SIDEBAR_FILES.map((file) => (
                <div
                  key={file.id}
                  className="flex items-start gap-3 rounded-2xl border border-mory-orange/40 bg-white px-3 py-3 text-left text-mory-text-primary shadow-sm"
                >
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-mory-orange/12 text-mory-orange">
                    <FileText size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{file.title}</div>
                    <div className="mt-1 truncate text-xs text-mory-text-tertiary">
                      {file.subtitle}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-mory-border p-3">
            <div className="flex w-full items-center justify-center gap-2 rounded-2xl bg-mory-text-primary px-4 py-3 text-sm font-medium text-white">
              New chat
            </div>
          </div>
        </aside>

        <section className="flex h-full min-h-0 flex-col bg-mory-paper">
          <div className="flex items-center justify-between gap-3 border-b border-mory-border px-6 py-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-mory-text-primary">
                {WORKSPACE_DEMO_DOCUMENT_TITLE}
              </div>
              <div className="mt-1 text-xs text-mory-text-tertiary">
                Editable note synced with the agent workflow
              </div>
            </div>
            <div className="rounded-full border border-mory-border bg-[#fbfaf7] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-mory-text-tertiary">
              Home
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
            <article className="mx-auto max-w-2xl rounded-[28px] border border-mory-border bg-[#fcfbf8] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.05)]">
              <div className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-mory-text-tertiary">
                Open document
              </div>
              <pre className="whitespace-pre-wrap font-serif text-[17px] leading-8 text-mory-text-primary">
                {WORKSPACE_DEMO_DOCUMENT_BODY}
              </pre>
            </article>
          </div>
        </section>

        <section className="flex h-full min-h-0 flex-col bg-[#fbfaf7]">
          <div className="flex items-center justify-between gap-3 border-b border-mory-border px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-2xl bg-mory-orange/12 text-mory-orange">
                <Bot size={17} />
              </div>
              <div>
                <div className="text-sm font-semibold text-mory-text-primary">
                  Agent conversation
                </div>
                <div className="text-xs text-mory-text-tertiary">Simulated live workspace demo</div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-mory-border bg-white px-2.5 py-1 text-[11px] font-medium text-mory-text-secondary">
              <Sparkles size={12} />
              Ask mode
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-4">
            {WORKSPACE_DEMO_DEFAULT_MESSAGES.map((message) => {
              if (message.kind === 'tool-step') {
                return (
                  <div
                    key={message.id}
                    className="rounded-2xl border border-mory-border bg-white px-3 py-3 text-sm text-mory-text-secondary shadow-sm"
                  >
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-mory-text-tertiary">
                      <span className="size-2 rounded-full bg-mory-orange" />
                      Tool
                    </div>
                    <div>{message.content}</div>
                  </div>
                );
              }

              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[92%] rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm ${
                      isUser
                        ? 'bg-mory-text-primary text-white'
                        : 'border border-mory-border bg-white text-mory-text-primary'
                    }`}
                  >
                    <div
                      className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        isUser ? 'text-white/70' : 'text-mory-text-tertiary'
                      }`}
                    >
                      {isUser ? 'User' : 'AI'}
                    </div>
                    <div>{message.content}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-mory-border bg-white p-4">
            <div className="sr-only">Chat preview</div>
            <div className="rounded-[24px] border border-mory-border bg-[#faf9f6] p-2 shadow-sm">
              <div className="min-h-[76px] px-3 py-2 text-sm leading-6 text-mory-text-tertiary">
                Ask Moryflow to keep working...
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
