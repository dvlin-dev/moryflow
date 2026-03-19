/**
 * [PROPS]: 无（通过 chat runtime + sessions store 取数）
 * [EMITS]: onSubmit/onStop/onInputError/onOpenSettings/onModeChange
 * [POS]: ChatPane 底部区域（任务悬浮条 + 输入框 + 错误提示）
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { CardFooter } from '@moryflow/ui/components/card';

import { ChatComposer } from './chat-composer';
import { TaskHoverPanel } from './task-hover-panel';
import { useChatSessions } from '../hooks';
import { useChatPaneRuntime } from '../context/chat-pane-runtime-context';

export const ChatFooter = () => {
  const { activeSession } = useChatSessions();
  const { composer } = useChatPaneRuntime();
  const isActive = composer.status === 'streaming' || composer.status === 'submitted';

  return (
    <CardFooter className="relative shrink-0 flex-col items-stretch gap-2 p-3">
      <div className="relative">
        <div className="absolute bottom-full left-0 right-0 mb-3">
          <TaskHoverPanel taskState={activeSession?.taskState} isActive={isActive} />
        </div>
        <ChatComposer />
      </div>
    </CardFooter>
  );
};
