import { PreThreadView } from '@/components/chat-pane/components/pre-thread-view';

export const WorkspaceNewThreadSurface = () => {
  return (
    <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-background">
      <PreThreadView submitMode="new-thread" />
    </div>
  );
};
