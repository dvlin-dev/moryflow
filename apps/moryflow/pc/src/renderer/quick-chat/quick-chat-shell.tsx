import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@moryflow/ui/components/button';
import { ChatPane } from '@/components/chat-pane';
import { useChatSessions } from '@/components/chat-pane/hooks/use-chat-sessions';

export const QuickChatShell = () => {
  const { selectSession, activeSessionId } = useChatSessions();
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const bindQuickChatSession = useCallback(async () => {
    if (!window.desktopAPI?.quickChat?.getState) {
      setLoadError('Quick Chat is not available in current environment.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const state = await window.desktopAPI.quickChat.getState();
      if (state.sessionId) {
        selectSession(state.sessionId);
      }
      setIsReady(true);
    } catch (error) {
      console.error('[quick-chat] failed to bind session', error);
      setLoadError('Failed to initialize Quick Chat. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectSession]);

  useEffect(() => {
    void bindQuickChatSession();
  }, [bindQuickChatSession]);

  useEffect(() => {
    if (!isReady || !window.desktopAPI?.quickChat?.setSessionId) {
      return;
    }
    void window.desktopAPI.quickChat
      .setSessionId({ sessionId: activeSessionId ?? null })
      .catch((error) => {
        console.error('[quick-chat] failed to persist session', error);
      });
  }, [activeSessionId, isReady]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-sm space-y-4 rounded-2xl border bg-card p-5 text-card-foreground">
          <p className="text-sm">{loadError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void bindQuickChatSession()}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return null;
  }

  return (
    <div className="h-screen overflow-hidden bg-background">
      <ChatPane variant="mode" />
    </div>
  );
};
