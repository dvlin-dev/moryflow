/**
 * [PROPS]: AgentMessageListProps
 * [EMITS]: None
 * [POS]: Agent Playground 对话消息渲染
 */

import {
  Alert,
  AlertDescription,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  ScrollArea,
  ScrollBar,
} from '@anyhunt/ui';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@anyhunt/ui/ai/conversation';
import { CodeBlock } from '@anyhunt/ui/ai/code-block';
import { Message, MessageContent } from '@anyhunt/ui/ai/message';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@anyhunt/ui/ai/reasoning';
import { isReasoningUIPart, isTextUIPart, isToolUIPart, type ChatStatus, type UIMessage } from 'ai';

const getToolName = (part: { type: string; toolName?: string }) => {
  if (part.toolName) return part.toolName;
  if (part.type.startsWith('tool-')) {
    return part.type.replace('tool-', '');
  }
  return part.type;
};

const renderJson = (value: unknown) => {
  const content = typeof value === 'string' ? value : JSON.stringify(value ?? {}, null, 2) || '';

  return <CodeBlock code={content || '{}'} language="json" />;
};

const ToolPayload = ({ label, value }: { label: string; value: unknown }) => (
  <div className="space-y-2">
    <p className="text-xs font-medium text-muted-foreground">{label}</p>
    <ScrollArea className="max-w-full rounded-lg bg-muted/50">
      <div className="min-w-0">{renderJson(value)}</div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  </div>
);

const ToolPartCard = ({ part }: { part: UIMessage['parts'][number] }) => {
  if (!isToolUIPart(part)) return null;

  const toolName = getToolName(part);
  const hasDetails = part.input !== undefined || part.output !== undefined || !!part.errorText;

  return (
    <Collapsible
      defaultOpen={false}
      className="w-full min-w-0 max-w-full rounded-lg border border-border-muted bg-muted/30"
    >
      <CollapsibleTrigger
        className="group flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2 text-left"
        disabled={!hasDetails}
      >
        <div className="min-w-0 text-xs font-medium text-muted-foreground">
          <span className="truncate">
            Tool: {toolName} · {part.state}
          </span>
        </div>
        {hasDetails && (
          <div className="text-xs text-muted-foreground/70">
            <span className="group-data-[state=open]:hidden">Show</span>
            <span className="hidden group-data-[state=open]:inline">Hide</span>
          </div>
        )}
      </CollapsibleTrigger>
      {hasDetails && (
        <CollapsibleContent className="min-w-0 max-w-full px-3 pb-3">
          {part.input !== undefined && <ToolPayload label="Input" value={part.input} />}
          {part.output !== undefined && (
            <div className={part.input !== undefined ? 'mt-3' : undefined}>
              <ToolPayload label="Output" value={part.output} />
            </div>
          )}
          {part.errorText && (
            <p className="mt-2 text-xs text-destructive">Error: {part.errorText}</p>
          )}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

export interface AgentMessageListProps {
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error | null;
}

export function AgentMessageList({ messages, status, error }: AgentMessageListProps) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-x-hidden">
      <Conversation className="flex-1 overflow-x-hidden" role="log">
        {messages.length === 0 ? (
          <ConversationEmptyState
            title="No messages yet"
            description="Send a prompt to start a run."
          />
        ) : (
          <ConversationContent className="min-w-0 overflow-x-hidden">
            {messages.map((message) => {
              const parts = message.parts ?? [];
              const hasRenderableParts = parts.some(
                (part) => isTextUIPart(part) || isToolUIPart(part) || isReasoningUIPart(part)
              );
              const from = message.role === 'user' ? 'user' : 'assistant';

              return (
                <Message key={message.id} from={from} className="min-w-0 max-w-[80%]">
                  <MessageContent className="min-w-0 max-w-full overflow-x-hidden">
                    {parts.map((part, index) => {
                      if (isTextUIPart(part)) {
                        return (
                          <p key={`${message.id}-text-${index}`} className="whitespace-pre-wrap">
                            {part.text}
                          </p>
                        );
                      }
                      if (isReasoningUIPart(part)) {
                        return (
                          <Reasoning
                            key={`${message.id}-reasoning-${index}`}
                            isStreaming={part.state === 'streaming'}
                            defaultOpen={part.state === 'streaming'}
                            className="mt-3 rounded-md border border-border-muted bg-muted/20 p-3"
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text ?? ''}</ReasoningContent>
                          </Reasoning>
                        );
                      }
                      if (isToolUIPart(part)) {
                        return (
                          <div key={`${message.id}-tool-${index}`} className="mt-3">
                            <ToolPartCard part={part} />
                          </div>
                        );
                      }
                      return null;
                    })}
                    {message.role === 'assistant' &&
                      status === 'streaming' &&
                      !hasRenderableParts && (
                        <p className="text-xs text-muted-foreground">Streaming...</p>
                      )}
                  </MessageContent>
                </Message>
              );
            })}
          </ConversationContent>
        )}
        <ConversationScrollButton />
      </Conversation>
      {error && (
        <div className="px-4 pb-4">
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
