/**
 * [PROPS]: MessageActionsLayerProps - 消息操作按钮渲染参数
 * [EMITS]: onEdit/onResend/onRetry/onFork/onCancelEdit/onConfirmEdit
 * [POS]: ChatMessage 操作区（用户/助手/编辑态）
 * [UPDATE]: 2026-02-26 - 从 ChatMessage 拆出操作区渲染
 *
 * [PROTOCOL]: 本文件变更时，必须更新此 Header 及所属目录 CLAUDE.md
 */

import { Check, GitBranch, Pencil, RefreshCw, X } from 'lucide-react';
import { MessageAction, MessageActions } from '@moryflow/ui/ai/message';

import type { MessageActionHandlers } from './const';

type MessageActionsLayerProps = {
  isEditing: boolean;
  isUser: boolean;
  isLastAssistant: boolean;
  isStreaming: boolean;
  actions?: MessageActionHandlers;
  onStartEdit: () => void;
  onResend: () => void;
  onRetry: () => void;
  onFork: () => void;
  onCancelEdit: () => void;
  onConfirmEdit: () => void;
};

export const MessageActionsLayer = ({
  isEditing,
  isUser,
  isLastAssistant,
  isStreaming,
  actions,
  onStartEdit,
  onResend,
  onRetry,
  onFork,
  onCancelEdit,
  onConfirmEdit,
}: MessageActionsLayerProps) => {
  if (isEditing) {
    return (
      <MessageActions className="ml-auto">
        <MessageAction onClick={onCancelEdit} size="icon-xs">
          <X className="size-3" />
        </MessageAction>
        <MessageAction onClick={onConfirmEdit} size="icon-xs">
          <Check className="size-3" />
        </MessageAction>
      </MessageActions>
    );
  }

  if (isUser) {
    if (!actions) {
      return null;
    }

    return (
      <MessageActions className={`ml-auto transition-opacity ${getHoverClassName(isStreaming)}`}>
        {actions.onEditAndResend ? (
          <MessageAction onClick={onStartEdit} size="icon-xs">
            <Pencil className="size-3" />
          </MessageAction>
        ) : null}
        {actions.onResend ? (
          <MessageAction onClick={onResend} size="icon-xs">
            <RefreshCw className="size-3" />
          </MessageAction>
        ) : null}
        {actions.onFork ? (
          <MessageAction onClick={onFork} size="icon-xs">
            <GitBranch className="size-3" />
          </MessageAction>
        ) : null}
      </MessageActions>
    );
  }

  if (!isLastAssistant || !actions?.onRetry) {
    return null;
  }

  return (
    <MessageActions className={`min-h-6 transition-opacity ${getHoverClassName(isStreaming)}`}>
      <MessageAction onClick={onRetry} size="icon-xs">
        <RefreshCw className="size-3" />
      </MessageAction>
    </MessageActions>
  );
};

const getHoverClassName = (isStreaming: boolean) =>
  isStreaming ? 'pointer-events-none opacity-0' : 'opacity-0 group-hover:opacity-100';
