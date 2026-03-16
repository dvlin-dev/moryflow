/**
 * [PROPS]: PreThreadViewProps - 预对话欢迎页布局配置
 * [EMITS]: 通过 ChatComposer ref 填充输入框；通过共享 ChatComposer 触发提交
 * [POS]: ChatPane 在未选中 session 时的右侧/主区欢迎界面
 *
 * [PROTOCOL]: 仅在本文件 Header 事实或所属目录职责、结构、关键契约变化时，才更新 Header 或目录 CLAUDE.md。
 */

import { useCallback, useRef } from 'react';
import { ChatComposer } from './chat-composer';
import type { ChatComposerHandle } from './chat-composer';
import { PreThreadExplorePanel } from './pre-thread-explore-panel';

type PreThreadViewProps = {
  submitMode?: 'default' | 'new-thread';
};

export const PreThreadView = ({ submitMode = 'default' }: PreThreadViewProps) => {
  const composerRef = useRef<ChatComposerHandle>(null);

  const handleFillInput = useCallback((text: string) => {
    composerRef.current?.fillInput(text);
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {/*
        上方区域：
        - ExploreBar（收起态 / null）：justify-end 将 bar 推到底部贴近输入框
        - ExplorePanel（展开态）：自身 flex-1 撑满全高，justify-end 对其无效
      */}
      <div className="flex min-h-0 flex-1 flex-col justify-end overflow-hidden">
        <PreThreadExplorePanel onFillInput={handleFillInput} />
      </div>

      {/* 输入框：始终固定在底部 */}
      <div className="px-3 pb-3">
        <ChatComposer ref={composerRef} variant="prethread" submitMode={submitMode} />
      </div>
    </div>
  );
};
