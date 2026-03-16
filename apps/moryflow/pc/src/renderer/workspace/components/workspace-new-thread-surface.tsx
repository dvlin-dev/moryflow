import { PreThreadView } from '@/components/chat-pane/components/pre-thread-view';

export const WorkspaceNewThreadSurface = () => {
  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background pt-[2em]">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[720px] flex-col overflow-hidden">
        <PreThreadView submitMode="new-thread" />
      </div>
    </div>
  );
};
