import { useEffect, useRef } from 'react';
import { Bot, CornerDownLeft, SendHorizontal, Sparkles } from 'lucide-react';
import type { WorkspaceDemoMessage } from './mock-data';

type WorkspaceDemoChatProps = {
  messages: WorkspaceDemoMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
};

export function WorkspaceDemoChat({
  messages,
  inputValue,
  onInputChange,
  onSubmit,
}: WorkspaceDemoChatProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages]);

  return (
    <section className="flex h-full min-h-0 flex-col bg-[#fbfaf7]">
      <div className="flex items-center justify-between gap-3 border-b border-mory-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-mory-orange/12 text-mory-orange">
            <Bot size={17} />
          </div>
          <div>
            <div className="text-sm font-semibold text-mory-text-primary">Agent conversation</div>
            <div className="text-xs text-mory-text-tertiary">Simulated live workspace demo</div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-mory-border bg-white px-2.5 py-1 text-[11px] font-medium text-mory-text-secondary">
          <Sparkles size={12} />
          Ask mode
        </div>
      </div>

      <div ref={containerRef} className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-4">
        {messages.map((message) => {
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
            <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
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

      <form
        className="border-t border-mory-border bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor="workspace-demo-chat-input" className="sr-only">
          Chat message
        </label>
        <div className="rounded-[24px] border border-mory-border bg-[#faf9f6] p-2 shadow-sm">
          <textarea
            id="workspace-demo-chat-input"
            value={inputValue}
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="Ask Moryflow to keep working..."
            aria-label="Chat message"
            className="max-h-28 min-h-[76px] w-full resize-none border-none bg-transparent px-3 py-2 text-sm leading-6 text-mory-text-primary outline-none placeholder:text-mory-text-tertiary"
          />
          <div className="mt-2 flex items-center justify-between gap-3 px-2 pb-1">
            <div className="inline-flex items-center gap-1.5 text-xs text-mory-text-tertiary">
              <CornerDownLeft size={12} />
              Press send to continue the demo
            </div>
            <button
              type="submit"
              aria-label="Send message"
              className="inline-flex items-center gap-2 rounded-full bg-mory-text-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-black"
            >
              <SendHorizontal size={15} />
              Send
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
