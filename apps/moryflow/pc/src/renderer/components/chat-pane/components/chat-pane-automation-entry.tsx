import { useEffect, useState } from 'react';
import type { UIMessage } from 'ai';
import type { ChatSessionSummary } from '@shared/ipc';
import { Button } from '@moryflow/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@moryflow/ui/components/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@moryflow/ui/components/tooltip';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { AutomationEditor } from '@/workspace/components/automations/automation-editor';
import { automationsMethods } from '@/workspace/components/automations/store/automations-methods';
import { useAutomationsStore } from '@/workspace/components/automations/store/use-automations-store';

const extractTextFromMessage = (message: UIMessage): string => {
  const textParts = (message.parts ?? [])
    .flatMap((part) => {
      if (part.type !== 'text') {
        return [];
      }
      return [part.text];
    })
    .map((item) => item.trim())
    .filter(Boolean);
  return textParts.join('\n\n').trim();
};

export const extractLatestUserMessage = (messages: UIMessage[]): string => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== 'user') {
      continue;
    }
    const text = extractTextFromMessage(message);
    if (text) {
      return text;
    }
  }
  return '';
};

type ChatPaneAutomationEntryProps = {
  activeSession: ChatSessionSummary | null;
  latestUserMessage: string;
  isSessionReady: boolean;
};

export const ChatPaneAutomationEntry = ({
  activeSession,
  latestUserMessage,
  isSessionReady,
}: ChatPaneAutomationEntryProps) => {
  const [open, setOpen] = useState(false);
  const isHydrated = useAutomationsStore((state) => state.isHydrated);
  const isLoading = useAutomationsStore((state) => state.isLoading);
  const isSaving = useAutomationsStore((state) => state.isSaving);
  const endpoints = useAutomationsStore((state) => state.endpoints);
  const defaultEndpointId = useAutomationsStore((state) => state.defaultEndpointId);

  useEffect(() => {
    if (!open || isHydrated) {
      return;
    }
    void automationsMethods.hydrate();
  }, [isHydrated, open]);

  const disabled = !isSessionReady || !activeSession;
  const createSource = activeSession
    ? ({
        kind: 'conversation-session',
        sessionId: activeSession.id,
        vaultPath: activeSession.vaultPath,
        displayTitle: activeSession.title,
      } as const)
    : null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground transition-colors duration-fast hover:text-foreground"
            onClick={() => setOpen(true)}
            disabled={disabled}
          >
            <Bot className="mr-1 size-4" />
            Automate
          </Button>
        </TooltipTrigger>
        <TooltipContent>Create an automation from this conversation</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] min-w-0 overflow-hidden p-0 sm:max-w-4xl">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Create automation</DialogTitle>
            <DialogDescription>
              Schedule this conversation to run in the background and push results to Telegram.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-auto px-6 pb-6">
            {isLoading && !isHydrated ? (
              <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                Loading automation targets…
              </div>
            ) : (
              <AutomationEditor
                mode="create"
                createSource={createSource}
                vaultPath={activeSession?.vaultPath ?? null}
                initialMessage={latestUserMessage}
                job={null}
                endpoints={endpoints}
                defaultEndpointId={defaultEndpointId}
                isSaving={isSaving}
                onSaveCreate={async (input) => {
                  try {
                    await automationsMethods.createAutomation(input);
                    toast.success('Automation created');
                    setOpen(false);
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : 'Failed to create automation'
                    );
                  }
                }}
                onSaveUpdate={async () => undefined}
                onDelete={async () => undefined}
                onToggle={async () => undefined}
                onRunNow={async () => undefined}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
