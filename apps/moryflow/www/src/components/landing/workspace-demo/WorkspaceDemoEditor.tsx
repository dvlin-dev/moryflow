type WorkspaceDemoEditorProps = {
  title: string;
  body: string;
  onBodyChange: (value: string) => void;
};

export function WorkspaceDemoEditor({ title, body, onBodyChange }: WorkspaceDemoEditorProps) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-mory-paper">
      <div className="flex items-center justify-between gap-3 border-b border-mory-border px-6 py-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-mory-text-primary">{title}</div>
          <div className="mt-1 text-xs text-mory-text-tertiary">
            Editable note synced with the agent workflow
          </div>
        </div>
        <div className="rounded-full border border-mory-border bg-[#fbfaf7] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-mory-text-tertiary">
          Home
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-6 py-6">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-mory-border bg-[#fcfbf8] p-6 shadow-[0_18px_44px_rgba(0,0,0,0.05)]">
          <label className="mb-4 block text-xs font-semibold uppercase tracking-[0.18em] text-mory-text-tertiary">
            Open document
          </label>
          <textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            className="min-h-[520px] w-full resize-none border-none bg-transparent font-serif text-[17px] leading-8 text-mory-text-primary outline-none"
            spellCheck={false}
            aria-label="Workspace document editor"
          />
        </div>
      </div>
    </section>
  );
}
